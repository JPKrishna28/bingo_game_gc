const { nanoid } = require('nanoid');

// In-memory storage for game rooms
const rooms = {};

/**
 * Generate a random 7x7 Bingo board
 * @returns {Array} 7x7 array with random numbers from 1-49
 */
function generateBingoBoard() {
  // Create array with numbers from 1 to 49
  const numbers = Array.from({ length: 49 }, (_, i) => i + 1);
  
  // Shuffle the array (Fisher-Yates algorithm)
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  
  // Create 7x7 grid from shuffled numbers
  const board = [];
  for (let i = 0; i < 7; i++) {
    const row = [];
    for (let j = 0; j < 7; j++) {
      row.push(numbers[i * 7 + j]);
    }
    board.push(row);
  }
  
  return board;
}

/**
 * Create a new Bingo room
 * @param {string} hostId - Socket ID of the host
 * @param {string} username - Username of the host
 * @param {number} maxPlayers - Maximum number of players allowed in the room
 * @returns {Object} Room information
 */
function createRoom(hostId, username, maxPlayers = 10) {
  // Generate a unique 6-character room code
  const roomCode = nanoid(6).toUpperCase();
  
  // Generate a board for the host
  const board = generateBingoBoard();
  
  // Create a room with initial state
  rooms[roomCode] = {
    code: roomCode,
    hostId,
    maxPlayers,
    players: [{ id: hostId, username, isHost: true, board }],
    boards: { [hostId]: board },
    gameInProgress: false,
    gameOver: false,
    drawnNumbers: [],
    remainingNumbers: Array.from({ length: 49 }, (_, i) => i + 1),
    leaderboard: [],
    claims: [],
    
    // Method to draw the next number
    drawNextNumber() {
      if (this.remainingNumbers.length === 0) return null;
      
      const randomIndex = Math.floor(Math.random() * this.remainingNumbers.length);
      const drawnNumber = this.remainingNumbers.splice(randomIndex, 1)[0];
      this.drawnNumbers.push(drawnNumber);
      return drawnNumber;
    }
  };
  
  return { roomCode, board };
}

/**
 * Join an existing Bingo room
 * @param {string} playerId - Socket ID of the joining player
 * @param {string} username - Username of the joining player
 * @param {string} roomCode - Code of the room to join
 * @returns {Object} Room information
 */
function joinRoom(playerId, username, roomCode) {
  // Check if room exists
  if (!rooms[roomCode]) {
    throw new Error(`Room ${roomCode} does not exist`);
  }
  
  const room = rooms[roomCode];
  
  // Check if room is full
  if (room.players.length >= room.maxPlayers) {
    throw new Error('Room is full');
  }
  
  // Check if username is already taken in this room
  if (room.players.some(player => player.username === username)) {
    throw new Error('Username is already taken in this room');
  }
  
  // Generate a board for the player
  const board = generateBingoBoard();
  
  // Add player to the room
  room.players.push({ id: playerId, username, isHost: false });
  room.boards[playerId] = board;
  
  return { board, room };
}

/**
 * Start a Bingo game in a room
 * @param {string} roomCode - Code of the room
 * @param {string} hostId - Socket ID of the player trying to start the game
 * @returns {boolean} Success status
 */
function startGame(roomCode, hostId) {
  // Check if room exists
  if (!rooms[roomCode]) {
    throw new Error(`Room ${roomCode} does not exist`);
  }
  
  const room = rooms[roomCode];
  
  // Check if the requester is the host
  if (room.hostId !== hostId) {
    throw new Error('Only the host can start the game');
  }
  
  // Check if the game is already in progress
  if (room.gameInProgress) {
    throw new Error('Game is already in progress');
  }
  
  // Start the game
  room.gameInProgress = true;
  room.drawnNumbers = [];
  room.leaderboard = room.players.map(player => ({
    id: player.id,
    username: player.username,
    score: 0,
    bingos: 0
  }));
  
  return true;
}

/**
 * Validate a Bingo claim
 * @param {string} playerId - Socket ID of the claiming player
 * @param {string} roomCode - Code of the room
 * @param {string} claimType - Type of Bingo claim (row, column, diagonal, or fullhouse)
 * @returns {Object} Validation result
 */
function validateBingoClaim(playerId, roomCode, claimType) {
  // Check if room exists
  if (!rooms[roomCode]) {
    throw new Error(`Room ${roomCode} does not exist`);
  }
  
  const room = rooms[roomCode];
  
  // Check if the game is in progress
  if (!room.gameInProgress) {
    return { valid: false, message: 'Game is not in progress' };
  }
  
  // Check if player is in the room
  const playerIndex = room.players.findIndex(player => player.id === playerId);
  if (playerIndex === -1) {
    return { valid: false, message: 'Player not found in room' };
  }
  
  // Get player's board
  const board = room.boards[playerId];
  if (!board) {
    return { valid: false, message: 'Player board not found' };
  }
  
  // Validate claim based on type
  let valid = false;
  switch (claimType) {
    case 'row':
      // Check for any completed row
      valid = board.some(row => 
        row.every(number => room.drawnNumbers.includes(number))
      );
      break;
    
    case 'column':
      // Check for any completed column
      for (let col = 0; col < 7; col++) {
        const column = board.map(row => row[col]);
        if (column.every(number => room.drawnNumbers.includes(number))) {
          valid = true;
          break;
        }
      }
      break;
    
    case 'diagonal':
      // Check main diagonal (top-left to bottom-right)
      const mainDiagonal = [];
      for (let i = 0; i < 7; i++) {
        mainDiagonal.push(board[i][i]);
      }
      
      // Check anti-diagonal (top-right to bottom-left)
      const antiDiagonal = [];
      for (let i = 0; i < 7; i++) {
        antiDiagonal.push(board[i][6 - i]);
      }
      
      if (mainDiagonal.every(number => room.drawnNumbers.includes(number)) || 
          antiDiagonal.every(number => room.drawnNumbers.includes(number))) {
        valid = true;
      }
      break;
    
    case 'fullhouse':
      // Check if all numbers on the board are drawn
      valid = board.flat().every(number => room.drawnNumbers.includes(number));
      break;
    
    default:
      return { valid: false, message: 'Invalid claim type' };
  }
  
  if (!valid) {
    return { valid: false, message: `Invalid ${claimType} claim` };
  }
  
  // Check if this player has already made this specific claim type
  const playerClaimExists = room.claims.some(claim => 
    claim.playerId === playerId && claim.claimType === claimType
  );
  
  if (playerClaimExists) {
    return { valid: false, message: `You already made a ${claimType} claim` };
  }
  
  // Add claim to room claims
  room.claims.push({ playerId, claimType });
  
  // Calculate points based on claim count
  let pointsAwarded = 25; // Default points
  
  // Count how many of this claim type have been made already
  const existingClaimsOfType = room.claims.filter(claim => 
    claim.claimType === claimType
  ).length - 1; // Subtract 1 to exclude the current claim
  
  switch (existingClaimsOfType) {
    case 0: // First claim of this type
      pointsAwarded = 100;
      break;
    case 1: // Second claim of this type
      pointsAwarded = 75;
      break;
    case 2: // Third claim of this type
      pointsAwarded = 50;
      break;
    default: // Fourth or later claim
      pointsAwarded = 25;
      break;
  }
  
  // Update leaderboard
  const playerLeaderboardIndex = room.leaderboard.findIndex(
    player => player.id === playerId
  );
  
  if (playerLeaderboardIndex !== -1) {
    room.leaderboard[playerLeaderboardIndex].score += pointsAwarded;
    room.leaderboard[playerLeaderboardIndex].bingos += 1;
    
    // Sort leaderboard by score (descending)
    room.leaderboard.sort((a, b) => b.score - a.score);
  }
  
  return { 
    valid: true, 
    message: `Valid ${claimType} claim!`,
    pointsAwarded
  };
}

/**
 * Get room state
 * @param {string} roomCode - Code of the room
 * @returns {Object} Room state
 */
function getRoomState(roomCode) {
  return rooms[roomCode];
}

/**
 * Get all rooms
 * @returns {Object} All rooms
 */
function getRooms() {
  return rooms;
}

module.exports = {
  createRoom,
  joinRoom,
  startGame,
  validateBingoClaim,
  getRoomState,
  getRooms
};