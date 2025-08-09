import { createContext, useContext, useReducer, useEffect } from 'react';

const AuthContext = createContext();

const initialState = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
};

function authReducer(state, action) {
    switch (action.type) {
        case 'LOGIN_SUCCESS':
            return {
                ...state,
                user: action.payload.user,
                token: action.payload.token,
                isAuthenticated: true,
                isLoading: false,
            };
        case 'LOGOUT':
            return {
                ...state,
                user: null,
                token: null,
                isAuthenticated: false,
                isLoading: false,
            };
        case 'SET_LOADING':
            return {
                ...state,
                isLoading: action.payload,
            };
        case 'UPDATE_USER':
            return {
                ...state,
                user: { ...state.user, ...action.payload },
            };
        default:
            return state;
    }
}

export function AuthProvider({ children }) {
    const [state, dispatch] = useReducer(authReducer, initialState);

    useEffect(() => {
        // Check for existing token on app load
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');

        if (token && user) {
            try {
                const parsedUser = JSON.parse(user);
                dispatch({
                    type: 'LOGIN_SUCCESS',
                    payload: { user: parsedUser, token },
                });
            } catch (error) {
                console.error('Error parsing stored user data:', error);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }

        dispatch({ type: 'SET_LOADING', payload: false });
    }, []);

    const login = (user, token) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { user, token },
        });
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        dispatch({ type: 'LOGOUT' });
    };

    const updateUser = (userData) => {
        const updatedUser = { ...state.user, ...userData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        dispatch({ type: 'UPDATE_USER', payload: userData });
    };

    const value = {
        ...state,
        login,
        logout,
        updateUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}