import { useEffect, useRef } from 'react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { UserIcon, CheckIcon } from '@heroicons/react/24/solid';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';

/**
 * Component to display a list of messages with real-time updates
 */
export default function MessageList({ messages, currentUserId, typingUsers = [], participants = [] }) {
    const messagesContainerRef = useRef(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messages]);

    // Group messages by date
    const groupMessagesByDate = (messages) => {
        const groups = {};

        messages.forEach(message => {
            const date = new Date(message.createdAt);
            let dateKey;

            if (isToday(date)) {
                dateKey = 'Today';
            } else if (isYesterday(date)) {
                dateKey = 'Yesterday';
            } else {
                dateKey = format(date, 'MMMM d, yyyy');
            }

            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(message);
        });

        return groups;
    };

    // Format message time
    const formatMessageTime = (timestamp) => {
        const date = new Date(timestamp);
        return format(date, 'h:mm a');
    };

    // Check if messages should be grouped (same sender, within 5 minutes)
    const shouldGroupWithPrevious = (currentMessage, previousMessage) => {
        if (!previousMessage) return false;

        const currentTime = new Date(currentMessage.createdAt);
        const previousTime = new Date(previousMessage.createdAt);
        const timeDiff = currentTime - previousTime;

        return (
            currentMessage.sender._id === previousMessage.sender._id &&
            timeDiff < 5 * 60 * 1000 // 5 minutes
        );
    };

    // Get typing indicator users
    const getTypingUsers = () => {
        return participants.filter(p =>
            typingUsers.includes(p._id) && p._id !== currentUserId
        );
    };

    const messageGroups = groupMessagesByDate(messages);
    const typingParticipants = getTypingUsers();

    if (messages.length === 0) {
        return (
            <div className="flex items-center justify-center h-full p-8">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <UserIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 mb-2">No messages yet</p>
                    <p className="text-sm text-gray-400">Start the conversation by sending a message</p>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
        >
            {Object.entries(messageGroups).map(([dateKey, dateMessages]) => (
                <div key={dateKey}>
                    {/* Date Separator */}
                    <div className="flex items-center justify-center my-6">
                        <div className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-500 font-medium">
                            {dateKey}
                        </div>
                    </div>

                    {/* Messages for this date */}
                    {dateMessages.map((message, index) => {
                        const isOwnMessage = message.sender._id === currentUserId;
                        const previousMessage = index > 0 ? dateMessages[index - 1] : null;
                        const shouldGroup = shouldGroupWithPrevious(message, previousMessage);

                        return (
                            <MessageBubble
                                key={message._id}
                                message={message}
                                isOwnMessage={isOwnMessage}
                                shouldGroup={shouldGroup}
                                showTime={!shouldGroup}
                            />
                        );
                    })}
                </div>
            ))}

            {/* Typing Indicator */}
            {typingParticipants.length > 0 && (
                <div className="flex items-center space-x-2 px-4 py-2">
                    <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm text-gray-500">
                        {typingParticipants.length === 1
                            ? `${typingParticipants[0].firstName} is typing...`
                            : `${typingParticipants.length} people are typing...`
                        }
                    </span>
                </div>
            )}
        </div>
    );
}

/**
 * Individual message bubble component
 */
function MessageBubble({ message, isOwnMessage, shouldGroup, showTime }) {
    const messageTime = formatDistanceToNow(new Date(message.createdAt), { addSuffix: true });
    const exactTime = formatMessageTime(message.createdAt);

    return (
        <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${shouldGroup ? 'mt-1' : 'mt-4'}`}>
            <div className={`flex max-w-xs lg:max-w-md ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}>
                {/* Avatar (only show for first message in group) */}
                {!shouldGroup && !isOwnMessage && (
                    <div className="flex-shrink-0">
                        {message.sender.profileImage ? (
                            <img
                                src={message.sender.profileImage}
                                alt={`${message.sender.firstName} ${message.sender.lastName}`}
                                className="w-8 h-8 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                                <UserIcon className="w-4 h-4 text-gray-600" />
                            </div>
                        )}
                    </div>
                )}

                {/* Message Content */}
                <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                    {/* Sender name (only for first message in group from others) */}
                    {!shouldGroup && !isOwnMessage && (
                        <span className="text-xs text-gray-500 mb-1 px-3">
                            {message.sender.firstName} {message.sender.lastName}
                        </span>
                    )}

                    {/* Message bubble */}
                    <div
                        className={`relative px-4 py-2 rounded-2xl ${isOwnMessage
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-900'
                            } ${shouldGroup ? (isOwnMessage ? 'rounded-br-md' : 'rounded-bl-md') : ''}`}
                    >
                        {/* Message content */}
                        <p className="text-sm whitespace-pre-wrap break-words">
                            {message.content}
                        </p>

                        {/* Message status and time */}
                        <div className={`flex items-center justify-end mt-1 space-x-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                            <span className="text-xs" title={exactTime}>
                                {showTime && messageTime}
                            </span>

                            {/* Read status for own messages */}
                            {isOwnMessage && (
                                <div className="flex items-center">
                                    {message.isRead ? (
                                        <CheckIcon className="w-3 h-3" title="Read" />
                                    ) : (
                                        <CheckIcon className="w-3 h-3 opacity-50" title="Sent" />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Message actions (show on hover) */}
                    <div className="opacity-0 hover:opacity-100 transition-opacity duration-200 mt-1">
                        <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
                            <EllipsisVerticalIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Spacer for own messages to align with avatar space */}
                {shouldGroup && isOwnMessage && (
                    <div className="w-8"></div>
                )}
            </div>
        </div>
    );
}

// Helper function to format message time (moved outside component to avoid recreation)
function formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    return format(date, 'h:mm a');
}