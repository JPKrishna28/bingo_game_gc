// Adapted version of server/index.js for serverless environment
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const cors = require('cors');
const { 
  createRoom, 
  joinRoom, 
  getRoomState,
  startGame,
  drawNumber,
  validateBingoClaim,
  markNumber,
  getNextPlayerTurn
} = require('../gameLogic');

const app = express();
app.use(cors());

const server = http.createServer(app);

// In-memory storage for rooms
const rooms = new Map();

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Create room
  socket.on('create_room', ({ username, maxPlayers = 10 }) => {
    try {
      const roomCode = createRoom(rooms, socket.id, username, maxPlayers);
      socket.join(roomCode);
      
      const roomState = getRoomState(rooms, roomCode);
      socket.emit('room_update', roomState);
      
      console.log(`Room created: ${roomCode} by ${username}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });
  
  // Join room
  socket.on('join_room', ({ username, roomCode }) => {
    try {
      joinRoom(rooms, socket.id, username, roomCode);
      socket.join(roomCode);
      
      const roomState = getRoomState(rooms, roomCode);
      io.to(roomCode).emit('room_update', roomState);
      
      console.log(`${username} joined room: ${roomCode}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });
  
  // Start game
  socket.on('start_game', ({ roomCode }) => {
    try {
      const room = rooms.get(roomCode);
      
      if (!room) {
        throw new Error('Room not found');
      }
      
      // Only host can start the game
      const player = room.players.find(player => player.id === socket.id);
      if (!player || !player.isHost) {
        throw new Error('Only the host can start the game');
      }
      
      startGame(room);
      
      const roomState = getRoomState(rooms, roomCode);
      io.to(roomCode).emit('room_update', roomState);
      io.to(roomCode).emit('game_started', { 
        gameInProgress: true,
        board: roomState.board,
        currentTurn: roomState.currentTurn,
        currentTurnUsername: roomState.currentTurnUsername
      });
      
      console.log(`Game started in room: ${roomCode}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });
  
  // Draw number
  socket.on('draw_number', ({ roomCode }) => {
    try {
      const room = rooms.get(roomCode);
      
      if (!room || !room.gameInProgress) {
        throw new Error('Game is not in progress');
      }
      
      // Verify it's this player's turn
      if (room.currentTurn !== socket.id) {
        throw new Error("It's not your turn to draw a number");
      }
      
      // Draw a number
      const drawnNumber = drawNumber(room);
      
      // Get next player's turn
      getNextPlayerTurn(room);
      
      const roomState = getRoomState(rooms, roomCode);
      
      // Send the drawn number to all players in the room
      io.to(roomCode).emit('number_drawn', {
        number: drawnNumber,
        drawnNumbers: roomState.drawnNumbers,
        currentTurn: roomState.currentTurn,
        currentTurnUsername: roomState.currentTurnUsername
      });
      
      // Also update room state for everyone
      io.to(roomCode).emit('room_update', roomState);
      
      console.log(`Number ${drawnNumber} drawn in room: ${roomCode}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });
  
  // Mark number on player's card
  socket.on('mark_number', ({ roomCode, number, isMarked }) => {
    try {
      const room = rooms.get(roomCode);
      
      if (!room || !room.gameInProgress) {
        throw new Error('Game is not in progress');
      }
      
      // Mark the number on the shared state
      markNumber(room, socket.id, number, isMarked);
      
      // Send updates to all players
      const roomState = getRoomState(rooms, roomCode);
      io.to(roomCode).emit('room_update', roomState);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });
  
  // Validate bingo claim
  socket.on('bingo_claim', ({ roomCode, claimType }) => {
    try {
      const room = rooms.get(roomCode);
      
      if (!room || !room.gameInProgress) {
        throw new Error('Game is not in progress');
      }
      
      const { isValid, pattern, message, pointsAwarded } = validateBingoClaim(room, socket.id, claimType);
      
      socket.emit('claim_result', {
        isValid,
        pattern,
        message,
        pointsAwarded
      });
      
      if (isValid) {
        // Update leaderboard for all players
        io.to(roomCode).emit('leaderboard_update', {
          leaderboard: room.leaderboard
        });
        
        // Also update room state
        const roomState = getRoomState(rooms, roomCode);
        io.to(roomCode).emit('room_update', roomState);
        
        console.log(`Valid ${claimType} claim by ${socket.id} in room: ${roomCode}`);
      } else {
        console.log(`Invalid ${claimType} claim by ${socket.id} in room: ${roomCode}`);
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Handle player leaving rooms
    rooms.forEach((room, roomCode) => {
      const playerIndex = room.players.findIndex(player => player.id === socket.id);
      
      if (playerIndex !== -1) {
        const player = room.players[playerIndex];
        console.log(`${player.username} left room: ${roomCode}`);
        
        // Remove player from the room
        room.players.splice(playerIndex, 1);
        room.currentPlayers--;
        
        // If it was this player's turn, move to the next player
        if (room.gameInProgress && room.currentTurn === socket.id) {
          getNextPlayerTurn(room);
        }
        
        // If room is empty, remove it
        if (room.players.length === 0) {
          rooms.delete(roomCode);
          console.log(`Room ${roomCode} removed as it's empty`);
          return;
        }
        
        // If the host left, assign a new host
        if (player.isHost && room.players.length > 0) {
          room.players[0].isHost = true;
        }
        
        // Update room state for remaining players
        const roomState = getRoomState(rooms, roomCode);
        io.to(roomCode).emit('room_update', roomState);
      }
    });
  });
});

// Export the server for serverless functions
module.exports = (req, res) => {
  if (req.method === 'POST') {
    // Handle Socket.IO
    res.socket.server.io = io;
    res.end();
  } else {
    // Return a simple status check for GET requests
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'Socket server running' }));
  }
};