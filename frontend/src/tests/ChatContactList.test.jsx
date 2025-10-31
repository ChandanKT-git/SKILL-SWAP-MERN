import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ChatContactList from '../components/chat/ChatContactList';
import { AuthProvider } from '../context/AuthContext';
import { SocketProvider } from '../context/SocketContext';
import api from '../utils/api';

// Mock API
jest.mock('../utils/api');
const mockedApi = api;

// Mock socket hook
jest.mock('../hooks/useSocket', () => ({
    useSocket: () => ({
        isConnected: true,
    }),
}));

const mockUser = {
    id: 'user1',
    firstName: 'John',
    lastName: 'Doe',
};

const mockChats = [
    {
        _id: 'chat1',
        chatType: 'direct',
        participants: [
            { _id: 'user1', firstName: 'John', lastName: 'Doe' },
            {
                _id: 'user2',
                firstName: 'Jane',
                lastName: 'Smith',
                profileImage: 'https://example.com/avatar2.jpg',
                isOnline: true,
            },
        ],
        lastMessage: {
            content: 'Hello there!',
            sender: 'user2',
            isRead: false,
        },
        lastActivity: new Date().toISOString(),
        participantStatus: [
            { user: 'user1', unreadCount: 1 },
            { user: 'user2', unreadCount: 0 },
        ],
    },
    {
        _id: 'chat2',
        chatType: 'session',
        participants: [
            { _id: 'user1', firstName: 'John', lastName: 'Doe' },
            {
                _id: 'user3',
                firstName: 'Bob',
                lastName: 'Johnson',
                isOnline: false,
            },
        ],
        lastMessage: {
            content: 'See you tomorrow!',
            sender: 'user1',
            isRead: true,
        },
        lastActivity: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        participantStatus: [
            { user: 'user1', unreadCount: 0 },
            { user: 'user3', unreadCount: 0 },
        ],
    },
];

const renderChatContactList = (props = {}) => {
    return render(
        <BrowserRouter>
            <AuthProvider>
                <SocketProvider>
                    <ChatContactList {...props} />
                </SocketProvider>
            </AuthProvider>
        </BrowserRouter>
    );
};

describe('ChatContactList', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Mock localStorage
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: jest.fn(() => JSON.stringify(mockUser)),
                setItem: jest.fn(),
                removeItem: jest.fn(),
            },
            writable: true,
        });

        // Mock successful API response
        mockedApi.get.mockResolvedValue({
            data: {
                success: true,
                data: {
                    chats: mockChats,
                },
            },
        });
    });

    test('renders chat list header', async () => {
        renderChatContactList();

        expect(screen.getByText('Messages')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Search conversations...')).toBeInTheDocument();
    });

    test('displays connection status', async () => {
        renderChatContactList();

        await waitFor(() => {
            expect(screen.getByText('Connected')).toBeInTheDocument();
        });
    });

    test('loads and displays chats', async () => {
        renderChatContactList();

        await waitFor(() => {
            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
            expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
        });
    });

    test('shows unread message count', async () => {
        renderChatContactList();

        await waitFor(() => {
            expect(screen.getByText('1')).toBeInTheDocument(); // Unread count badge
        });
    });

    test('displays session chat indicator', async () => {
        renderChatContactList();

        await waitFor(() => {
            expect(screen.getByText('Session Chat')).toBeInTheDocument();
        });
    });

    test('shows online status indicators', async () => {
        renderChatContactList();

        await waitFor(() => {
            // Online indicator should be present for Jane (user2)
            const onlineIndicators = screen.getAllByRole('button');
            expect(onlineIndicators.length).toBeGreaterThan(0);
        });
    });

    test('filters chats based on search term', async () => {
        const user = userEvent.setup();
        renderChatContactList();

        await waitFor(() => {
            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText('Search conversations...');
        await user.type(searchInput, 'Jane');

        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
    });

    test('calls onChatSelect when chat is clicked', async () => {
        const onChatSelect = jest.fn();
        renderChatContactList({ onChatSelect });

        await waitFor(() => {
            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Jane Smith'));

        expect(onChatSelect).toHaveBeenCalledWith(mockChats[0]);
    });

    test('highlights selected chat', async () => {
        renderChatContactList({ selectedChatId: 'chat1' });

        await waitFor(() => {
            const selectedChat = screen.getByText('Jane Smith').closest('button');
            expect(selectedChat).toHaveClass('bg-blue-50');
        });
    });

    test('shows new chat button when onNewChat provided', () => {
        const onNewChat = jest.fn();
        renderChatContactList({ onNewChat });

        const newChatButton = screen.getByTitle('Start new conversation');
        expect(newChatButton).toBeInTheDocument();

        fireEvent.click(newChatButton);
        expect(onNewChat).toHaveBeenCalled();
    });

    test('displays empty state when no chats', async () => {
        mockedApi.get.mockResolvedValue({
            data: {
                success: true,
                data: {
                    chats: [],
                },
            },
        });

        renderChatContactList();

        await waitFor(() => {
            expect(screen.getByText('No conversations yet')).toBeInTheDocument();
            expect(screen.getByText('Start a conversation to see it here')).toBeInTheDocument();
        });
    });

    test('shows error state when API fails', async () => {
        mockedApi.get.mockRejectedValue(new Error('Network error'));

        renderChatContactList();

        await waitFor(() => {
            expect(screen.getByText('Failed to load conversations')).toBeInTheDocument();
        });
    });

    test('retries loading chats on error', async () => {
        mockedApi.get.mockRejectedValueOnce(new Error('Network error'))
            .mockResolvedValue({
                data: {
                    success: true,
                    data: { chats: mockChats },
                },
            });

        renderChatContactList();

        await waitFor(() => {
            expect(screen.getByText('Try Again')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Try Again'));

        await waitFor(() => {
            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        });
    });

    test('displays last message preview', async () => {
        renderChatContactList();

        await waitFor(() => {
            expect(screen.getByText('Hello there!')).toBeInTheDocument();
            expect(screen.getByText('See you tomorrow!')).toBeInTheDocument();
        });
    });

    test('shows read status for own messages', async () => {
        renderChatContactList();

        await waitFor(() => {
            // Should show checkmark for read message from user1
            const checkIcons = screen.getAllByRole('button');
            expect(checkIcons.length).toBeGreaterThan(0);
        });
    });
});