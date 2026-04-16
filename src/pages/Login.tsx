import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, ArrowRight, User, Lock, LogIn, AlertCircle } from 'lucide-react';
import { auth, signInWithEmailAndPassword } from '../firebase';
import { useAuth } from '../AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoggingIn(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err: any) {
      console.error('Login failed:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid credentials. Access denied.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Account temporarily locked.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password authentication is not enabled in Firebase. Please enable it in the Firebase Console.');
      } else {
        setError('Authentication failure. Please verify credentials.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) return null;

  return (
    <div className="bg-black text-white font-body selection:bg-primary selection:text-white overflow-hidden min-h-screen">
      {/* Top Status Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-primary z-[100]"></div>
      
      <main className="relative min-h-screen flex items-center justify-center p-6">
        {/* Background Imagery */}
        <div className="absolute inset-0 z-0 opacity-20">
          <img 
            src="https://picsum.photos/seed/gym-dark/1920/1080" 
            alt="Gym Background" 
            className="w-full h-full object-cover grayscale" 
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/80"></div>
        </div>

        {/* Login Container */}
        <div className="relative z-10 w-full max-w-md flex flex-col items-stretch space-y-12">
          {/* Branding Section */}
          <header className="flex flex-col items-center text-center space-y-4">
            <div className="flex items-center justify-center bg-primary p-3 mb-4">
              <Dumbbell className="text-black w-10 h-10" />
            </div>
            <h1 className="font-headline font-black text-6xl md:text-7xl tracking-tighter text-primary uppercase leading-none">
              RICHFIT
            </h1>
            <div className="w-full h-px bg-white/10 flex items-center justify-center">
              <span className="bg-black px-4 font-headline text-[10px] tracking-[0.3em] text-zinc-500 uppercase">Kinetic Forge Noir</span>
            </div>
          </header>

          {/* Authentication Form */}
          <div className="space-y-8">
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border-l-4 border-red-500 p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <AlertCircle className="text-red-500 w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-red-200 text-sm font-headline font-bold uppercase tracking-tight leading-tight">
                    {error}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="EMAIL ADDRESS"
                    className="w-full bg-zinc-900/50 border-2 border-zinc-800 focus:border-primary focus:ring-0 text-white font-headline py-4 pl-12 pr-4 uppercase transition-all outline-none"
                  />
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                  <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="ACCESS KEY"
                    className="w-full bg-zinc-900/50 border-2 border-zinc-800 focus:border-primary focus:ring-0 text-white font-headline py-4 pl-12 pr-4 transition-all outline-none"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isLoggingIn}
                className="group relative w-full bg-white text-black font-headline font-black text-xl py-5 px-8 hover:bg-primary transition-all active:scale-[0.98] flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="uppercase tracking-tighter flex items-center gap-3">
                  <LogIn className="w-6 h-6" />
                  {isLoggingIn ? 'Verifying...' : 'Authorize Access'}
                </span>
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            <div className="flex items-center gap-6 pt-4">
              <span className="h-px w-full bg-zinc-800"></span>
              <p className="font-headline text-[10px] text-zinc-600 uppercase tracking-widest whitespace-nowrap">Secure Member Access</p>
              <span className="h-px w-full bg-zinc-800"></span>
            </div>
          </div>
        </div>

        {/* Decorative UI Elements */}
        <div className="hidden lg:block absolute bottom-12 left-12 font-headline text-[10px] text-zinc-800 leading-relaxed uppercase tracking-tighter">
          System: Active<br />
          Encryption: AES-256<br />
          Location: 40.7128° N, 74.0060° W<br />
          Forge Status: Optimal
        </div>
        <div className="hidden lg:block absolute top-12 right-12 font-headline text-[10px] text-primary/30 leading-relaxed uppercase tracking-[0.5em] [writing-mode:vertical-rl] rotate-180">
          STRY_HARDER_TRAIN_SMARTER
        </div>
      </main>
    </div>
  );
}
