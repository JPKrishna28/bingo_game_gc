import React, { useState, useEffect } from 'react';
import { useSocket } from './contexts/SocketContext';
import UserRegistration from './components/UserRegistration';
import RoomForm from './components/RoomForm';
import GameRoom from './components/GameRoom';
import './App.css';

function App() {
  const [username, setUsername] = useState('');
  // roomCode is used when joining rooms and for reconnection
  const [roomCode, setRoomCode] = useState(''); // eslint-disable-line no-unused-vars
  const [isRegistered, setIsRegistered] = useState(false);
  const [isInRoom, setIsInRoom] = useState(false);
  const [roomData, setRoomData] = useState(null);
  const [notification, setNotification] = useState(null);
  
  const { socket } = useSocket();
  
  useEffect(() => {
    if (!socket) return;
    
    // Handle room updates from server
    socket.on('room_update', (data) => {
      console.log('Room update:', data);
      setRoomData(prev => ({ ...prev, ...data }));
      
      if (data.status === 'created' || data.status === 'joined') {
        setIsInRoom(true);
      }
      
      if (data.status === 'player_joined') {
        showNotification(`${data.players[data.players.length - 1].username} joined the room`, 'info');
      }
      
      if (data.status === 'player_left') {
        showNotification(`A player left the room`, 'info');
      }
      
      if (data.status === 'new_host') {
        showNotification(`${data.newHostName} is now the host`, 'info');
      }
    });
    
    // Handle game start
    socket.on('game_started', ({ currentTurn, currentTurnUsername }) => {
      console.log('Game started!', 'First turn:', currentTurnUsername);
      setRoomData(prev => ({ 
        ...prev, 
        gameInProgress: true,
        currentTurn,
        currentTurnUsername
      }));
      
      if (currentTurn === socket.id) {
        showNotification('The game has started! It\'s your turn to draw a number!', 'success');
      } else {
        showNotification(`The game has started! ${currentTurnUsername}'s turn to draw a number`, 'success');
      }
    });
    
    // Handle drawn numbers
    socket.on('number_drawn', ({ number, drawnNumbers, nextTurn, nextTurnUsername }) => {
      console.log('Number drawn:', number, 'Next turn:', nextTurnUsername);
      setRoomData(prev => ({ 
        ...prev, 
        drawnNumbers,
        latestNumber: number,
        currentTurn: nextTurn,
        currentTurnUsername: nextTurnUsername
      }));
      
      if (nextTurn === socket.id) {
        showNotification(`Number ${number} drawn. It's your turn now!`, 'success');
      } else {
        showNotification(`Number ${number} drawn. ${nextTurnUsername}'s turn`, 'info');
      }
    });
    
    // Handle claim results
    socket.on('claim_result', (result) => {
      console.log('Claim result:', result);
      
      if (result.valid) {
        showNotification(
          `${result.username} got bingo! (${result.claimType}) - ${result.pointsAwarded} points`,
          'success'
        );
      }
    });
    
    // Handle leaderboard updates
    socket.on('leaderboard_update', ({ leaderboard }) => {
      console.log('Leaderboard update:', leaderboard);
      setRoomData(prev => ({ ...prev, leaderboard }));
    });
    
    // Handle game over
    socket.on('game_over', (data) => {
      console.log('Game over:', data);
      setRoomData(prev => ({ 
        ...prev, 
        gameInProgress: false,
        gameOver: true,
        leaderboard: data.leaderboard
      }));
      showNotification(data.message, 'info');
    });
    
    // Handle turn updates (when players disconnect)
    socket.on('turn_update', ({ currentTurn, currentTurnUsername, reason }) => {
      console.log('Turn update:', currentTurnUsername, reason);
      setRoomData(prev => ({
        ...prev,
        currentTurn,
        currentTurnUsername
      }));
      showNotification(`${reason}. It's now ${currentTurnUsername}'s turn`, 'info');
    });
    
    // Handle errors
    socket.on('error', ({ message }) => {
      console.error('Socket error:', message);
      showNotification(message, 'error');
    });
    
    // Reconnection logic
    const storedUsername = localStorage.getItem('bingoUsername');
    const storedRoomCode = localStorage.getItem('bingoRoomCode');
    
    if (storedUsername && storedRoomCode) {
      setUsername(storedUsername);
      setRoomCode(storedRoomCode);
      setIsRegistered(true);
      
      // Try to rejoin room
      socket.emit('join_room', { 
        username: storedUsername, 
        roomCode: storedRoomCode 
      });
    }
    
    // Clean up event listeners on unmount
    return () => {
      socket.off('room_update');
      socket.off('game_started');
      socket.off('number_drawn');
      socket.off('claim_result');
      socket.off('leaderboard_update');
      socket.off('game_over');
      socket.off('error');
    };
  }, [socket]);
  
  // Show notification for a few seconds
  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };
  
  const handleRegister = (username) => {
    setUsername(username);
    setIsRegistered(true);
    localStorage.setItem('bingoUsername', username);
  };
  
  const handleCreateRoom = (maxPlayers) => {
    if (!socket) return;
    
    socket.emit('create_room', { 
      username,
      maxPlayers: parseInt(maxPlayers, 10) || 10
    });
  };
  
  const handleJoinRoom = (roomCode) => {
    if (!socket) return;
    
    setRoomCode(roomCode);
    localStorage.setItem('bingoRoomCode', roomCode);
    
    socket.emit('join_room', { username, roomCode });
  };
  
  const handleStartGame = () => {
    if (!socket) return;
    
    socket.emit('start_game');
  };
  
  const handleBingoClaim = (claimType) => {
    if (!socket) return;
    
    socket.emit('bingo_claim', { claimType });
  };
  
  const handleDrawNumber = () => {
    if (!socket) return;
    
    socket.emit('draw_number');
  };
  
  const handleLeaveRoom = () => {
    setIsInRoom(false);
    setRoomData(null);
    setRoomCode('');
    localStorage.removeItem('bingoRoomCode');
    
    // Refresh the page to disconnect socket
    window.location.reload();
  };
  
  return (
    <div className="app">
      <header className="app-header">
        <h1>Multiplayer Bingo</h1>
      </header>
      
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          {notification.message}
        </div>
      )}
      
      {!isRegistered ? (
        <UserRegistration onRegister={handleRegister} />
      ) : !isInRoom ? (
        <RoomForm 
          onCreateRoom={handleCreateRoom} 
          onJoinRoom={handleJoinRoom}
        />
      ) : (
        <GameRoom 
          roomData={roomData}
          username={username}
          onStartGame={handleStartGame}
          onBingoClaim={handleBingoClaim}
          onDrawNumber={handleDrawNumber}
          onLeaveRoom={handleLeaveRoom}
        />
      )}
    </div>
  );
}

export default App;