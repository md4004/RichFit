import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { Download, AlertTriangle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
import Settings from './pages/Settings';
import PWAPrompt from './components/PWAPrompt';

const CURRENT_VERSION = '1.0.0';
const G_DRIVE_LINK = 'https://drive.google.com/uc?export=download&id=19u4sZ1HgXLumIEhoy17Hct5zGLQFkr2S';
const VERSION_JSON_URL = 'https://richfit-236411176275.us-west1.run.app/version.json';

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
  const [showUpdateLock, setShowUpdateLock] = useState(false);
  const [updateDetails, setUpdateDetails] = useState<{ version: string; whatsNew: string[] } | null>(null);

  useEffect(() => {
    const checkUpdate = async () => {
      const isAndroid = /Android/i.test(navigator.userAgent);
      if (!isAndroid) return;

      try {
        const response = await fetch(VERSION_JSON_URL);
        if (!response.ok) return;
        const data = await response.json();
        
        if (data.version && data.version !== CURRENT_VERSION) {
          setUpdateDetails(data);
          setShowUpdateLock(true);
          // Block scrolling
          document.body.style.overflow = 'hidden';
        }
      } catch (error) {
        console.error("Update check failed:", error);
        // Error resilience: allow entry
      }
    };

    checkUpdate();
  }, []);

  return (
    <AuthProvider>
      <Router>
        <AnimatePresence>
          {showUpdateLock && updateDetails && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-[9999] bg-black flex items-center justify-center p-4 overflow-hidden"
              style={{ touchAction: 'none' }}
            >
              <div className="max-w-md w-full border-2 border-primary shadow-[0_0_50px_rgba(255,0,0,0.3)] bg-zinc-950 p-8 relative overflow-hidden">
                {/* Background Glow */}
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 blur-[100px] rounded-full" />
                <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-primary/20 blur-[100px] rounded-full" />

                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/50 shadow-[0_0_20px_rgba(255,0,0,0.2)]">
                    <AlertTriangle className="w-10 h-10 text-primary animate-pulse" />
                  </div>

                  <h1 className="text-4xl font-black font-headline text-white uppercase tracking-tighter leading-none mb-2">
                    Rich<span className="text-primary">Fit</span>
                  </h1>
                  <h2 className="text-xl font-bold font-headline text-primary uppercase tracking-[0.2em] mb-8">
                    Critical Update Required
                  </h2>

                  <div className="w-full bg-black/50 border border-zinc-800 p-6 rounded-lg mb-8 text-left">
                    <div className="flex items-center gap-2 mb-4">
                      <Info className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Protocol Version {updateDetails.version}</span>
                    </div>
                    <ul className="space-y-3">
                      {updateDetails.whatsNew.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 shrink-0" />
                          <span className="text-sm font-headline font-bold text-zinc-300 uppercase leading-snug">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <a 
                    href={G_DRIVE_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-primary text-black font-headline font-black text-lg py-5 uppercase tracking-tighter hover:bg-white transition-all shadow-[0_0_30px_rgba(255,0,0,0.4)] hover:shadow-[0_0_40px_rgba(255,0,255,0.2)] animate-bounce flex items-center justify-center gap-3"
                  >
                    <Download className="w-6 h-6" />
                    Download & Install
                  </a>

                  <p className="text-[9px] text-zinc-600 mt-6 font-bold uppercase tracking-widest">
                    Manual override disabled. induction requires latest tactical build.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/shop" element={<ProtectedRoute><Catalog /></ProtectedRoute>} />
          <Route path="/pt" element={<ProtectedRoute><UserPT /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
          <Route path="/records" element={<ProtectedRoute><PersonalRecords /></ProtectedRoute>} />
          <Route path="/coach" element={<ProtectedRoute><UserCoach /></ProtectedRoute>} />
          <Route path="/contact" element={<ProtectedRoute><UserContact /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          
          {/* Admin Routes */}
          <Route path="/admin/ops" element={<ProtectedRoute adminOnly><AdminOps /></ProtectedRoute>} />
          <Route path="/admin/coaches" element={<ProtectedRoute adminOnly><AdminCoaches /></ProtectedRoute>} />
          <Route path="/admin/pt" element={<ProtectedRoute adminOnly><AdminPT /></ProtectedRoute>} />
          <Route path="/admin/shop" element={<ProtectedRoute adminOnly><AdminShop /></ProtectedRoute>} />
          <Route path="/admin/news" element={<ProtectedRoute adminOnly><AdminNews /></ProtectedRoute>} />

          {/* Coach Routes */}
          <Route path="/coach/dashboard" element={<ProtectedRoute coachOnly><CoachDashboard /></ProtectedRoute>} />
        </Routes>
        <PWAPrompt />
      </Router>
    </AuthProvider>
  );
}
