import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export function SocketProvider({ children }) {
    const { token, isAuthenticated, user } = useAuth();
    const socketRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState(new Set());

    useEffect(() => {
        if (!isAuthenticated || !token) {
            // Disconnect if not authenticated
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setIsConnected(false);
                setOnlineUsers(new Set());
            }
            return;
        }

        // Create socket connection
        socketRef.current = io('/', {
            auth: {
                token: token,
            },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        const socket = socketRef.current;

        // Connection event handlers
        socket.on('connect', () => {
            setIsConnected(true);
            setConnectionError(null);
            console.log('Socket connected:', socket.id);
        });

        socket.on('disconnect', (reason) => {
            setIsConnected(false);
            console.log('Socket disconnected:', reason);

            if (reason === 'io server disconnect') {
                // Server disconnected the socket, try to reconnect manually
                socket.connect();
            }
        });

        socket.on('connect_error', (error) => {
            setConnectionError(error.message);
            setIsConnected(false);
            console.error('Socket connection error:', error);
        });

        socket.on('reconnect', (attemptNumber) => {
            console.log('Socket reconnected after', attemptNumber, 'attempts');
            toast.success('Connection restored');
        });

        socket.on('reconnect_error', (error) => {
            console.error('Socket reconnection error:', error);
        });

        socket.on('reconnect_failed', () => {
            console.error('Socket reconnection failed');
            toast.error('Unable to connect to chat server');
        });

        // Online users management
        socket.on('user_online', (userId) => {
            setOnlineUsers(prev => new Set([...prev, userId]));
        });

        socket.on('user_offline', (userId) => {
            setOnlineUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(userId);
                return newSet;
            });
        });

        socket.on('online_users_list', (userIds) => {
            setOnlineUsers(new Set(userIds));
        });

        // Chat-related events
        socket.on('new_message', (data) => {
            // This will be handled by individual chat components
            console.log('New message received:', data);
        });

        socket.on('typing_start', (data) => {
            console.log('User started typing:', data);
        });

        socket.on('typing_stop', (data) => {
            console.log('User stopped typing:', data);
        });

        // Error handling
        socket.on('error', (error) => {
            console.error('Socket error:', error);
            toast.error(error.message || 'Chat connection error');
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
            return true;
        }
        return false;
    };

    const on = (event, callback) => {
        if (socketRef.current) {
            socketRef.current.on(event, callback);
        }
    };

    const off = (event, callback) => {
        if (socketRef.current) {
            if (callback) {
                socketRef.current.off(event, callback);
            } else {
                socketRef.current.off(event);
            }
        }
    };

    // Join a chat room
    const joinChat = (chatId) => {
        return emit('join_chat', { chatId });
    };

    // Leave a chat room
    const leaveChat = (chatId) => {
        return emit('leave_chat', { chatId });
    };

    // Send a message
    const sendMessage = (chatId, content, messageType = 'text') => {
        return emit('send_message', { chatId, content, messageType });
    };

    // Send typing indicators
    const startTyping = (chatId) => {
        return emit('typing_start', { chatId });
    };

    const stopTyping = (chatId) => {
        return emit('typing_stop', { chatId });
    };

    // Check if a user is online
    const isUserOnline = (userId) => {
        return onlineUsers.has(userId);
    };

    const value = {
        socket: socketRef.current,
        isConnected,
        connectionError,
        onlineUsers: Array.from(onlineUsers),
        emit,
        on,
        off,
        joinChat,
        leaveChat,
        sendMessage,
        startTyping,
        stopTyping,
        isUserOnline,
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
}

export default SocketContext;