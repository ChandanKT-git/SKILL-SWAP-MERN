import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../context/AuthContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { PaperAirplaneIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { UserIcon } from '@heroicons/react/24/solid';
import LoadingSpinner from '../common/LoadingSpinner';

/**
 * Main chat window component that handles real-time messaging
 */
export default function ChatWindow({ chat, onClose, className = '' }) {
    const { user } = useAuth();
    const { socket, isConnected, emit, on, off } = useSocket();
    const [messages, setMessages] = useState(chat?.messages || []);
    const [isLoading, setIsLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [typingUsers, setTypingUsers] = useState([]);
    const messagesEndRef = useRef(null);

    // Get other participant for direct chats
    const otherParticipant = chat?.participants?.find(p => p._id !== user?.id);

    // Scroll to bottom when new messages arrive
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Socket event handlers
    useEffect(() => {
        if (!socket || !chat?._id) return;

        // Join chat room
        emit('join_chat', { chatId: chat._id });

        // Listen for new messages
        const handleNewMessage = (data) => {
            if (data.chatId === chat._id) {
                setMessages(prev => [...prev, data.message]);
            }
        };

        // Listen for typing indicators
        const handleTypingStart = (data) => {
            if (data.chatId === chat._id && data.userId !== user?.id) {
                setTypingUsers(prev => [...prev.filter(id => id !== data.userId), data.userId]);
            }
        };

        const handleTypingStop = (data) => {
            if (data.chatId === chat._id) {
                setTypingUsers(prev => prev.filter(id => id !== data.userId));
            }
        };

        // Listen for message status updates
        const handleMessageRead = (data) => {
            if (data.chatId === chat._id) {
                setMessages(prev => prev.map(msg =>
                    msg._id === data.messageId ? { ...msg, isRead: true, readAt: data.readAt } : msg
                ));
            }
        };

        const handleMessageDeleted = (data) => {
            if (data.chatId === chat._id) {
                setMessages(prev => prev.filter(msg => msg._id !== data.messageId));
            }
        };

        // Register event listeners
        on('new_message', handleNewMessage);
        on('typing_start', handleTypingStart);
        on('typing_stop', handleTypingStop);
        on('message_read', handleMessageRead);
        on('message_deleted', handleMessageDeleted);

        // Cleanup
        return () => {
            off('new_message', handleNewMessage);
            off('typing_start', handleTypingStart);
            off('typing_stop', handleTypingStop);
            off('message_read', handleMessageRead);
            off('message_deleted', handleMessageDeleted);
            emit('leave_chat', { chatId: chat._id });
        };
    }, [socket, chat?._id, user?.id, emit, on, off]);

    // Handle sending messages
    const handleSendMessage = (content) => {
        if (!content.trim() || !chat?._id) return;

        const tempMessage = {
            _id: `temp-${Date.now()}`,
            content: content.trim(),
            sender: {
                _id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                profileImage: user.profileImage,
            },
            createdAt: new Date().toISOString(),
            isRead: false,
            messageType: 'text',
        };

        // Optimistically add message to UI
        setMessages(prev => [...prev, tempMessage]);

        // Send via socket
        emit('send_message', {
            chatId: chat._id,
            content: content.trim(),
            messageType: 'text',
        });
    };

    // Handle typing indicators
    const handleTypingStart = () => {
        if (!isTyping && chat?._id) {
            setIsTyping(true);
            emit('typing_start', { chatId: chat._id });
        }
    };

    const handleTypingStop = () => {
        if (isTyping && chat?._id) {
            setIsTyping(false);
            emit('typing_stop', { chatId: chat._id });
        }
    };

    if (!chat) {
        return (
            <div className={`flex items-center justify-center h-full bg-gray-50 ${className}`}>
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                        <UserIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">Select a conversation to start chatting</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-full bg-white ${className}`}>
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center space-x-3">
                    {/* Participant Avatar */}
                    <div className="relative">
                        {otherParticipant?.profileImage ? (
                            <img
                                src={otherParticipant.profileImage}
                                alt={`${otherParticipant.firstName} ${otherParticipant.lastName}`}
                                className="w-10 h-10 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                                <UserIcon className="w-6 h-6 text-gray-600" />
                            </div>
                        )}
                        {/* Online indicator */}
                        {otherParticipant?.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                    </div>

                    {/* Participant Info */}
                    <div>
                        <h3 className="font-medium text-gray-900">
                            {otherParticipant ?
                                `${otherParticipant.firstName} ${otherParticipant.lastName}` :
                                'Chat'
                            }
                        </h3>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                            {!isConnected && (
                                <span className="text-red-500">Disconnected</span>
                            )}
                            {isConnected && otherParticipant?.isOnline && (
                                <span className="text-green-500">Online</span>
                            )}
                            {isConnected && !otherParticipant?.isOnline && (
                                <span>Offline</span>
                            )}
                            {chat.chatType === 'session' && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                    Session Chat
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Close Button */}
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <LoadingSpinner size="md" />
                    </div>
                ) : (
                    <MessageList
                        messages={messages}
                        currentUserId={user?.id}
                        typingUsers={typingUsers}
                        participants={chat.participants}
                    />
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-t border-gray-200 bg-white">
                <MessageInput
                    onSendMessage={handleSendMessage}
                    onTypingStart={handleTypingStart}
                    onTypingStop={handleTypingStop}
                    disabled={!isConnected}
                    placeholder={
                        !isConnected
                            ? "Connecting..."
                            : `Message ${otherParticipant?.firstName || 'participant'}...`
                    }
                />
            </div>
        </div>
    );
}