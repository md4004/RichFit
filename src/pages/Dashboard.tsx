import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Activity, ArrowRight, Bell, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/AuthContext';
import { db, collection, onSnapshot, query, orderBy, limit, OperationType, handleFirestoreError } from '@/firebase';
import { Announcement } from '@/types';
import { ANNOUNCEMENTS as STATIC_ANNOUNCEMENTS } from '@/constants';

export default function Dashboard() {
  const { profile, user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [lastLift, setLastLift] = useState<any>(null);

  // Calculate subscription days left
  const calculateDaysLeft = () => {
    if (!profile?.subscriptionEnd) return 0;
    const end = new Date(profile.subscriptionEnd);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysLeft = calculateDaysLeft();
  const displayDays = Math.max(0, daysLeft);
  const circumference = 691; // 2 * pi * 110
  // Assume a 30-day cycle for the visual progress bar
  const percentage = Math.max(0, Math.min(100, (displayDays / 30) * 100));
  const offset = circumference - (percentage / 100) * circumference;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  useEffect(() => {
    if (!user) return;

    const path = `records/${user.uid}/logs`;
    const q = query(collection(db, 'records', user.uid, 'logs'), orderBy('date', 'desc'), limit(1));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setLastLift(snapshot.docs[0].data());
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const path = 'announcements';
    const q = query(collection(db, path), orderBy('date', 'desc'), limit(3));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      
      setAnnouncements(newsData.length > 0 ? newsData : STATIC_ANNOUNCEMENTS);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, []);

  return (
    <Layout>
      <div className="mb-12">
        <h2 className="font-headline text-5xl font-black uppercase tracking-tighter text-white mb-2 leading-none">
          MEMBER <span className="text-primary">DASHBOARD</span>
        </h2>
        <p className="font-headline text-primary font-bold uppercase tracking-widest">Performance Protocol: Active</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Column: Progress */}
        <div className="md:col-span-7 space-y-8">
          <div className="bg-surface-container-lowest p-8 border-l-8 border-primary flex flex-col items-center justify-center relative overflow-hidden">
            <span className="absolute top-4 right-6 font-headline text-zinc-800 text-6xl font-black opacity-30 select-none">01</span>
            
            <div className="relative flex items-center justify-center mb-8">
              <svg className="w-64 h-64">
                <circle className="text-zinc-900 stroke-current" cx="128" cy="128" fill="transparent" r="110" strokeWidth="12"></circle>
                <circle 
                  className="text-primary stroke-current transition-all duration-1000 ease-out" 
                  cx="128" cy="128" fill="transparent" r="110" 
                  strokeWidth="12" 
                  strokeDasharray={circumference} 
                  strokeDashoffset={offset}
                  style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                ></circle>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-headline text-7xl font-black text-white leading-none">{displayDays}</span>
                <span className="font-headline text-primary font-bold uppercase tracking-widest text-sm">Days Left</span>
              </div>
            </div>

            <div className="w-full text-center space-y-4">
              <p className="font-headline text-zinc-500 uppercase tracking-tighter">Current subscription expires on</p>
              <h3 className="font-headline text-3xl font-bold text-white uppercase tracking-tight">{formatDate(profile?.subscriptionEnd)}</h3>
              <a 
                href="https://wa.me/9613032913?text=I%20would%20like%20to%20renew%20my%20membership"
                target="_blank"
                rel="noreferrer"
                className="block w-full bg-primary hover:bg-primary-container text-black font-headline font-black py-5 uppercase tracking-widest transition-all text-xl mt-6"
              >
                Renew Membership Now
              </a>
            </div>
          </div>

          {/* Announcements Section */}
          <div className="bg-zinc-950 p-8 border-t-2 border-zinc-800">
            <h3 className="font-headline text-xl font-black uppercase text-white mb-6 flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Latest Intel
            </h3>
            <div className="space-y-6">
              {announcements.map((news) => (
                <div key={news.id} className="border-l-2 border-zinc-800 pl-4 hover:border-primary transition-colors">
                  <p className="text-[10px] text-zinc-500 font-headline font-bold uppercase mb-1">{news.date}</p>
                  <h4 className="font-headline font-bold text-white uppercase">{news.title}</h4>
                  <p className="text-zinc-400 text-xs mt-1">{news.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Status Cards */}
        <div className="md:col-span-5 space-y-6">
          <Link to="/pt" className="block bg-primary p-8 border-l-8 border-black group hover:bg-white transition-all min-h-[220px] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-8">
                <span className="font-headline text-black font-black uppercase tracking-widest text-xs">Training Protocol</span>
                <Activity className="text-black w-8 h-8" />
              </div>
              <h3 className="font-headline text-4xl font-black text-black uppercase tracking-tighter leading-tight">
                VIEW YOUR <br /> PT PROGRAM
              </h3>
            </div>
            <div className="mt-8 flex items-center gap-2 text-black font-headline font-black text-xs uppercase tracking-widest">
              <span>Access Session Intel</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
            </div>
          </Link>

          {/* Biometric Stats Card */}
          <div className="bg-zinc-950 p-6 border-l-4 border-primary">
            <h3 className="font-headline text-lg font-black uppercase text-white mb-4 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-primary" />
              My Biometric Profile
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-900/60 p-4 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 font-headline font-bold uppercase tracking-widest block">Body Weight</span>
                <span className="font-headline text-2xl font-black text-primary block mt-1">
                  {profile?.weight ? `${profile.weight} KG` : '--- KG'}
                </span>
              </div>
              <div className="bg-zinc-900/60 p-4 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 font-headline font-bold uppercase tracking-widest block">Body Height</span>
                <span className="font-headline text-2xl font-black text-white block mt-1">
                  {profile?.height ? `${profile.height} CM` : '--- CM'}
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between py-2 border-b border-zinc-950">
                <span className="text-zinc-500 uppercase font-headline">Training Focus</span>
                <span className="text-white font-bold uppercase font-headline">{profile?.focus || 'GENERAL ATHLETICS'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-950">
                <span className="text-zinc-500 uppercase font-headline">Program Access</span>
                <span className="text-primary font-bold uppercase font-headline">{profile?.tier || 'STANDARD'} ACCESS</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-zinc-500 uppercase font-headline">Gender Registered</span>
                <span className="text-white font-bold uppercase font-headline">{profile?.gender || 'NOT SPECIFIED'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Training Status */}
      <div className="mt-16 border-t-2 border-zinc-900 pt-12">
        <h4 className="font-headline text-2xl font-black uppercase text-white mb-8 flex items-center gap-4">
          Recent Activity <span className="h-1 flex-grow bg-zinc-900"></span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
          <div className="bg-zinc-950 p-6 border-b-2 md:border-b-0 md:border-r-2 border-zinc-900 hover:bg-zinc-900 transition-colors">
            <p className="font-headline text-xs text-zinc-500 mb-2 uppercase tracking-widest">Last Lift Logged</p>
            <p className="font-headline text-xl font-bold text-white">{lastLift?.exerciseName || 'No Data'}</p>
            <p className="text-primary text-sm font-bold mt-1">{lastLift?.weight ? `${lastLift.weight} KG` : '---'}</p>
          </div>
          <div className="bg-zinc-950 p-6 border-b-2 md:border-b-0 md:border-r-2 border-zinc-900 hover:bg-zinc-900 transition-colors">
            <p className="font-headline text-xs text-zinc-500 mb-2 uppercase tracking-widest">Protocol Status</p>
            <p className="font-headline text-xl font-bold text-white">Active</p>
            <p className="text-zinc-500 text-sm font-bold mt-1">Synchronized</p>
          </div>
          <div className="bg-zinc-950 p-6 hover:bg-zinc-900 transition-colors">
            <p className="font-headline text-xs text-zinc-500 mb-2 uppercase tracking-widest">Next Scheduled</p>
            <p className="font-headline text-xl font-bold text-white">PT Assessment</p>
            <p className="text-zinc-500 text-sm font-bold mt-1">Tomorrow, 08:00 AM</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
