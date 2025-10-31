import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MessageInput from '../components/chat/MessageInput';

describe('MessageInput', () => {
    const mockOnSendMessage = jest.fn();
    const mockOnTypingStart = jest.fn();
    const mockOnTypingStop = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders message input with placeholder', () => {
        render(
            <MessageInput
                onSendMessage={mockOnSendMessage}
                placeholder="Type a message..."
            />
        );

        expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    });

    test('sends message on form submit', async () => {
        const user = userEvent.setup();

        render(
            <MessageInput onSendMessage={mockOnSendMessage} />
        );

        const input = screen.getByRole('textbox');
        await user.type(input, 'Hello world!');

        const sendButton = screen.getByTitle('Send message');
        await user.click(sendButton);

        expect(mockOnSendMessage).toHaveBeenCalledWith('Hello world!');
    });

    test('sends message on Enter key press', async () => {
        const user = userEvent.setup();

        render(
            <MessageInput onSendMessage={mockOnSendMessage} />
        );

        const input = screen.getByRole('textbox');

        await user.type(input, 'Hello world!');
        await user.keyboard('{Enter}');

        expect(mockOnSendMessage).toHaveBeenCalledWith('Hello world!');
    });

    test('does not send message on Shift+Enter', async () => {
        const user = userEvent.setup();

        render(
            <MessageInput onSendMessage={mockOnSendMessage} />
        );

        const input = screen.getByRole('textbox');

        await user.type(input, 'Hello world!');
        await user.keyboard('{Shift>}{Enter}{/Shift}');

        expect(mockOnSendMessage).not.toHaveBeenCalled();
    });

    test('clears input after sending message', async () => {
        const user = userEvent.setup();

        render(
            <MessageInput onSendMessage={mockOnSendMessage} />
        );

        const input = screen.getByRole('textbox');

        await user.type(input, 'Hello world!');
        await user.keyboard('{Enter}');

        expect(input.value).toBe('');
    });

    test('does not send empty messages', async () => {
        const user = userEvent.setup();

        render(
            <MessageInput onSendMessage={mockOnSendMessage} />
        );

        const sendButton = screen.getByTitle('Type a message to send');

        await user.click(sendButton);

        expect(mockOnSendMessage).not.toHaveBeenCalled();
    });

    test('does not send whitespace-only messages', async () => {
        const user = userEvent.setup();

        render(
            <MessageInput onSendMessage={mockOnSendMessage} />
        );

        const input = screen.getByRole('textbox');

        await user.type(input, '   ');
        await user.keyboard('{Enter}');

        expect(mockOnSendMessage).not.toHaveBeenCalled();
    });

    test('triggers typing indicators', async () => {
        const user = userEvent.setup();

        render(
            <MessageInput
                onSendMessage={mockOnSendMessage}
                onTypingStart={mockOnTypingStart}
                onTypingStop={mockOnTypingStop}
            />
        );

        const input = screen.getByRole('textbox');

        await user.type(input, 'H');

        expect(mockOnTypingStart).toHaveBeenCalled();

        // Wait for typing timeout
        await waitFor(() => {
            expect(mockOnTypingStop).toHaveBeenCalled();
        }, { timeout: 2000 });
    });

    test('respects character limit', async () => {
        const user = userEvent.setup();

        render(
            <MessageInput
                onSendMessage={mockOnSendMessage}
                maxLength={10}
            />
        );

        const input = screen.getByRole('textbox');

        await user.type(input, 'This is a very long message that exceeds the limit');

        expect(input.value).toHaveLength(10);
    });

    test('shows character count when approaching limit', async () => {
        const user = userEvent.setup();

        render(
            <MessageInput
                onSendMessage={mockOnSendMessage}
                maxLength={10}
            />
        );

        const input = screen.getByRole('textbox');

        await user.type(input, '123456789'); // 9 characters > 80% of 10

        expect(screen.getByText('9/10')).toBeInTheDocument();
    });

    test('disables input when disabled prop is true', () => {
        render(
            <MessageInput
                onSendMessage={mockOnSendMessage}
                disabled={true}
            />
        );

        const input = screen.getByRole('textbox');
        const sendButton = screen.getByTitle('Type a message to send');
        const attachButton = screen.getByTitle('Attach file (coming soon)');

        expect(input).toBeDisabled();
        expect(sendButton).toBeDisabled();
        expect(attachButton).toBeDisabled();
    });

    test('shows keyboard shortcut hint', () => {
        render(
            <MessageInput onSendMessage={mockOnSendMessage} />
        );

        expect(screen.getByText('Press Enter to send, Shift+Enter for new line')).toBeInTheDocument();
    });

    test('auto-resizes textarea', async () => {
        const user = userEvent.setup();

        render(
            <MessageInput onSendMessage={mockOnSendMessage} />
        );

        const input = screen.getByRole('textbox');

        await user.type(input, 'Line 1\nLine 2\nLine 3');

        // The textarea should have adjusted its height
        expect(input.style.height).not.toBe('auto');
    });

    test('renders attachment button', () => {
        render(
            <MessageInput onSendMessage={mockOnSendMessage} />
        );

        const attachButton = screen.getByTitle('Attach file (coming soon)');
        expect(attachButton).toBeInTheDocument();
    });
});