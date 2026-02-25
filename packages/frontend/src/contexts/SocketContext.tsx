import React, { createContext, useContext, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import socketService from '../services/socket.service';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { token, user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (token && user) {
      // Connect socket when user is authenticated
      socketService.connect(token);
      setIsConnected(true);

      return () => {
        // Disconnect on unmount or logout
        socketService.disconnect();
        setIsConnected(false);
      };
    } else {
      // Disconnect if no token/user
      if (socketService.isConnected()) {
        socketService.disconnect();
        setIsConnected(false);
      }
    }
  }, [token, user]);

  const socket = socketService.getSocket();

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
