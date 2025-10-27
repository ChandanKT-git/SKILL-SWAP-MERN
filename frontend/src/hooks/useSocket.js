import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

/**
 * Custom hook for Socket.IO connection and real-time communication
 */
export function useSocket() {
    const { token, isAuthenticated } = useAuth();
    const socketRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState(null);

    useEffect(() => {
        if (!isAuthenticated || !token) {
            // Disconnect if not authenticated
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setIsConnected(false);
            }
            return;
        }

        // Create socket connection
        socketRef.current = io('/', {
            auth: {
                token: token,
            },
            transports: ['websocket', 'polling'],
        });

        const socket = socketRef.current;

        // Connection event handlers
        socket.on('connect', () => {
            setIsConnected(true);
            setConnectionError(null);
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        socket.on('connect_error', (error) => {
            setConnectionError(error.message);
            setIsConnected(false);
        });

        // Cleanup on unmount
        return () => {
            if (socket) {
                socket.disconnect();
            }
        };
    }, [isAuthenticated, token]);

    // Socket event methods
    const emit = (event, data) => {
        if (socketRef.current && isConnected) {
            socketRef.current.emit(event, data);
        }
    };

    const on = (event, callback) => {
        if (socketRef.current) {
            socketRef.current.on(event, callback);
        }
    };

    const off = (event, callback) => {
        if (socketRef.current) {
            socketRef.current.off(event, callback);
        }
    };

    return {
        socket: socketRef.current,
        isConnected,
        connectionError,
        emit,
        on,
        off,
    };
}