import React from 'react';
import { render, screen } from '@testing-library/react';
import MessageList from '../components/chat/MessageList';

const mockMessages = [
    {
        _id: 'msg1',
        content: 'Hello there!',
        sender: {
            _id: 'user1',
            firstName: 'John',
            lastName: 'Doe',
            profileImage: 'https://example.com/avatar1.jpg',
        },
        createdAt: new Date('2024-01-01T10:00:00Z').toISOString(),
        isRead: true,
    },
    {
        _id: 'msg2',
        content: 'Hi! How are you?',
        sender: {
            _id: 'user2',
            firstName: 'Jane',
            lastName: 'Smith',
            profileImage: 'https://example.com/avatar2.jpg',
        },
        createdAt: new Date('2024-01-01T10:01:00Z').toISOString(),
        isRead: false,
    },
    {
        _id: 'msg3',
        content: 'I am doing great, thanks!',
        sender: {
            _id: 'user1',
            firstName: 'John',
            lastName: 'Doe',
            profileImage: 'https://example.com/avatar1.jpg',
        },
        createdAt: new Date('2024-01-01T10:02:00Z').toISOString(),
        isRead: false,
    },
];

const mockParticipants = [
    {
        _id: 'user1',
        firstName: 'John',
        lastName: 'Doe',
    },
    {
        _id: 'user2',
        firstName: 'Jane',
        lastName: 'Smith',
    },
];

describe('MessageList', () => {
    test('renders empty state when no messages', () => {
        render(
            <MessageList
                messages={[]}
                currentUserId="user1"
                participants={mockParticipants}
            />
        );

        expect(screen.getByText('No messages yet')).toBeInTheDocument();
        expect(screen.getByText('Start the conversation by sending a message')).toBeInTheDocument();
    });

    test('renders messages correctly', () => {
        render(
            <MessageList
                messages={mockMessages}
                currentUserId="user1"
                participants={mockParticipants}
            />
        );

        expect(screen.getByText('Hello there!')).toBeInTheDocument();
        expect(screen.getByText('Hi! How are you?')).toBeInTheDocument();
        expect(screen.getByText('I am doing great, thanks!')).toBeInTheDocument();
    });

    test('shows sender names for messages from others', () => {
        render(
            <MessageList
                messages={mockMessages}
                currentUserId="user1"
                participants={mockParticipants}
            />
        );

        // Should show sender name for messages from user2
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    test('displays date separators', () => {
        render(
            <MessageList
                messages={mockMessages}
                currentUserId="user1"
                participants={mockParticipants}
            />
        );

        // Should show "Today" for messages from today (mocked date)
        expect(screen.getByText('January 1, 2024')).toBeInTheDocument();
    });

    test('shows typing indicator when users are typing', () => {
        render(
            <MessageList
                messages={mockMessages}
                currentUserId="user1"
                typingUsers={['user2']}
                participants={mockParticipants}
            />
        );

        expect(screen.getByText('Jane is typing...')).toBeInTheDocument();
    });

    test('shows multiple users typing', () => {
        const moreParticipants = [
            ...mockParticipants,
            {
                _id: 'user3',
                firstName: 'Bob',
                lastName: 'Johnson',
            },
        ];

        render(
            <MessageList
                messages={mockMessages}
                currentUserId="user1"
                typingUsers={['user2', 'user3']}
                participants={moreParticipants}
            />
        );

        expect(screen.getByText('2 people are typing...')).toBeInTheDocument();
    });

    test('displays read status for own messages', () => {
        render(
            <MessageList
                messages={mockMessages}
                currentUserId="user1"
                participants={mockParticipants}
            />
        );

        // Check for read indicators (checkmarks)
        const checkIcons = screen.getAllByTitle(/Read|Sent/);
        expect(checkIcons.length).toBeGreaterThan(0);
    });

    test('groups messages from same sender', () => {
        const groupedMessages = [
            {
                _id: 'msg1',
                content: 'First message',
                sender: {
                    _id: 'user1',
                    firstName: 'John',
                    lastName: 'Doe',
                },
                createdAt: new Date('2024-01-01T10:00:00Z').toISOString(),
            },
            {
                _id: 'msg2',
                content: 'Second message right after',
                sender: {
                    _id: 'user1',
                    firstName: 'John',
                    lastName: 'Doe',
                },
                createdAt: new Date('2024-01-01T10:00:30Z').toISOString(), // 30 seconds later
            },
        ];

        render(
            <MessageList
                messages={groupedMessages}
                currentUserId="user2"
                participants={mockParticipants}
            />
        );

        expect(screen.getByText('First message')).toBeInTheDocument();
        expect(screen.getByText('Second message right after')).toBeInTheDocument();
    });

    test('renders participant avatars', () => {
        render(
            <MessageList
                messages={mockMessages}
                currentUserId="user1"
                participants={mockParticipants}
            />
        );

        // Should show avatar for messages from user2
        const avatar = screen.getByAltText('Jane Smith');
        expect(avatar).toBeInTheDocument();
        expect(avatar).toHaveAttribute('src', 'https://example.com/avatar2.jpg');
    });
});