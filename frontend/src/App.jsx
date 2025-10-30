import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Header from './components/common/Header';
import ProtectedRoute, { PublicRoute } from './components/auth/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import ProfileEdit from './pages/ProfileEdit';
import SkillsManager from './pages/SkillsManager';
import Search from './pages/Search';
import Sessions from './pages/Sessions';
import './App.css';

function App() {
    return (
        <AuthProvider>
            <div className="min-h-screen bg-gray-50">
                <Routes>
                    {/* Public routes */}
                    <Route path="/" element={
                        <div>
                            <Header />
                            <Home />
                        </div>
                    } />

                    {/* Auth routes - redirect to dashboard if already authenticated */}
                    <Route path="/login" element={
                        <PublicRoute>
                            <Login />
                        </PublicRoute>
                    } />
                    <Route path="/register" element={
                        <PublicRoute>
                            <Register />
                        </PublicRoute>
                    } />
                    <Route path="/verify-email" element={<VerifyEmail />} />

                    {/* Protected routes */}
                    <Route path="/dashboard" element={
                        <ProtectedRoute>
                            <Header />
                            <Dashboard />
                        </ProtectedRoute>
                    } />
                    <Route path="/profile" element={
                        <ProtectedRoute>
                            <Header />
                            <Profile />
                        </ProtectedRoute>
                    } />
                    <Route path="/profile/:userId" element={
                        <ProtectedRoute>
                            <Header />
                            <Profile />
                        </ProtectedRoute>
                    } />
                    <Route path="/profile/edit" element={
                        <ProtectedRoute>
                            <Header />
                            <ProfileEdit />
                        </ProtectedRoute>
                    } />
                    <Route path="/profile/skills" element={
                        <ProtectedRoute>
                            <Header />
                            <SkillsManager />
                        </ProtectedRoute>
                    } />
                    <Route path="/search" element={
                        <ProtectedRoute>
                            <Header />
                            <Search />
                        </ProtectedRoute>
                    } />
                    <Route path="/sessions" element={
                        <ProtectedRoute>
                            <Header />
                            <Sessions />
                        </ProtectedRoute>
                    } />

                    {/* Catch all route */}
                    <Route path="*" element={
                        <div className="min-h-screen flex items-center justify-center">
                            <div className="text-center">
                                <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                                <p className="text-gray-600">Page not found</p>
                            </div>
                        </div>
                    } />
                </Routes>

                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 4000,
                        style: {
                            background: '#363636',
                            color: '#fff',
                        },
                    }}
                />
            </div>
        </AuthProvider>
    );
}

export default App;