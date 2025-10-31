import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ChatContactList from '../components/chat/ChatContactList';
import ChatWindow from '../components/chat/ChatWindow';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

/**
 * Main chat page that combines contact list and chat window
 */
export default function Chat() {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedChat, setSelectedChat] = useState(null);
    const [isMobileView, setIsMobileView] = useState(false);

    // Get chat ID from URL params
    const chatIdFromUrl = searchParams.get('chat');

    // Handle responsive design
    useEffect(() => {
        const checkMobileView = () => {
            setIsMobileView(window.innerWidth < 768);
        };

        checkMobileView();
        window.addEventListener('resize', checkMobileView);
        return () => window.removeEventListener('resize', checkMobileView);
    }, []);

    // Load chat from URL parameter
    useEffect(() => {
        if (chatIdFromUrl && (!selectedChat || selectedChat._id !== chatIdFromUrl)) {
            loadChatById(chatIdFromUrl);
        }
    }, [chatIdFromUrl, selectedChat]);

    const loadChatById = async (chatId) => {
        try {
            const response = await api.get(`/chat/chats/${chatId}`);
            if (response.data.success) {
                setSelectedChat(response.data.data.chat);
            }
        } catch (error) {
            console.error('Error loading chat:', error);
            // Remove invalid chat ID from URL
            setSearchParams({});
        }
    };

    const handleChatSelect = (chat) => {
        setSelectedChat(chat);
        // Update URL with selected chat ID
        setSearchParams({ chat: chat._id });
    };

    const handleCloseChatWindow = () => {
        setSelectedChat(null);
        setSearchParams({});
    };

    const handleNewChat = () => {
        // TODO: Implement new chat creation modal
        console.log('New chat creation not implemented yet');
    };

    // Mobile view: show either contact list or chat window
    if (isMobileView) {
        return (
            <div className="h-screen bg-gray-50">
                {selectedChat ? (
                    <ChatWindow
                        chat={selectedChat}
                        onClose={handleCloseChatWindow}
                        className="h-full"
                    />
                ) : (
                    <ChatContactList
                        onChatSelect={handleChatSelect}
                        selectedChatId={selectedChat?._id}
                        onNewChat={handleNewChat}
                        className="h-full"
                    />
                )}
            </div>
        );
    }

    // Desktop view: show both contact list and chat window
    return (
        <div className="h-screen bg-gray-50 flex">
            {/* Contact List Sidebar */}
            <div className="w-80 border-r border-gray-200 bg-white">
                <ChatContactList
                    onChatSelect={handleChatSelect}
                    selectedChatId={selectedChat?._id}
                    onNewChat={handleNewChat}
                    className="h-full"
                />
            </div>

            {/* Chat Window */}
            <div className="flex-1">
                <ChatWindow
                    chat={selectedChat}
                    className="h-full"
                />
            </div>
        </div>
    );
}