import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './pages/Login';
import Catalog from './pages/Catalog';
import Dashboard from './pages/Dashboard';
import AdminOps from './pages/AdminOps';
import AdminPT from './pages/AdminPT';
import AdminShop from './pages/AdminShop';
import AdminNews from './pages/AdminNews';
import AdminCoaches from './pages/AdminCoaches';
import CoachDashboard from './pages/CoachDashboard';
import UserPT from './pages/UserPT';
import Leaderboard from './pages/Leaderboard';
import PersonalRecords from './pages/PersonalRecords';
import UserCoach from './pages/UserCoach';
import UserContact from './pages/UserContact';

const LoadingSpinner = () => (
  <div className="min-h-screen bg-black flex items-center justify-center">
    <div className="w-12 h-12 border-4 border-primary border-t-transparent animate-spin"></div>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean; coachOnly?: boolean }> = ({ children, adminOnly = false, coachOnly = false }) => {
  const { user, loading, isAdmin, isCoach } = useAuth();

  if (loading) return <LoadingSpinner />;

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" />;
  }

  if (coachOnly && !isCoach) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};

const HomeRedirect = () => {
  const { user, loading, isAdmin, isCoach } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" />;
  if (isAdmin) return <Navigate to="/admin/ops" />;
  if (isCoach) return <Navigate to="/coach/dashboard" />;
  return <Dashboard />;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/shop" element={<ProtectedRoute><Catalog /></ProtectedRoute>} />
          <Route path="/pt" element={<ProtectedRoute><UserPT /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
          <Route path="/records" element={<ProtectedRoute><PersonalRecords /></ProtectedRoute>} />
          <Route path="/coach" element={<ProtectedRoute><UserCoach /></ProtectedRoute>} />
          <Route path="/contact" element={<ProtectedRoute><UserContact /></ProtectedRoute>} />
          
          {/* Admin Routes */}
          <Route path="/admin/ops" element={<ProtectedRoute adminOnly><AdminOps /></ProtectedRoute>} />
          <Route path="/admin/coaches" element={<ProtectedRoute adminOnly><AdminCoaches /></ProtectedRoute>} />
          <Route path="/admin/pt" element={<ProtectedRoute adminOnly><AdminPT /></ProtectedRoute>} />
          <Route path="/admin/shop" element={<ProtectedRoute adminOnly><AdminShop /></ProtectedRoute>} />
          <Route path="/admin/news" element={<ProtectedRoute adminOnly><AdminNews /></ProtectedRoute>} />

          {/* Coach Routes */}
          <Route path="/coach/dashboard" element={<ProtectedRoute coachOnly><CoachDashboard /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
