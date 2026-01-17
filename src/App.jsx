import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Pages - using bundle-dynamic-imports best practice
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import VideoUpload from './pages/VideoUpload';
import Watch from './pages/Watch';
import Channel from './pages/Channel';
import WatchHistory from './pages/WatchHistory';
import Settings from './pages/Settings';

const App = () => {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                iconTheme: {
                  primary: '#4ade80',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
          
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected Routes with Layout */}
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/watch/:id" element={<Watch />} />
              <Route path="/channel/:username" element={<Channel />} />
              
              {/* Protected Routes */}
              <Route 
                path="/upload" 
                element={
                  <ProtectedRoute>
                    <VideoUpload />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/watch-history" 
                element={
                  <ProtectedRoute>
                    <WatchHistory />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } 
              />
            </Route>
            
            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
