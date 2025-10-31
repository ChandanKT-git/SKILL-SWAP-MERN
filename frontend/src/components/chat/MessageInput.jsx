import { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, PaperClipIcon } from '@heroicons/react/24/outline';

/**
 * Message input component with send functionality and typing indicators
 */
export default function MessageInput({
    onSendMessage,
    onTypingStart,
    onTypingStop,
    disabled = false,
    placeholder = "Type a message...",
    maxLength = 1000
}) {
    const [message, setMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const textareaRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [message]);

    // Handle typing indicators
    useEffect(() => {
        if (message.trim() && !isTyping) {
            setIsTyping(true);
            onTypingStart?.();
        }

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set new timeout to stop typing indicator
        typingTimeoutRef.current = setTimeout(() => {
            if (isTyping) {
                setIsTyping(false);
                onTypingStop?.();
            }
        }, 1000);

        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, [message, isTyping, onTypingStart, onTypingStop]);

    // Cleanup typing indicator on unmount
    useEffect(() => {
        return () => {
            if (isTyping) {
                onTypingStop?.();
            }
        };
    }, [isTyping, onTypingStop]);

    const handleSubmit = (e) => {
        e.preventDefault();

        const trimmedMessage = message.trim();
        if (!trimmedMessage || disabled) return;

        // Send message
        onSendMessage(trimmedMessage);

        // Clear input
        setMessage('');

        // Stop typing indicator
        if (isTyping) {
            setIsTyping(false);
            onTypingStop?.();
        }

        // Focus back to input
        textareaRef.current?.focus();
    };

    const handleKeyDown = (e) => {
        // Send on Enter (but not Shift+Enter)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleChange = (e) => {
        const value = e.target.value;
        if (value.length <= maxLength) {
            setMessage(value);
        }
    };

    const canSend = message.trim().length > 0 && !disabled;

    return (
        <form onSubmit={handleSubmit} className="p-4">
            <div className="flex items-end space-x-3">
                {/* Attachment button (placeholder for future file upload) */}
                <button
                    type="button"
                    disabled={disabled}
                    className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Attach file (coming soon)"
                >
                    <PaperClipIcon className="w-5 h-5" />
                </button>

                {/* Message input area */}
                <div className="flex-1 relative">
                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        disabled={disabled}
                        rows={1}
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                        style={{ minHeight: '48px', maxHeight: '120px' }}
                    />

                    {/* Character count */}
                    {message.length > maxLength * 0.8 && (
                        <div className="absolute -top-6 right-0 text-xs text-gray-500">
                            {message.length}/{maxLength}
                        </div>
                    )}
                </div>

                {/* Send button */}
                <button
                    type="submit"
                    disabled={!canSend}
                    className={`flex-shrink-0 p-3 rounded-full transition-all duration-200 ${canSend
                            ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                    title={canSend ? 'Send message' : 'Type a message to send'}
                >
                    <PaperAirplaneIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Keyboard shortcut hint */}
            <div className="mt-2 text-xs text-gray-400 text-center">
                Press Enter to send, Shift+Enter for new line
            </div>
        </form>
    );
}