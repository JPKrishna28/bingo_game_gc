import React, { useState, useEffect } from 'react';
import BingoCard from './BingoCard';
import DrawnNumbers from './DrawnNumbers';
import Leaderboard from './Leaderboard';
import { useSocket } from '../contexts/SocketContext';

const GameRoom = ({ roomData, username, onStartGame, onBingoClaim, onDrawNumber, onMarkNumber, onLeaveRoom }) => {
  const [markedNumbers, setMarkedNumbers] = useState({});
  const { socket } = useSocket();
  
  // Initialize marked numbers from drawn numbers on room join
  useEffect(() => {
    if (roomData && roomData.drawnNumbers && roomData.drawnNumbers.length > 0) {
      const initialMarked = {};
      roomData.drawnNumbers.forEach(num => {
        initialMarked[num] = true;
      });
      setMarkedNumbers(initialMarked);
    }
  }, [roomData]); // Including the full roomData as a dependency
  
  const handleCellClick = (number) => {
    // Toggle the mark status locally
    const newMarkedState = !markedNumbers[number];
    
    setMarkedNumbers(prev => ({
      ...prev,
      [number]: newMarkedState
    }));
    
    // Broadcast the mark to other players
    onMarkNumber(number, newMarkedState);
  };
  
  // Check if the current player is the host
  const isHost = roomData?.players?.some(player => 
    player.username === username && player.isHost
  );
  
  if (!roomData) {
    return <div>Loading room data...</div>;
  }
  
  return (
    <div className="game-room">
      <div className="room-info">
        <div className="room-code">Room Code: {roomData.code || roomData.roomCode}</div>
        <div className="player-count">
          <span className="player-count-label">Players:</span> 
          <span className="player-count-value">{roomData.currentPlayers} / {roomData.maxPlayers}</span>
        </div>
        
        <ul className="player-list">
          {roomData.players && roomData.players.map((player) => (
            <li key={player.id} className="player-item">
              {player.username}
              {player.isHost && <span className="host-tag">Host</span>}
              {player.username === username && <span className="you-tag">You</span>}
            </li>
          ))}
        </ul>
        
        <div className="room-actions">
          {isHost && !roomData.gameInProgress && (
            <button 
              className="btn-start" 
              onClick={onStartGame}
              disabled={roomData.currentPlayers < 2}
            >
              Start Game
            </button>
          )}
          <button className="btn-leave" onClick={onLeaveRoom}>
            Leave Room
          </button>
        </div>
      </div>
      
      {roomData.gameInProgress && (
        <>
          {/* Turn indicator and number drawing UI */}
          <div className="turn-indicator">
            {roomData.currentTurn === socket?.id ? (
              <div className="your-turn">
                <h3>It's your turn to draw a number!</h3>
                <button 
                  className="draw-button" 
                  onClick={onDrawNumber}
                >
                  Draw Number
                </button>
              </div>
            ) : (
              <div className="waiting-turn">
                <h3>Waiting for {roomData.currentTurnUsername} to draw a number...</h3>
              </div>
            )}
          </div>
          
          {roomData.drawnNumbers && roomData.drawnNumbers.length > 0 && (
            <DrawnNumbers 
              drawnNumbers={roomData.drawnNumbers} 
              latestNumber={roomData.latestNumber} 
            />
          )}
          
          <div className="bingo-card-container">
            <BingoCard 
              board={roomData.board} 
              markedNumbers={markedNumbers}
              sharedMarkedNumbers={roomData.sharedMarkedNumbers} 
              onCellClick={handleCellClick} 
            />
            
            <div className="claim-buttons">
              <button className="btn-claim" onClick={() => onBingoClaim('row')}>
                Claim Row
              </button>
              <button className="btn-claim" onClick={() => onBingoClaim('column')}>
                Claim Column
              </button>
              <button className="btn-claim" onClick={() => onBingoClaim('diagonal')}>
                Claim Diagonal
              </button>
              <button className="btn-claim" onClick={() => onBingoClaim('fullhouse')}>
                Claim Full House
              </button>
            </div>
          </div>
          
          {roomData.leaderboard && roomData.leaderboard.length > 0 && (
            <Leaderboard leaderboard={roomData.leaderboard} />
          )}
        </>
      )}
      
      {!roomData.gameInProgress && roomData.players && roomData.players.length >= 2 && isHost && (
        <div className="start-game-container">
          <p>Waiting for you to start the game...</p>
          <button className="btn-start" onClick={onStartGame}>
            Start Game
          </button>
        </div>
      )}
      
      {!roomData.gameInProgress && roomData.players && roomData.players.length >= 2 && !isHost && (
        <div className="waiting-container">
          <p>Waiting for the host to start the game...</p>
        </div>
      )}
      
      {!roomData.gameInProgress && roomData.players && roomData.players.length < 2 && (
        <div className="waiting-container">
          <p>Waiting for more players to join...</p>
          <p>Share the room code with your friends!</p>
          <div className="room-code-display">{roomData.code || roomData.roomCode}</div>
        </div>
      )}
    </div>
  );
};

export default GameRoom;