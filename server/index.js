require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { createRoom, joinRoom, startGame, validateBingoClaim, getRoomState } = require('./gameLogic');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins (you can restrict this to your frontend URL)
  methods: ["GET", "POST"],
  credentials: true
}));
app.use(express.json());

// Create HTTP server and Socket.io instance
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins (you can restrict this to your frontend URL)
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Basic route for checking if server is running
app.get('/', (req, res) => {
  res.json({ message: 'Bingo Game Server is running' });
});

// Health check route for deployment services
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Store user data in socket for easier access
  let userData = {
    socketId: socket.id,
    username: null,
    roomCode: null
  };
  
  // Create a new room
  socket.on('create_room', ({ username, maxPlayers = 10 }) => {
    try {
      const { roomCode, board } = createRoom(socket.id, username, maxPlayers);
      
      userData.username = username;
      userData.roomCode = roomCode;
      
      // Join the socket to the room
      socket.join(roomCode);
      
      // Send room creation confirmation
      socket.emit('room_update', { 
        status: 'created', 
        roomCode, 
        isHost: true,
        board,
        players: [{ id: socket.id, username, isHost: true }],
        currentPlayers: 1,
        maxPlayers
      });
      
      console.log(`Room ${roomCode} created by ${username}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });
  
  // Join an existing room
  socket.on('join_room', ({ username, roomCode }) => {
    try {
      const { board, room } = joinRoom(socket.id, username, roomCode);
      
      userData.username = username;
      userData.roomCode = roomCode;
      
      // Join the socket to the room
      socket.join(roomCode);
      
      // Get updated room state
      const roomState = getRoomState(roomCode);
      
      // Send room joined confirmation to the user
      socket.emit('room_update', {
        status: 'joined',
        roomCode,
        isHost: false,
        board,
        players: roomState.players,
        currentPlayers: roomState.players.length,
        maxPlayers: roomState.maxPlayers,
        gameInProgress: roomState.gameInProgress,
        drawnNumbers: roomState.drawnNumbers || []
      });
      
      // Notify other players in the room
      socket.to(roomCode).emit('room_update', {
        status: 'player_joined',
        players: roomState.players,
        currentPlayers: roomState.players.length
      });
      
      console.log(`User ${username} joined room ${roomCode}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });
  
  // Start game (host only)
  socket.on('start_game', () => {
    const roomCode = userData.roomCode;
    
    if (!roomCode) {
      socket.emit('error', { message: 'You are not in a room' });
      return;
    }
    
    try {
      // Start the game logic
      const result = startGame(roomCode, socket.id);
      
      // Notify all players in the room that the game has started
      io.to(roomCode).emit('game_started', {
        currentTurn: result.firstTurn,
        currentTurnUsername: result.firstTurnUsername
      });
      
      console.log(`Game started in room ${roomCode}. First turn: ${result.firstTurnUsername}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });
  
  // Handle player drawing a number
  socket.on('draw_number', () => {
    const roomCode = userData.roomCode;
    
    if (!roomCode) {
      socket.emit('error', { message: 'You are not in a room' });
      return;
    }
    
    try {
      const roomState = getRoomState(roomCode);
      
      // Check if the game is in progress
      if (!roomState || !roomState.gameInProgress) {
        socket.emit('error', { message: 'Game is not in progress' });
        return;
      }
      
      // Check if there are still numbers to draw
      if (roomState.remainingNumbers.length === 0) {
        roomState.gameOver = true;
        io.to(roomCode).emit('game_over', {
          message: 'All numbers have been drawn',
          leaderboard: roomState.leaderboard
        });
        return;
      }
      
      // Draw the next number
      const result = roomState.drawNextNumber(socket.id);
      
      if (!result || result.error) {
        const errorMsg = result ? result.error : 'Unknown error while drawing number';
        console.error(`Draw number error: ${errorMsg}`);
        socket.emit('error', { message: errorMsg });
        return;
      }
      
      // Broadcast the drawn number to all players in the room
      io.to(roomCode).emit('number_drawn', { 
        number: result.number, 
        drawnNumbers: roomState.drawnNumbers,
        nextTurn: result.nextTurn,
        nextTurnUsername: result.nextTurnUsername
      });
      
      console.log(`Number ${result.number} drawn in room ${roomCode} by ${userData.username}. Next turn: ${result.nextTurnUsername}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });
  
  // Handle number marking
  socket.on('mark_number', ({ number, isMarked }) => {
    const roomCode = userData.roomCode;
    
    if (!roomCode) {
      socket.emit('error', { message: 'You are not in a room' });
      return;
    }
    
    // Broadcast the marking to all other players in the room
    socket.to(roomCode).emit('number_marked', { 
      playerId: socket.id,
      playerName: userData.username,
      number, 
      isMarked 
    });
    
    console.log(`Player ${userData.username} ${isMarked ? 'marked' : 'unmarked'} number ${number} in room ${roomCode}`);
  });
  
  // Process bingo claims
  socket.on('bingo_claim', ({ claimType }) => {
    const roomCode = userData.roomCode;
    
    if (!roomCode) {
      socket.emit('error', { message: 'You are not in a room' });
      return;
    }
    
    try {
      const validationResult = validateBingoClaim(socket.id, roomCode, claimType);
      const roomState = getRoomState(roomCode);
      
      if (validationResult.valid) {
        // Broadcast to all players that a claim was successful
        io.to(roomCode).emit('claim_result', {
          valid: true,
          username: userData.username,
          claimType,
          pointsAwarded: validationResult.pointsAwarded
        });
        
        // Update leaderboard for all players
        io.to(roomCode).emit('leaderboard_update', {
          leaderboard: roomState.leaderboard
        });
        
        console.log(`Valid bingo claim by ${userData.username} in room ${roomCode}`);
      } else {
        // Notify the claimer that their claim was invalid
        socket.emit('claim_result', {
          valid: false,
          message: validationResult.message
        });
        
        console.log(`Invalid bingo claim by ${userData.username} in room ${roomCode}: ${validationResult.message}`);
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    const roomCode = userData.roomCode;
    console.log(`User disconnected: ${socket.id}`);
    
    if (roomCode) {
      try {
        const roomState = getRoomState(roomCode);
        
        // Check if room still exists
        if (roomState) {
          // Remove player from room
          const updatedPlayers = roomState.players.filter(player => player.id !== socket.id);
          roomState.players = updatedPlayers;
          
          // Notify other players
          socket.to(roomCode).emit('room_update', {
            status: 'player_left',
            players: updatedPlayers,
            currentPlayers: updatedPlayers.length
          });
          
          // If host left, assign new host
          if (roomState.hostId === socket.id && updatedPlayers.length > 0) {
            const newHost = updatedPlayers[0];
            newHost.isHost = true;
            roomState.hostId = newHost.id;
            
            // Notify room of new host
            socket.to(roomCode).emit('room_update', {
              status: 'new_host',
              newHostId: newHost.id,
              newHostName: newHost.username
            });
            
            console.log(`New host in room ${roomCode}: ${newHost.username}`);
          }
          
          // If it was this player's turn, move to the next player
          if (roomState.gameInProgress && roomState.players[roomState.currentTurnIndex].id === socket.id) {
            // Recalculate current turn after player removal
            roomState.currentTurnIndex = roomState.currentTurnIndex % updatedPlayers.length;
            const nextPlayer = updatedPlayers[roomState.currentTurnIndex];
            
            // Notify others of turn change
            if (nextPlayer) {
              socket.to(roomCode).emit('turn_update', {
                currentTurn: nextPlayer.id,
                currentTurnUsername: nextPlayer.username,
                reason: `${userData.username} disconnected during their turn`
              });
            }
          }
          
          // Remove room if empty
          if (updatedPlayers.length === 0) {
            const rooms = require('./gameLogic').getRooms();
            delete rooms[roomCode];
            console.log(`Room ${roomCode} deleted (empty)`);
          }
        }
      } catch (error) {
        console.error('Error handling disconnection:', error);
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server };