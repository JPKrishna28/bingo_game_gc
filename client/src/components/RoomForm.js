import React, { useState } from 'react';

const RoomForm = ({ onCreateRoom, onJoinRoom }) => {
  const [roomCode, setRoomCode] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [error, setError] = useState('');
  const [showJoinForm, setShowJoinForm] = useState(false);

  const handleCreateRoom = (e) => {
    e.preventDefault();
    onCreateRoom(maxPlayers);
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    
    // Validate room code
    if (!roomCode.trim()) {
      setError('Room code is required');
      return;
    }
    
    // Call parent handler
    onJoinRoom(roomCode);
  };

  return (
    <div className="form-container">
      {!showJoinForm ? (
        <>
          <h2>Create a Bingo Room</h2>
          <form onSubmit={handleCreateRoom}>
            <div className="form-group">
              <label htmlFor="maxPlayers">Maximum Players (2-10)</label>
              <input
                type="number"
                id="maxPlayers"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(e.target.value)}
                min="2"
                max="10"
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Create Room
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowJoinForm(true)}
              >
                Join Existing Room
              </button>
            </div>
          </form>
        </>
      ) : (
        <>
          <h2>Join a Bingo Room</h2>
          <form onSubmit={handleJoinRoom}>
            <div className="form-group">
              <label htmlFor="roomCode">Room Code</label>
              <input
                type="text"
                id="roomCode"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-character room code"
                maxLength="6"
                autoFocus
              />
              {error && <p className="error-message">{error}</p>}
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Join Room
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowJoinForm(false)}
              >
                Create a Room
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default RoomForm;