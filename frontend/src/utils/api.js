import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance with base configuration
const api = axios.create({
    baseURL: '/api',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        const message = error.response?.data?.message || error.message || 'An error occurred';

        // Handle specific error cases
        if (error.response?.status === 401) {
            // Unauthorized - clear auth data and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            toast.error('Session expired. Please log in again.');
        } else if (error.response?.status === 403) {
            toast.error('Access denied. You do not have permission to perform this action.');
        } else if (error.response?.status === 404) {
            toast.error('Resource not found.');
        } else if (error.response?.status >= 500) {
            toast.error('Server error. Please try again later.');
        } else {
            toast.error(message);
        }

        return Promise.reject(error);
    }
);

// API service methods
export const authAPI = {
    register: (userData) => api.post('/auth/register', userData),
    login: (credentials) => api.post('/auth/login', credentials),
    verifyOTP: (data) => api.post('/auth/verify-otp', data),
    resendOTP: (email) => api.post('/auth/resend-otp', { email }),
    refreshToken: (refreshToken) => api.post('/auth/refresh-token', { refreshToken }),
    logout: () => api.post('/auth/logout'),
};

export const profileAPI = {
    getProfile: () => api.get('/profile'),
    getUserProfile: (userId) => api.get(`/profile/${userId}`),
    updateProfile: (data) => api.put('/profile', data),
    uploadAvatar: (formData) => api.post('/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    addSkill: (skillData) => api.post('/profile/skills', skillData),
    updateSkill: (skillId, skillData) => api.put(`/profile/skills/${skillId}`, skillData),
    removeSkill: (skillId) => api.delete(`/profile/skills/${skillId}`),
    getSkills: () => api.get('/profile/skills'),
};

export const searchAPI = {
    searchUsers: (params) => api.get('/search/users', { params }),
    getSkillCategories: () => api.get('/search/categories'),
    getAvailableSkills: (params) => api.get('/search/skills', { params }),
    getTrendingSkills: () => api.get('/search/trending'),
    getSearchSuggestions: (params) => api.get('/search/suggestions', { params }),
};

export const sessionAPI = {
    createSession: (sessionData) => api.post('/sessions', sessionData),
    getUserSessions: (params) => api.get('/sessions', { params }),
    getSession: (sessionId) => api.get(`/sessions/${sessionId}`),
    respondToSession: (sessionId, response) => api.put(`/sessions/${sessionId}/respond`, response),
    proposeAlternativeTime: (sessionId, data) => api.post(`/sessions/${sessionId}/alternative-time`, data),
    cancelSession: (sessionId, reason) => api.put(`/sessions/${sessionId}/cancel`, { reason }),
    completeSession: (sessionId, notes) => api.put(`/sessions/${sessionId}/complete`, { notes }),
    submitFeedback: (sessionId, feedback) => api.post(`/sessions/${sessionId}/feedback`, feedback),
    getUpcomingSessions: (params) => api.get('/sessions/upcoming', { params }),
    checkConflicts: (data) => api.post('/sessions/check-conflicts', data),
    getSessionStats: () => api.get('/sessions/stats'),
};

export const reviewAPI = {
    submitReview: (reviewData) => api.post('/reviews', reviewData),
    getUserReviews: (userId, params) => api.get(`/reviews/user/${userId}`, { params }),
    getReview: (reviewId) => api.get(`/reviews/${reviewId}`),
    getPendingReviews: () => api.get('/reviews/pending'),
    getUserRatingStats: (userId) => api.get(`/reviews/user/${userId}/stats`),
    getSkillRating: (userId, skillName) => api.get(`/reviews/user/${userId}/skill/${skillName}`),
    flagReview: (reviewId, reason) => api.post(`/reviews/${reviewId}/flag`, { reason }),
    markHelpfulness: (reviewId, helpful) => api.post(`/reviews/${reviewId}/helpfulness`, { helpful }),
    addResponse: (reviewId, response) => api.post(`/reviews/${reviewId}/response`, { response }),
};

export const adminAPI = {
    getDashboardStats: () => api.get('/admin/dashboard'),
    getUsers: (params) => api.get('/admin/users', { params }),
    getUserDetails: (userId) => api.get(`/admin/users/${userId}`),
    updateUserStatus: (userId, status) => api.put(`/admin/users/${userId}/status`, { status }),
    getFlaggedReviews: (params) => api.get('/admin/reviews/flagged', { params }),
    moderateReview: (reviewId, action) => api.put(`/admin/reviews/${reviewId}/moderate`, { action }),
    getAnalytics: (params) => api.get('/admin/analytics', { params }),
    getSystemHealth: () => api.get('/admin/system-health'),
    exportUserData: (params) => api.get('/admin/export/users', { params }),
};

export const chatAPI = {
    getUserChats: (params) => api.get('/chat/chats', { params }),
    getChatById: (chatId, params) => api.get(`/chat/chats/${chatId}`, { params }),
    createDirectChat: (otherUserId, sessionId) => api.post('/chat/direct', { otherUserId, sessionId }),
    sendMessage: (chatId, content, messageType = 'text') => api.post(`/chat/chats/${chatId}/messages`, { content, messageType }),
    deleteMessage: (chatId, messageId) => api.delete(`/chat/chats/${chatId}/messages/${messageId}`),
    archiveChat: (chatId) => api.put(`/chat/chats/${chatId}/archive`),
    getSessionChat: (sessionId) => api.get(`/chat/sessions/${sessionId}/chat`),
    getOnlineUsers: () => api.get('/chat/online-users'),
    markAsRead: (chatId, messageId) => api.put(`/chat/chats/${chatId}/read`, { messageId }),
};

export default api;