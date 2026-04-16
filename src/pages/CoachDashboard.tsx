import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Activity, Shield, Clock } from 'lucide-react';
import { db, doc, onSnapshot, OperationType, handleFirestoreError } from '@/firebase';
import { useAuth } from '@/AuthContext';
import { CoachCalendar } from '@/types';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns';

export default function CoachDashboard() {
  const { user, profile } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendar, setCalendar] = useState<CoachCalendar | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const monthStr = format(currentMonth, 'yyyy-MM');
    const calendarId = `${user.uid}_${monthStr}`;
    
    const unsubscribe = onSnapshot(doc(db, 'coach_calendars', calendarId), (snapshot) => {
      if (snapshot.exists()) {
        setCalendar(snapshot.data() as CoachCalendar);
      } else {
        setCalendar({
          id: calendarId,
          coachId: user.uid,
          month: monthStr,
          doneDays: [],
          updatedAt: new Date().toISOString()
        });
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `coach_calendars/${calendarId}`);
    });

    return () => unsubscribe();
  }, [user, currentMonth]);

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  return (
    <Layout>
      <header className="mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="font-headline text-primary text-sm font-bold tracking-[0.2em] uppercase">Coach Interface</span>
            <h2 className="font-headline text-5xl md:text-7xl font-black uppercase leading-none tracking-tighter mt-2">Duty<br />Calendar</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
            <div className="bg-zinc-900 p-4 border-l-4 border-primary">
              <p className="font-headline text-[10px] text-zinc-500 uppercase tracking-widest">Status</p>
              <p className="font-headline text-xl font-black uppercase text-white">Active Duty</p>
            </div>
            <div className="bg-zinc-900 p-4 border-l-4 border-primary">
              <p className="font-headline text-[10px] text-zinc-500 uppercase tracking-widest">Completed</p>
              <p className="font-headline text-xl font-black uppercase text-white">{calendar?.doneDays.length || 0} Days</p>
            </div>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <div className="bg-zinc-900 border-t-8 border-primary p-6 md:p-8">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-headline font-black uppercase text-2xl text-white">Attendance Protocol</h3>
              <div className="flex items-center gap-4 bg-black p-2 border border-zinc-800">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:text-primary transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-headline font-black uppercase text-xs w-32 text-center">{format(currentMonth, 'MMM yyyy')}</span>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:text-primary transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center py-2 font-headline font-black text-[10px] text-zinc-600 uppercase">{d}</div>
              ))}
              
              {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                <div key={`pad-${i}`} className="aspect-square bg-zinc-950/50 border border-zinc-900/50"></div>
              ))}

              {days.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const isDone = calendar?.doneDays.includes(dateStr);
                return (
                  <div
                    key={dateStr}
                    className={cn(
                      "aspect-square p-2 border-2 transition-all flex flex-col justify-between relative overflow-hidden",
                      isDone 
                        ? "bg-primary/10 border-primary text-primary" 
                        : "bg-black border-zinc-800 text-zinc-500",
                      isToday(day) && !isDone && "border-white text-white"
                    )}
                  >
                    <span className="font-headline font-black text-xs relative z-10">{format(day, 'd')}</span>
                    <div className="flex justify-end relative z-10">
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4 opacity-10" />
                      )}
                    </div>
                    {isDone && (
                      <div className="absolute inset-0 bg-primary/5 animate-pulse"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-primary p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-black" />
              <h5 className="font-headline text-black font-black text-xl uppercase leading-none">Command Directives</h5>
            </div>
            <p className="text-black font-medium text-sm border-l-2 border-black pl-3 mb-6">
              "Attendance is verified by the facility owner. Ensure all sessions are logged and equipment is sanitized after use."
            </p>
            <div className="bg-black/10 p-4 rounded border border-black/20">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-black" />
                <span className="text-[10px] font-headline font-black uppercase text-black">Next Review</span>
              </div>
              <p className="text-black font-black text-sm uppercase">End of {format(currentMonth, 'MMMM')}</p>
            </div>
          </div>

          <div className="bg-zinc-900 p-6 border-l-4 border-primary">
            <h5 className="font-headline text-lg font-black uppercase mb-4">Personnel Profile</h5>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-black border-2 border-zinc-800 overflow-hidden">
                <img 
                  src={profile?.image || `https://picsum.photos/seed/${user?.uid}/200/200`} 
                  alt={profile?.name} 
                  className="w-full h-full object-cover grayscale"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <p className="font-headline font-black uppercase text-white">{profile?.name}</p>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">{profile?.role}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-headline font-black uppercase border-b border-zinc-800 pb-2">
                <span className="text-zinc-500">Email</span>
                <span className="text-white">{profile?.email}</span>
              </div>
              <div className="flex justify-between text-[10px] font-headline font-black uppercase border-b border-zinc-800 pb-2">
                <span className="text-zinc-500">Joined</span>
                <span className="text-white">{profile?.createdAt ? format(new Date(profile.createdAt), 'dd MMM yyyy') : 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
