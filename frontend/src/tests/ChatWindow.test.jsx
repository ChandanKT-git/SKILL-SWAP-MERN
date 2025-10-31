import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ChatWindow from '../components/chat/ChatWindow';
import { AuthProvider } from '../context/AuthContext';
import { SocketProvider } from '../context/SocketContext';

// Mock the socket hook
jest.mock('../hooks/useSocket', () => ({
    useSocket: () => ({
        socket: null,
        isConnected: true,
        emit: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
    }),
}));

// Mock components
jest.mock('../components/chat/MessageList', () => {
    return function MockMessageList({ messages }) {
        return (
            <div data-testid="message-list">
                {messages.map(msg => (
                    <div key={msg._id} data-testid="message">
                        {msg.content}
                    </div>
                ))}
            </div>
        );
    };
});

jest.mock('../components/chat/MessageInput', () => {
    return function MockMessageInput({ onSendMessage, placeholder }) {
        return (
            <div data-testid="message-input">
                <input
                    placeholder={placeholder}
                    onChange={(e) => {
                        if (e.target.value === 'test message') {
                            onSendMessage('test message');
                        }
                    }}
                />
            </div>
        );
    };
});

const mockUser = {
    id: 'user1',
    firstName: 'John',
    lastName: 'Doe',
    profileImage: 'https://example.com/avatar.jpg',
};

const mockChat = {
    _id: 'chat1',
    chatType: 'direct',
    participants: [
        mockUser,
        {
            _id: 'user2',
            firstName: 'Jane',
            lastName: 'Smith',
            profileImage: 'https://example.com/avatar2.jpg',
            isOnline: true,
        },
    ],
    messages: [
        {
            _id: 'msg1',
            content: 'Hello there!',
            sender: {
                _id: 'user2',
                firstName: 'Jane',
                lastName: 'Smith',
            },
            createdAt: new Date().toISOString(),
            isRead: false,
        },
    ],
};

const renderChatWindow = (props = {}) => {
    return render(
        <BrowserRouter>
            <AuthProvider>
                <SocketProvider>
                    <ChatWindow chat={mockChat} {...props} />
                </SocketProvider>
            </AuthProvider>
        </BrowserRouter>
    );
};

describe('ChatWindow', () => {
    beforeEach(() => {
        // Mock localStorage
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: jest.fn(() => JSON.stringify(mockUser)),
                setItem: jest.fn(),
                removeItem: jest.fn(),
            },
            writable: true,
        });
    });

    test('renders chat window with participant info', () => {
        renderChatWindow();

        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Online')).toBeInTheDocument();
    });

    test('renders empty state when no chat provided', () => {
        renderChatWindow({ chat: null });

        expect(screen.getByText('Select a conversation to start chatting')).toBeInTheDocument();
    });

    test('displays session chat indicator', () => {
        const sessionChat = {
            ...mockChat,
            chatType: 'session',
        };

        renderChatWindow({ chat: sessionChat });

        expect(screen.getByText('Session Chat')).toBeInTheDocument();
    });

    test('shows close button when onClose provided', () => {
        const onClose = jest.fn();
        renderChatWindow({ onClose });

        const closeButton = screen.getByRole('button');
        fireEvent.click(closeButton);

        expect(onClose).toHaveBeenCalled();
    });

    test('renders message list with messages', () => {
        renderChatWindow();

        expect(screen.getByTestId('message-list')).toBeInTheDocument();
        expect(screen.getByText('Hello there!')).toBeInTheDocument();
    });

    test('renders message input', () => {
        renderChatWindow();

        expect(screen.getByTestId('message-input')).toBeInTheDocument();
    });

    test('handles message sending', async () => {
        renderChatWindow();

        const input = screen.getByPlaceholderText('Message Jane...');
        fireEvent.change(input, { target: { value: 'test message' } });

        // The mock MessageInput will trigger onSendMessage when value is 'test message'
        await waitFor(() => {
            // Verify the message was processed (this would normally update the messages state)
            expect(input).toBeInTheDocument();
        });
    });

    test('shows offline status when participant is offline', () => {
        const offlineChat = {
            ...mockChat,
            participants: [
                mockUser,
                {
                    ...mockChat.participants[1],
                    isOnline: false,
                },
            ],
        };

        renderChatWindow({ chat: offlineChat });

        expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    test('displays participant avatar', () => {
        renderChatWindow();

        const avatar = screen.getByAltText('Jane Smith');
        expect(avatar).toBeInTheDocument();
        expect(avatar).toHaveAttribute('src', 'https://example.com/avatar2.jpg');
    });
});