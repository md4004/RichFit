import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { User as UserIcon, Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Trash2, Mail, Shield, Save } from 'lucide-react';
import { db, collection, onSnapshot, query, where, doc, setDoc, updateDoc, deleteDoc, OperationType, handleFirestoreError, auth, secondaryAuth, createUserWithEmailAndPassword } from '@/firebase';
import { Coach, CoachCalendar } from '@/types';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns';

export default function AdminCoaches() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCoach, setNewCoach] = useState({ name: '', email: '', password: '' });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendar, setCalendar] = useState<CoachCalendar | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'coach'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const coachData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Coach[];
      setCoaches(coachData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedCoach) {
      setCalendar(null);
      return;
    }

    const monthStr = format(currentMonth, 'yyyy-MM');
    const calendarId = `${selectedCoach.id}_${monthStr}`;
    
    const unsubscribe = onSnapshot(doc(db, 'coach_calendars', calendarId), (snapshot) => {
      if (snapshot.exists()) {
        setCalendar(snapshot.data() as CoachCalendar);
      } else {
        setCalendar({
          id: calendarId,
          coachId: selectedCoach.id,
          month: monthStr,
          doneDays: [],
          updatedAt: new Date().toISOString()
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `coach_calendars/${calendarId}`);
    });

    return () => unsubscribe();
  }, [selectedCoach, currentMonth]);

  const handleAddCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { signOut: firebaseSignOut } = await import('firebase/auth');
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newCoach.email, newCoach.password);
      const uid = userCredential.user.uid;

      // Immediately sign out the secondary auth instance
      await firebaseSignOut(secondaryAuth);

      const coachProfile: Coach = {
        id: uid,
        uid: uid,
        name: newCoach.name,
        email: newCoach.email,
        role: 'coach',
        image: `https://picsum.photos/seed/${uid}/200/200`,
        createdAt: new Date().toISOString()
      };

      console.log("Saving coach profile:", coachProfile);
      await setDoc(doc(db, 'users', uid), coachProfile);
      
      setShowAddModal(false);
      setNewCoach({ name: '', email: '', password: '' });
      alert('Coach added successfully');
    } catch (error) {
      console.error('Error adding coach:', error);
      if (error instanceof Error) {
        try {
          const errData = JSON.parse(error.message);
          alert(`Failed to add coach: ${errData.error || error.message}`);
        } catch {
          alert(`Failed to add coach: ${error.message}`);
        }
      } else {
        alert('Failed to add coach. Check console for details.');
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = async (date: Date) => {
    if (!selectedCoach || !calendar) return;

    const dateStr = format(date, 'yyyy-MM-dd');
    const isDone = calendar.doneDays.includes(dateStr);
    const newDoneDays = isDone 
      ? calendar.doneDays.filter(d => d !== dateStr)
      : [...calendar.doneDays, dateStr];

    try {
      await setDoc(doc(db, 'coach_calendars', calendar.id), {
        ...calendar,
        doneDays: newDoneDays,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `coach_calendars/${calendar.id}`);
    }
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  return (
    <Layout isAdmin>
      <header className="mb-8">
        <h2 className="font-headline text-5xl md:text-7xl font-black uppercase tracking-tighter mb-2 leading-none">
          Coach <span className="text-primary">Command</span>
        </h2>
        <p className="font-headline text-zinc-500 tracking-widest uppercase text-sm">Operational Protocol: Coach Management & Attendance</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Coach Selection */}
        <section className="xl:col-span-3">
          <div className="mb-4 flex justify-between items-end border-b-2 border-primary pb-2">
            <h3 className="font-headline font-black uppercase text-sm text-white">Personnel</h3>
            <button 
              onClick={() => setShowAddModal(true)}
              className="text-primary hover:text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-1 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {coaches.map((coach) => (
              <div 
                key={coach.id} 
                onClick={() => setSelectedCoach(coach)}
                className={cn(
                  "p-3 flex items-center gap-3 cursor-pointer transition-all border-l-2",
                  selectedCoach?.id === coach.id 
                    ? "bg-primary text-black border-white" 
                    : "bg-zinc-900 text-white border-primary hover:bg-zinc-800"
                )}
              >
                <div className="w-10 h-10 bg-zinc-800 flex-shrink-0 overflow-hidden">
                  <img 
                    className="w-full h-full object-cover grayscale" 
                    src={coach.image} 
                    alt={coach.name}
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-headline font-bold uppercase text-xs truncate">{coach.name}</h4>
                  <p className="text-[8px] text-zinc-500 uppercase truncate">{coach.email}</p>
                </div>
              </div>
            ))}
            {coaches.length === 0 && !loading && (
              <p className="text-[10px] text-zinc-600 uppercase italic text-center py-10">No coaches deployed.</p>
            )}
          </div>
        </section>

        {/* Calendar View */}
        <section className="xl:col-span-9">
          {selectedCoach ? (
            <div className="bg-zinc-900 border-t-8 border-primary p-6 md:p-8 animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                  <h3 className="font-headline font-black uppercase text-3xl text-white">{selectedCoach.name}</h3>
                  <p className="text-primary font-headline font-bold text-[10px] uppercase tracking-widest">Attendance Protocol: {format(currentMonth, 'MMMM yyyy')}</p>
                </div>
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
                
                {/* Padding for start of month */}
                {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                  <div key={`pad-${i}`} className="aspect-square bg-zinc-950/50 border border-zinc-900/50"></div>
                ))}

                {days.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const isDone = calendar?.doneDays.includes(dateStr);
                  return (
                    <button
                      key={dateStr}
                      onClick={() => toggleDay(day)}
                      className={cn(
                        "aspect-square p-2 border-2 transition-all flex flex-col justify-between group relative overflow-hidden",
                        isDone 
                          ? "bg-primary/10 border-primary text-primary" 
                          : "bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600",
                        isToday(day) && !isDone && "border-white text-white"
                      )}
                    >
                      <span className="font-headline font-black text-xs relative z-10">{format(day, 'd')}</span>
                      <div className="flex justify-end relative z-10">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4 opacity-20 group-hover:opacity-50" />
                        )}
                      </div>
                      {isDone && (
                        <div className="absolute inset-0 bg-primary/5 animate-pulse"></div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 pt-8 border-t border-zinc-800 flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary"></div>
                  <span className="text-[10px] font-headline font-black uppercase text-zinc-400">Duty Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-black border border-zinc-800"></div>
                  <span className="text-[10px] font-headline font-black uppercase text-zinc-400">Pending / Off</span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-[10px] font-headline font-black uppercase text-zinc-500">Total Days:</span>
                  <span className="text-primary font-headline font-black text-xl">{calendar?.doneDays.length || 0}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] border-4 border-dashed border-zinc-900 flex flex-col items-center justify-center text-zinc-700">
              <UserIcon className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-headline text-xl font-black uppercase tracking-widest">Select Personnel to Review Protocol</p>
            </div>
          )}
        </section>
      </div>

      {/* Add Coach Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-zinc-900 border-t-8 border-primary p-8 w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline text-2xl font-black uppercase italic text-white">Induct Coach</h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-white">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleAddCoach} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-headline font-black uppercase text-zinc-500">Full Name</label>
                <input 
                  required
                  type="text"
                  value={newCoach.name}
                  onChange={e => setNewCoach({...newCoach, name: e.target.value})}
                  className="w-full bg-black border-2 border-zinc-800 p-3 text-white font-headline focus:border-primary outline-none"
                  placeholder="COACH NAME"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-headline font-black uppercase text-zinc-500">Email Address</label>
                <input 
                  required
                  type="email"
                  value={newCoach.email}
                  onChange={e => setNewCoach({...newCoach, email: e.target.value})}
                  className="w-full bg-black border-2 border-zinc-800 p-3 text-white font-headline focus:border-primary outline-none"
                  placeholder="EMAIL@RICHFIT.COM"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-headline font-black uppercase text-zinc-500">Security Password</label>
                <input 
                  required
                  type="password"
                  value={newCoach.password}
                  onChange={e => setNewCoach({...newCoach, password: e.target.value})}
                  className="w-full bg-black border-2 border-zinc-800 p-3 text-white font-headline focus:border-primary outline-none"
                  placeholder="••••••••"
                />
              </div>
              
              <button 
                type="submit"
                disabled={saving}
                className="w-full bg-primary text-black font-headline font-black py-4 uppercase mt-4 hover:bg-white transition-all disabled:opacity-50"
              >
                {saving ? 'Processing...' : 'Authorize Personnel'}
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
