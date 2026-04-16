import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Dumbbell, Bell, Users, ShieldCheck, DollarSign, Newspaper, Home, Brain, Activity, ShoppingCart, Settings, User as UserIcon, LogOut, X, Phone, Trash2, Calendar as CalendarIcon, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/AuthContext';
import { auth, signOut, db, collection, onSnapshot, query, where, orderBy, limit, doc, updateDoc, deleteDoc, OperationType, handleFirestoreError } from '@/firebase';
import NotificationManager from './NotificationManager';

interface LayoutProps {
  children: React.ReactNode;
  isAdmin?: boolean;
}

export default function Layout({ children, isAdmin: forceAdmin = false }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, isAdmin, isCoach, user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const path = 'notifications';
    const q = query(
      collection(db, path),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(notifData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const deleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notifications/${id}`);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'PT', path: '/pt', icon: Activity },
    { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    { name: 'Shop', path: '/shop', icon: ShoppingCart },
    { name: 'AI Coach', path: '/coach', icon: Brain },
    { name: 'Contact', path: '/contact', icon: Phone },
  ];

  const adminNavItems = [
    { name: 'Members', path: '/admin/ops', icon: Users },
    { name: 'Coaches', path: '/admin/coaches', icon: ShieldCheck },
    { name: 'PT Auth', path: '/admin/pt', icon: ShieldCheck },
    { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    { name: 'Income', path: '/admin/shop', icon: DollarSign },
    { name: 'News', path: '/admin/news', icon: Newspaper },
  ];

  const coachNavItems = [
    { name: 'Duty Calendar', path: '/coach/dashboard', icon: CalendarIcon },
    { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
  ];

  const currentNavItems = isAdmin ? adminNavItems : (isCoach ? coachNavItems : navItems);

  return (
    <div className="min-h-screen bg-black text-white font-body overflow-x-hidden">
      <NotificationManager />
      {/* Top Bar */}
      <header className="fixed top-0 w-full z-50 border-b-4 border-primary flex justify-between items-center px-4 md:px-6 py-4 bg-black">
        <div className="flex items-center gap-2 md:gap-3">
          <Dumbbell className="text-primary w-6 h-6 md:w-8 md:h-8" />
          <h1 className="text-lg md:text-2xl font-black text-primary tracking-widest font-headline uppercase truncate">RICHFIT</h1>
        </div>
        <div className="flex items-center gap-2 md:gap-6">
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className={cn("p-2 transition-colors relative", showNotifications ? "text-primary" : "text-zinc-500 hover:bg-zinc-900")}
            >
              <Bell className="w-5 h-5 md:w-6 md:h-6" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary animate-pulse"></span>
              )}
            </button>
            {showNotifications && (
              <div className="fixed md:absolute right-4 md:right-0 top-20 md:top-[calc(100%+12px)] w-[calc(100vw-32px)] md:w-96 max-w-[400px] bg-zinc-900 border-2 border-primary animate-in fade-in slide-in-from-top-2 z-[100] shadow-2xl">
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                  <h4 className="font-headline font-black uppercase text-xs tracking-widest">System Alerts</h4>
                  <button onClick={() => setShowNotifications(false)}><X className="w-4 h-4 text-zinc-500" /></button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <div 
                        key={n.id} 
                        onClick={() => markAsRead(n.id)}
                        className={cn(
                          "p-4 border-b border-zinc-800 hover:bg-zinc-800 transition-colors cursor-pointer relative group",
                          !n.read && "bg-primary/5 border-l-2 border-primary"
                        )}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <p className={cn(
                            "text-[10px] font-black uppercase mb-1",
                            n.type === 'critical' ? "text-red-500" : n.type === 'warning' ? "text-orange-500" : "text-primary"
                          )}>
                            {n.title}
                          </p>
                          <button 
                            onClick={(e) => deleteNotification(e, n.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-500 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-xs font-bold uppercase leading-tight">{n.message}</p>
                        <p className="text-[8px] text-zinc-600 font-headline uppercase mt-2">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <p className="text-zinc-600 font-headline uppercase text-xs">No active alerts</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={handleLogout}
            className="text-zinc-500 hover:text-primary p-2 transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>
      </header>

      <div className="flex pt-20">
        {/* Sidebar (Desktop) */}
        <aside className="hidden md:flex fixed inset-y-0 left-0 z-[60] flex-col bg-black h-full w-80 border-r-4 border-primary mt-20">
          <div className="p-8 border-b-4 border-primary">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary flex items-center justify-center overflow-hidden">
                {profile?.image ? (
                  <img src={profile.image} alt={profile.name} className="w-full h-full object-cover grayscale" />
                ) : (
                  <UserIcon className="text-black" />
                )}
              </div>
              <div>
                <p className="font-headline font-black text-primary tracking-tight text-lg uppercase truncate max-w-[160px]">
                  {profile?.name || 'MEMBER'}
                </p>
                <p className="font-headline text-xs text-zinc-500 uppercase tracking-widest">
                  {isAdmin ? 'OWNER MODE' : (isCoach ? 'COACH ACCESS' : `${profile?.tier || 'STANDARD'} ACCESS`)}
                </p>
              </div>
            </div>
          </div>
          <nav className="flex-1 py-6">
            {currentNavItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center gap-4 px-8 py-4 transition-all font-headline uppercase tracking-wider",
                  location.pathname === item.path
                    ? "bg-primary text-black font-bold"
                    : "text-white hover:bg-zinc-900 hover:pl-10"
                )}
              >
                <item.icon className="w-6 h-6" />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
          <div className="p-8">
            <div className="bg-zinc-900 p-4 border-l-2 border-primary">
              <p className="text-[10px] text-zinc-500 font-headline uppercase">System Status</p>
              <p className="text-xs text-white font-bold font-headline uppercase mt-1">Synchronized</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className={cn("flex-1 p-4 md:p-12 max-w-7xl mx-auto w-full pb-32 md:pb-12", "md:ml-80")}>
          {children}
        </main>
      </div>

      {/* Bottom Nav (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-stretch h-16 bg-black z-50 border-t-4 border-primary">
        {currentNavItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={cn(
              "flex flex-col items-center justify-center p-1 flex-1 transition-colors",
              location.pathname === item.path ? "bg-primary text-black" : "text-white hover:bg-zinc-800"
            )}
          >
            <item.icon className="w-5 h-5 mb-1" />
            <span className="font-headline text-[8px] font-bold uppercase truncate w-full text-center px-1">{item.name}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
