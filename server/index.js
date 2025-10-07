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
app.use(cors());
app.use(express.json());

// Create HTTP server and Socket.io instance
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ["http://localhost:3000"],
    methods: ["GET", "POST"]
  }
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  });
}

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
      startGame(roomCode, socket.id);
      
      // Notify all players in the room that the game has started
      io.to(roomCode).emit('game_started');
      console.log(`Game started in room ${roomCode}`);
      
      // Start drawing numbers (one every 5 seconds)
      const drawInterval = setInterval(() => {
        const roomState = getRoomState(roomCode);
        
        // Stop drawing if the game is over or room doesn't exist
        if (!roomState || roomState.gameOver) {
          clearInterval(drawInterval);
          return;
        }
        
        // Draw the next number if there are still numbers to draw
        if (roomState.remainingNumbers.length > 0) {
          const drawnNumber = roomState.drawNextNumber();
          
          // Broadcast the drawn number to all players in the room
          io.to(roomCode).emit('number_drawn', { 
            number: drawnNumber, 
            drawnNumbers: roomState.drawnNumbers 
          });
          
          console.log(`Number ${drawnNumber} drawn in room ${roomCode}`);
        } else {
          // All numbers have been drawn
          roomState.gameOver = true;
          io.to(roomCode).emit('game_over', {
            message: 'All numbers have been drawn',
            leaderboard: roomState.leaderboard
          });
          
          clearInterval(drawInterval);
          console.log(`Game over in room ${roomCode} - all numbers drawn`);
        }
      }, 5000); // Draw a number every 5 seconds
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
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

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server };