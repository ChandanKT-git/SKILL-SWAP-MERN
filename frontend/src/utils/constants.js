// API endpoints
export const API_BASE_URL = '/api';

// Skill levels
export const SKILL_LEVELS = {
    BEGINNER: 'beginner',
    INTERMEDIATE: 'intermediate',
    ADVANCED: 'advanced',
    EXPERT: 'expert',
};

export const SKILL_LEVEL_LABELS = {
    [SKILL_LEVELS.BEGINNER]: 'Beginner',
    [SKILL_LEVELS.INTERMEDIATE]: 'Intermediate',
    [SKILL_LEVELS.ADVANCED]: 'Advanced',
    [SKILL_LEVELS.EXPERT]: 'Expert',
};

// Session statuses
export const SESSION_STATUS = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    CANCELLED: 'cancelled',
    COMPLETED: 'completed',
    NO_SHOW: 'no-show',
};

export const SESSION_STATUS_LABELS = {
    [SESSION_STATUS.PENDING]: 'Pending',
    [SESSION_STATUS.ACCEPTED]: 'Accepted',
    [SESSION_STATUS.REJECTED]: 'Rejected',
    [SESSION_STATUS.CANCELLED]: 'Cancelled',
    [SESSION_STATUS.COMPLETED]: 'Completed',
    [SESSION_STATUS.NO_SHOW]: 'No Show',
};

// Session types
export const SESSION_TYPES = {
    ONLINE: 'online',
    IN_PERSON: 'in-person',
    HYBRID: 'hybrid',
};

export const SESSION_TYPE_LABELS = {
    [SESSION_TYPES.ONLINE]: 'Online',
    [SESSION_TYPES.IN_PERSON]: 'In Person',
    [SESSION_TYPES.HYBRID]: 'Hybrid',
};

// User roles
export const USER_ROLES = {
    USER: 'user',
    ADMIN: 'admin',
};

// User statuses
export const USER_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
};

// Notification types
export const NOTIFICATION_TYPES = {
    SESSION_REQUEST: 'session_request',
    SESSION_ACCEPTED: 'session_accepted',
    SESSION_REJECTED: 'session_rejected',
    SESSION_CANCELLED: 'session_cancelled',
    SESSION_REMINDER: 'session_reminder',
    SESSION_COMPLETED: 'session_completed',
    REVIEW_RECEIVED: 'review_received',
    SYSTEM_UPDATE: 'system_update',
};

// Validation patterns
export const VALIDATION_PATTERNS = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    PHONE: /^\+?[\d\s\-\(\)]+$/,
};

// File upload limits
export const FILE_LIMITS = {
    AVATAR_MAX_SIZE: 5 * 1024 * 1024, // 5MB
    AVATAR_ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
};

// Pagination defaults
export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
};

// Date formats
export const DATE_FORMATS = {
    DISPLAY: 'MMM dd, yyyy',
    DISPLAY_WITH_TIME: 'MMM dd, yyyy at h:mm a',
    INPUT: 'yyyy-MM-dd',
    INPUT_WITH_TIME: "yyyy-MM-dd'T'HH:mm",
};

// Rating scale
export const RATING_SCALE = {
    MIN: 1,
    MAX: 5,
};

// Local storage keys
export const STORAGE_KEYS = {
    TOKEN: 'token',
    USER: 'user',
    THEME: 'theme',
    LANGUAGE: 'language',
};

// Error messages
export const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Network error. Please check your connection and try again.',
    UNAUTHORIZED: 'You are not authorized to perform this action.',
    FORBIDDEN: 'Access denied.',
    NOT_FOUND: 'The requested resource was not found.',
    SERVER_ERROR: 'Server error. Please try again later.',
    VALIDATION_ERROR: 'Please check your input and try again.',
    SESSION_EXPIRED: 'Your session has expired. Please log in again.',
};

// Success messages
export const SUCCESS_MESSAGES = {
    PROFILE_UPDATED: 'Profile updated successfully!',
    SKILL_ADDED: 'Skill added successfully!',
    SKILL_UPDATED: 'Skill updated successfully!',
    SKILL_REMOVED: 'Skill removed successfully!',
    SESSION_CREATED: 'Session request sent successfully!',
    SESSION_ACCEPTED: 'Session accepted successfully!',
    SESSION_REJECTED: 'Session rejected successfully!',
    SESSION_CANCELLED: 'Session cancelled successfully!',
    SESSION_COMPLETED: 'Session marked as completed!',
    REVIEW_SUBMITTED: 'Review submitted successfully!',
    FEEDBACK_SUBMITTED: 'Feedback submitted successfully!',
};

// Theme colors (matching Tailwind config)
export const THEME_COLORS = {
    PRIMARY: {
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8',
        800: '#1e40af',
        900: '#1e3a8a',
        950: '#172554',
    },
    SECONDARY: {
        50: '#f8fafc',
        100: '#f1f5f9',
        200: '#e2e8f0',
        300: '#cbd5e1',
        400: '#94a3b8',
        500: '#64748b',
        600: '#475569',
        700: '#334155',
        800: '#1e293b',
        900: '#0f172a',
        950: '#020617',
    },
};