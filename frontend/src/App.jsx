import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import './App.css';

function App() {
    return (
        <AuthProvider>
            <div className="min-h-screen bg-gray-50">
                <Routes>
                    <Route path="/" element={<Home />} />
                    {/* Additional routes will be added here */}
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