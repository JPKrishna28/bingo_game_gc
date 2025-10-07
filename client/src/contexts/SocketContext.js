import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

// Create context
const SocketContext = createContext(null);

// Socket provider component
export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Determine the server URL based on environment
    const serverUrl = process.env.NODE_ENV === 'production'
      ? process.env.REACT_APP_API_URL || window.location.origin // Try environment variable first, then origin
      : 'http://localhost:5000'; // Use localhost in development
    
    console.log('Connecting to server at:', serverUrl);
    
    // Create socket connection
    const socketConnection = io(serverUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // Set socket state
    setSocket(socketConnection);

    // Clean up on unmount
    return () => {
      socketConnection.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook to use the socket context
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};