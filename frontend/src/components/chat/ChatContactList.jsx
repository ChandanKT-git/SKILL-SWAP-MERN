import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import { formatDistanceToNow } from 'date-fns';
import {
    UserIcon,
    MagnifyingGlassIcon,
    ChatBubbleLeftIcon,
    PlusIcon
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import LoadingSpinner from '../common/LoadingSpinner';
import api from '../../utils/api';

/**
 * Chat contact list component for conversation management
 */
export default function ChatContactList({
    onChatSelect,
    selectedChatId,
    className = '',
    onNewChat
}) {
    const { user } = useAuth();
    const { isConnected } = useSocket();
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState(null);

    // Fetch user's chats
    useEffect(() => {
        fetchChats();
    }, []);

    const fetchChats = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await api.get('/chat/chats');

            if (response.data.success) {
                setChats(response.data.data.chats || []);
            } else {
                throw new Error(response.data.error?.message || 'Failed to fetch chats');
            }
        } catch (err) {
            console.error('Error fetching chats:', err);
            setError(err.response?.data?.error?.message || 'Failed to load conversations');
        } finally {
            setLoading(false);
        }
    };

    // Filter chats based on search term
    const filteredChats = chats.filter(chat => {
        if (!searchTerm.trim()) return true;

        const otherParticipant = chat.participants?.find(p => p._id !== user?.id);
        const participantName = otherParticipant
            ? `${otherParticipant.firstName} ${otherParticipant.lastName}`.toLowerCase()
            : '';

        const lastMessageContent = chat.lastMessage?.content?.toLowerCase() || '';
        const searchLower = searchTerm.toLowerCase();

        return participantName.includes(searchLower) || lastMessageContent.includes(searchLower);
    });

    // Sort chats by last activity
    const sortedChats = [...filteredChats].sort((a, b) =>
        new Date(b.lastActivity) - new Date(a.lastActivity)
    );

    if (loading) {
        return (
            <div className={`flex items-center justify-center p-8 ${className}`}>
                <LoadingSpinner size="md" />
            </div>
        );
    }

    if (error) {
        return (
            <div className={`p-4 ${className}`}>
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                        <ChatBubbleLeftIcon className="w-8 h-8 text-red-500" />
                    </div>
                    <p className="text-red-600 mb-2">Failed to load conversations</p>
                    <p className="text-sm text-gray-500 mb-4">{error}</p>
                    <button
                        onClick={fetchChats}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-full bg-white ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
                    {onNewChat && (
                        <button
                            onClick={onNewChat}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                            title="Start new conversation"
                        >
                            <PlusIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Search */}
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Connection status */}
                <div className="mt-2 flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-xs text-gray-500">
                        {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto">
                {sortedChats.length === 0 ? (
                    <div className="flex items-center justify-center h-full p-8">
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                                <ChatBubbleLeftIcon className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-500 mb-2">
                                {searchTerm ? 'No conversations found' : 'No conversations yet'}
                            </p>
                            <p className="text-sm text-gray-400">
                                {searchTerm
                                    ? 'Try a different search term'
                                    : 'Start a conversation to see it here'
                                }
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {sortedChats.map(chat => (
                            <ChatListItem
                                key={chat._id}
                                chat={chat}
                                currentUserId={user?.id}
                                isSelected={chat._id === selectedChatId}
                                onClick={() => onChatSelect(chat)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Individual chat list item component
 */
function ChatListItem({ chat, currentUserId, isSelected, onClick }) {
    const otherParticipant = chat.participants?.find(p => p._id !== currentUserId);
    const unreadCount = chat.participantStatus?.find(p => p.user === currentUserId)?.unreadCount || 0;
    const lastMessageTime = chat.lastActivity
        ? formatDistanceToNow(new Date(chat.lastActivity), { addSuffix: true })
        : '';

    return (
        <button
            onClick={onClick}
            className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                }`}
        >
            <div className="flex items-center space-x-3">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                    {otherParticipant?.profileImage ? (
                        <img
                            src={otherParticipant.profileImage}
                            alt={`${otherParticipant.firstName} ${otherParticipant.lastName}`}
                            className="w-12 h-12 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                            <UserIcon className="w-6 h-6 text-gray-600" />
                        </div>
                    )}

                    {/* Online indicator */}
                    {otherParticipant?.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                </div>

                {/* Chat Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <h3 className={`font-medium truncate ${unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                            {otherParticipant
                                ? `${otherParticipant.firstName} ${otherParticipant.lastName}`
                                : 'Unknown User'
                            }
                        </h3>
                        <div className="flex items-center space-x-2">
                            {lastMessageTime && (
                                <span className={`text-xs ${unreadCount > 0 ? 'text-blue-600 font-medium' : 'text-gray-500'
                                    }`}>
                                    {lastMessageTime}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-between mt-1">
                        {/* Last message preview */}
                        <p className={`text-sm truncate ${unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'
                            }`}>
                            {chat.lastMessage?.content || 'No messages yet'}
                        </p>

                        {/* Unread count and read status */}
                        <div className="flex items-center space-x-2">
                            {chat.lastMessage?.sender === currentUserId && (
                                <CheckIcon className={`w-3 h-3 ${chat.lastMessage?.isRead ? 'text-blue-500' : 'text-gray-400'
                                    }`} />
                            )}

                            {unreadCount > 0 && (
                                <div className="bg-blue-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chat type indicator */}
                    {chat.chatType === 'session' && (
                        <div className="mt-1">
                            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                Session Chat
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </button>
    );
}