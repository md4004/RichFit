import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { 
  PlayCircle, 
  MessageSquare, 
  TrendingUp, 
  History, 
  Activity, 
  ArrowRight, 
  Dumbbell, 
  CheckCircle2, 
  Save, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Search,
  Filter,
  Trophy,
  Plus,
  Trash2,
  X,
  Video,
  Upload,
  Eye,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { triggerHaptic, requestScreenWakeLock, releaseScreenWakeLock } from '@/lib/androidFramework';
import { 
  db, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  OperationType, 
  handleFirestoreError, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  getDocs,
  storage,
  ref,
  uploadBytes,
  getDownloadURL
} from '@/firebase';
import { useAuth } from '@/AuthContext';
import { Exercise, WorkoutCalendar, UserLog } from '@/types';
import { EXERCISES } from '@/constants';
import ExerciseSelector from '@/components/ExerciseSelector';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths, 
  isToday,
  startOfWeek,
  endOfWeek,
  addDays,
  parseISO,
  isBefore,
  subDays
} from 'date-fns';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function UserPT() {
  const { user, profile } = useAuth();
  const [calendar, setCalendar] = useState<WorkoutCalendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentLog, setCurrentLog] = useState<UserLog | null>(null);
  const [previousLog, setPreviousLog] = useState<UserLog | null>(null);
  const [saving, setSaving] = useState(false);
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [allLogs, setAllLogs] = useState<UserLog[]>([]);
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<WorkoutCalendar | null>(null);
  const [selectedDayForRoutine, setSelectedDayForRoutine] = useState<string>('Monday');
  const [videoUploading, setVideoUploading] = useState<string | null>(null);

  // Screen Wake Lock auto-acquisition for continuous active gym visual tracking
  useEffect(() => {
    let active = false;
    const initWakeLock = async () => {
      const enabled = localStorage.getItem('android_wake_lock_enabled') === 'true';
      if (enabled) {
        active = await requestScreenWakeLock();
      }
    };
    initWakeLock();

    return () => {
      if (active) {
        releaseScreenWakeLock();
      }
    };
  }, []);

  // Fetch Weekly Schedule (Protocol)
  useEffect(() => {
    if (!user) return;
    const path = `calendars/${user.uid}`;
    const unsubscribe = onSnapshot(doc(db, 'calendars', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as WorkoutCalendar;
        setCalendar(data);
        setEditingSchedule(data);
      } else {
        const initialSchedule: WorkoutCalendar = {
          id: user.uid,
          userId: user.uid,
          schedule: {
            'Monday': [], 'Tuesday': [], 'Wednesday': [], 'Thursday': [], 'Friday': [], 'Saturday': [], 'Sunday': []
          },
          updatedAt: new Date().toISOString()
        };
        setCalendar(initialSchedule);
        setEditingSchedule(initialSchedule);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch Log for Selected Date
  useEffect(() => {
    if (!user) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const path = `user_logs/${user.uid}/entries/${dateStr}`;
    
    const unsubscribe = onSnapshot(doc(db, 'user_logs', user.uid, 'entries', dateStr), (snapshot) => {
      if (snapshot.exists()) {
        setCurrentLog(snapshot.data() as UserLog);
      } else {
        setCurrentLog(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    // Fetch previous log for comparison (last time this day of week was logged or just previous entry)
    const fetchPrevious = async () => {
      const q = query(
        collection(db, 'user_logs', user.uid, 'entries'),
        where('date', '<', dateStr),
        orderBy('date', 'desc'),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setPreviousLog(snap.docs[0].data() as UserLog);
      } else {
        setPreviousLog(null);
      }
    };
    fetchPrevious();

    return () => unsubscribe();
  }, [user, selectedDate]);

  // Fetch Recent Records for Sidebar
  useEffect(() => {
    if (!user) return;
    const path = `records/${user.uid}/logs`;
    const q = query(collection(db, 'records', user.uid, 'logs'), orderBy('date', 'desc'), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRecentRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch All Logs for History/Search
  useEffect(() => {
    if (!user || !showHistory) return;
    const q = query(collection(db, 'user_logs', user.uid, 'entries'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAllLogs(snapshot.docs.map(doc => doc.data() as UserLog));
    });
    return () => unsubscribe();
  }, [user, showHistory]);

  const handleSetChange = (exerciseName: string, setIndex: number, field: 'weight' | 'reps', value: string) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const numValue = parseFloat(value) || 0;

    setCurrentLog(prev => {
      const newLog: UserLog = prev || {
        id: dateStr,
        userId: user!.uid,
        date: dateStr,
        exercises: [],
        updatedAt: new Date().toISOString()
      };

      const exerciseIdx = newLog.exercises.findIndex(e => e.name === exerciseName);
      if (exerciseIdx === -1) {
        newLog.exercises.push({
          name: exerciseName,
          sets: Array.from({ length: setIndex + 1 }).map((_, i) => ({
            setNumber: i + 1,
            weight: i === setIndex ? numValue : 0,
            reps: 0
          }))
        });
      } else {
        const sets = [...newLog.exercises[exerciseIdx].sets];
        if (!sets[setIndex]) {
          sets[setIndex] = { setNumber: setIndex + 1, weight: 0, reps: 0 };
        }
        sets[setIndex] = { ...sets[setIndex], [field]: numValue };
        newLog.exercises[exerciseIdx].sets = sets;
      }

      return { ...newLog, updatedAt: new Date().toISOString() };
    });
  };

  const saveLog = async () => {
    if (!user || !currentLog) return;
    setSaving(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      await setDoc(doc(db, 'user_logs', user.uid, 'entries', dateStr), currentLog);

      // Also update Personal Records with the best set for each exercise
      for (const ex of currentLog.exercises) {
        const bestSet = [...ex.sets].sort((a, b) => b.weight - a.weight)[0];
        if (bestSet && bestSet.weight > 0) {
          const recordRef = doc(collection(db, 'records', user.uid, 'logs'));
          await setDoc(recordRef, {
            exerciseName: ex.name,
            weight: bestSet.weight,
            reps: bestSet.reps,
            videoUrl: ex.videoUrl || null,
            date: new Date().toISOString(),
            day: format(selectedDate, 'EEEE')
          });

          // Update Global Leaderboard (Only if better or equal with new video)
          const leaderboardId = `${ex.name.replace(/\s+/g, '_').toLowerCase()}_${user.uid}`;
          const currentEntrySnap = await getDoc(doc(db, 'leaderboard', leaderboardId));
          const currentEntry = currentEntrySnap.exists() ? currentEntrySnap.data() : null;
          
          if (!currentEntry || bestSet.weight > currentEntry.weight || (bestSet.weight === currentEntry.weight && (bestSet.reps || 0) >= (currentEntry.reps || 0))) {
            await setDoc(doc(db, 'leaderboard', leaderboardId), {
              userId: user.uid,
              userName: profile?.name || 'Anonymous Member',
              userImage: profile?.image || null,
              gender: profile?.gender || 'Male',
              exerciseName: ex.name,
              weight: bestSet.weight,
              reps: bestSet.reps,
              videoUrl: ex.videoUrl || currentEntry?.videoUrl || null,
              date: new Date().toISOString()
            }, { merge: true });
          }
        }
      }

      triggerHaptic([100, 50, 100]);
      alert('Protocol logged successfully.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `user_logs/${user.uid}/entries/${currentLog.date}`);
    } finally {
      setSaving(false);
    }
  };

  const saveRoutine = async () => {
    if (!user || !editingSchedule) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'calendars', user.uid), {
        ...editingSchedule,
        updatedAt: new Date().toISOString()
      });
      setShowRoutineModal(false);
      alert('Routine updated successfully.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `calendars/${user.uid}`);
    } finally {
      setSaving(false);
    }
  };

  const addExerciseToRoutine = () => {
    if (!editingSchedule) return;
    const newExercise: Exercise = { name: EXERCISES[0].name, sets: '3', reps: '10' };
    setEditingSchedule(prev => {
      if (!prev) return null;
      const daySchedule = [...(prev.schedule[selectedDayForRoutine] || [])];
      return {
        ...prev,
        schedule: {
          ...prev.schedule,
          [selectedDayForRoutine]: [...daySchedule, newExercise]
        }
      };
    });
  };

  const removeExerciseFromRoutine = (index: number) => {
    setEditingSchedule(prev => {
      if (!prev) return null;
      const daySchedule = [...(prev.schedule[selectedDayForRoutine] || [])];
      daySchedule.splice(index, 1);
      return {
        ...prev,
        schedule: {
          ...prev.schedule,
          [selectedDayForRoutine]: daySchedule
        }
      };
    });
  };

  const updateRoutineExercise = (index: number, field: keyof Exercise, value: string) => {
    setEditingSchedule(prev => {
      if (!prev) return null;
      const daySchedule = [...(prev.schedule[selectedDayForRoutine] || [])];
      daySchedule[index] = { ...daySchedule[index], [field]: value };
      return {
        ...prev,
        schedule: {
          ...prev.schedule,
          [selectedDayForRoutine]: daySchedule
        }
      };
    });
  };

  const handleVideoUpload = async (exerciseName: string, file: File) => {
    if (!user) return;
    
    if (file.size > 50 * 1024 * 1024) {
      alert("Video session too large. Maximum size is 50MB.");
      return;
    }

    setVideoUploading(exerciseName);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const storageRef = ref(storage, `users/${user.uid}/videos/${dateStr}_${exerciseName.replace(/\s+/g, '_')}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      setCurrentLog(prev => {
        const newLog: UserLog = prev || {
          id: dateStr,
          userId: user.uid,
          date: dateStr,
          exercises: [],
          updatedAt: new Date().toISOString()
        };

        const exerciseIdx = newLog.exercises.findIndex(e => e.name === exerciseName);
        if (exerciseIdx === -1) {
          newLog.exercises.push({
            name: exerciseName,
            sets: [],
            videoUrl: url
          });
        } else {
          newLog.exercises[exerciseIdx] = { ...newLog.exercises[exerciseIdx], videoUrl: url };
        }

        return { ...newLog, updatedAt: new Date().toISOString() };
      });

      alert('Execution intel uploaded successfully.');
    } catch (error) {
      console.error('Video upload error:', error);
      alert('Video upload failed. Check tactical connectivity.');
    } finally {
      setVideoUploading(null);
    }
  };

  const monthDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const selectedDayName = format(selectedDate, 'EEEE');
  const protocolExercises = calendar?.schedule[selectedDayName] || [];

  const filteredLogs = allLogs.filter(log => 
    log.date.includes(searchQuery) || 
    log.exercises.some(ex => ex.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Layout>
      <header className="mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="font-headline text-primary text-sm font-bold tracking-[0.2em] uppercase">Tactical Performance Log</span>
            <h2 className="font-headline text-5xl md:text-7xl font-black uppercase leading-none tracking-tighter mt-2">
              Combat<br />Journal
            </h2>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setShowRoutineModal(true)}
              className="px-6 py-3 bg-primary text-black font-headline font-black uppercase text-xs tracking-widest transition-all flex items-center gap-2 hover:bg-white"
            >
              <Plus className="w-4 h-4" />
              Create Workout Routine
            </button>
            <Link 
              to="/leaderboard"
              className="px-6 py-3 bg-zinc-900 text-white border border-zinc-800 hover:border-primary font-headline font-black uppercase text-xs tracking-widest transition-all flex items-center gap-2"
            >
              <Trophy className="w-4 h-4 text-primary" />
              Leaderboard
            </Link>
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                "px-6 py-3 font-headline font-black uppercase text-xs tracking-widest transition-all flex items-center gap-2",
                showHistory ? "bg-primary text-black" : "bg-zinc-900 text-white border border-zinc-800 hover:border-primary"
              )}
            >
              {showHistory ? <Activity className="w-4 h-4" /> : <History className="w-4 h-4" />}
              {showHistory ? "Current Protocol" : "Mission History"}
            </button>
          </div>
        </div>
      </header>

      {/* Routine Modal */}
      {showRoutineModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-zinc-900 border-2 border-primary w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-black">
              <h3 className="font-headline text-2xl font-black uppercase italic text-primary flex items-center gap-3">
                <Dumbbell className="w-6 h-6" />
                Configure Routine
              </h3>
              <button onClick={() => setShowRoutineModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-8">
              <div className="grid grid-cols-7 gap-2">
                {DAYS_OF_WEEK.map(day => (
                  <button
                    key={day}
                    onClick={() => setSelectedDayForRoutine(day)}
                    className={cn(
                      "py-3 text-[10px] font-headline font-black uppercase transition-all border",
                      selectedDayForRoutine === day 
                        ? "bg-primary text-black border-primary" 
                        : "bg-black text-zinc-500 border-zinc-800 hover:border-zinc-600"
                    )}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-headline font-black uppercase text-sm tracking-widest text-zinc-400">
                    {selectedDayForRoutine} Exercises
                  </h4>
                  <button 
                    onClick={addExerciseToRoutine}
                    className="flex items-center gap-2 text-primary hover:text-white transition-colors font-headline text-[10px] font-black uppercase"
                  >
                    <Plus className="w-4 h-4" />
                    Add Exercise
                  </button>
                </div>

                <div className="space-y-3">
                  {(editingSchedule?.schedule[selectedDayForRoutine] || []).map((ex, idx) => (
                    <div key={idx} className="bg-black border border-zinc-800 p-4 flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <label className="block text-[8px] text-zinc-600 font-black uppercase mb-1">Exercise</label>
                        <ExerciseSelector
                          value={ex.name}
                          onChange={(val) => updateRoutineExercise(idx, 'name', val)}
                          className="w-full"
                        />
                      </div>
                      <div className="w-24">
                        <label className="block text-[8px] text-zinc-600 font-black uppercase mb-1">Sets</label>
                        <input
                          type="text"
                          value={ex.sets}
                          onChange={(e) => updateRoutineExercise(idx, 'sets', e.target.value)}
                          className="w-full bg-zinc-900 border-none text-white font-headline text-xs p-2 focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="w-24">
                        <label className="block text-[8px] text-zinc-600 font-black uppercase mb-1">Reps</label>
                        <input
                          type="text"
                          value={ex.reps || ''}
                          onChange={(e) => updateRoutineExercise(idx, 'reps', e.target.value)}
                          className="w-full bg-zinc-900 border-none text-white font-headline text-xs p-2 focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="flex items-end">
                        <button 
                          onClick={() => removeExerciseFromRoutine(idx)}
                          className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(editingSchedule?.schedule[selectedDayForRoutine] || []).length === 0 && (
                    <div className="py-12 border-2 border-dashed border-zinc-800 text-center">
                      <p className="text-zinc-600 font-headline text-[10px] font-black uppercase tracking-widest italic">
                        Rest Day - No Exercises Configured
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-black border-t border-zinc-800 flex justify-end gap-4">
              <button 
                onClick={() => setShowRoutineModal(false)}
                className="px-6 py-2 text-zinc-500 font-headline font-black uppercase text-xs tracking-widest hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={saveRoutine}
                disabled={saving}
                className="px-8 py-2 bg-primary text-black font-headline font-black uppercase text-xs tracking-widest hover:bg-white transition-all disabled:opacity-50"
              >
                {saving ? 'Synchronizing...' : 'Save Routine'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistory ? (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-zinc-900 border-t-8 border-primary p-8 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
              <h3 className="font-headline text-3xl font-black uppercase italic text-white flex items-center gap-3">
                <History className="text-primary" />
                Historical Records
              </h3>
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="SEARCH BY DATE OR LIFT..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black border-2 border-zinc-800 p-4 pl-12 text-white font-headline text-xs focus:border-primary outline-none uppercase tracking-widest"
                />
              </div>
            </div>

            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <div key={log.date} className="bg-black border border-zinc-800 p-6 hover:border-primary transition-all group">
                  <div className="flex justify-between items-center mb-4 border-b border-zinc-900 pb-4">
                    <span className="font-headline font-black text-primary uppercase tracking-widest">{format(parseISO(log.date), 'MMMM dd, yyyy')}</span>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">{format(parseISO(log.date), 'EEEE')}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {log.exercises.map((ex, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-headline font-bold text-white uppercase text-xs italic">{ex.name}</h4>
                          {ex.videoUrl && (
                            <a 
                              href={ex.videoUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-primary hover:text-white transition-colors"
                            >
                              <Video className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {ex.sets.map((s, si) => (
                            <div key={si} className="bg-zinc-900 px-2 py-1 border border-zinc-800">
                              <span className="text-[8px] text-zinc-500 block uppercase">Set {s.setNumber}</span>
                              <span className="text-xs font-black text-primary">{s.weight}KG</span>
                              {s.reps ? <span className="text-[10px] text-white ml-1">x{s.reps}</span> : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {filteredLogs.length === 0 && (
                <div className="py-20 text-center text-zinc-600 uppercase font-headline tracking-widest italic">
                  No mission records found matching your criteria.
                </div>
              )}
            </div>
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Calendar & Protocol */}
          <div className="lg:col-span-8 space-y-8">
            {/* Monthly Calendar */}
            <section className="bg-zinc-900 border-t-8 border-primary p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-headline font-black uppercase text-xl text-white flex items-center gap-2">
                  <CalendarIcon className="text-primary w-5 h-5" />
                  Deployment Schedule
                </h3>
                <div className="flex items-center gap-4 bg-black p-2 border border-zinc-800">
                  <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:text-primary transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-headline font-black uppercase text-[10px] w-24 text-center">{format(currentMonth, 'MMM yyyy')}</span>
                  <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:text-primary transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={`${d}-${i}`} className="text-center py-2 font-headline font-black text-[10px] text-zinc-600 uppercase">{d}</div>
                ))}
                
                {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                  <div key={`pad-${i}`} className="aspect-square bg-zinc-950/50 border border-zinc-900/50"></div>
                ))}

                {monthDays.map((day) => {
                  const isSelected = isSameDay(day, selectedDate);
                  const hasLog = false; // We could fetch this info but for now just highlight selected
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "aspect-square p-1 border transition-all flex flex-col items-center justify-center group relative",
                        isSelected 
                          ? "bg-primary border-white text-black" 
                          : "bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600",
                        isToday(day) && !isSelected && "border-primary text-primary"
                      )}
                    >
                      <span className="font-headline font-black text-[10px]">{format(day, 'd')}</span>
                      {isToday(day) && <div className="absolute top-1 right-1 w-1 h-1 bg-primary rounded-full"></div>}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Selected Day Protocol */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-headline text-3xl font-black uppercase tracking-tight flex items-center gap-3 text-white">
                  <Activity className="text-primary w-8 h-8" />
                  {format(selectedDate, 'EEEE')} Protocol
                </h3>
                <button 
                  onClick={saveLog}
                  disabled={saving || !currentLog}
                  className="bg-primary text-black px-6 py-2 font-headline font-black uppercase text-xs tracking-widest hover:bg-white transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "SAVING..." : "LOG MISSION"}
                </button>
              </div>

              {protocolExercises.length > 0 ? (
                <div className="space-y-4">
                  {protocolExercises.map((ex, idx) => {
                    const logEx = currentLog?.exercises.find(e => e.name === ex.name);
                    const prevEx = previousLog?.exercises.find(e => e.name === ex.name);
                    const numSets = parseInt(ex.sets) || 1;

                    return (
                      <div key={idx} className="bg-zinc-900 border-l-4 border-primary p-6 relative overflow-hidden group">
                        <div className="flex flex-col gap-6 relative z-10">
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div>
                              <h4 className="font-headline text-2xl font-black uppercase italic text-white">{ex.name}</h4>
                              <div className="flex gap-4 mt-1">
                                <p className="font-headline text-[10px] text-primary uppercase font-bold">{ex.sets} Sets Assigned</p>
                                <p className="font-headline text-[10px] text-primary uppercase font-bold">{ex.reps} Target Reps</p>
                              </div>
                            </div>
                            <div className="flex gap-4">
                              <a 
                                href={EXERCISES.find(e => e.name === ex.name)?.video} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center gap-2 text-zinc-500 hover:text-primary transition-all font-headline font-black uppercase text-[10px]"
                              >
                                <PlayCircle className="w-4 h-4" />
                                Form Guide
                              </a>

                              <label className="flex items-center gap-2 text-zinc-500 hover:text-primary transition-all font-headline font-black uppercase text-[10px] cursor-pointer">
                                {videoUploading === ex.name ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : logEx?.videoUrl ? (
                                  <CheckCircle2 className="w-4 h-4 text-primary" />
                                ) : (
                                  <Upload className="w-4 h-4" />
                                )}
                                {videoUploading === ex.name ? "UPLOADING..." : logEx?.videoUrl ? "INTEL LOGGED" : "UPLOAD EXECUTION"}
                                <input 
                                  type="file" 
                                  accept="video/*" 
                                  className="hidden" 
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleVideoUpload(ex.name, file);
                                  }}
                                />
                              </label>

                              {logEx?.videoUrl && (
                                <a 
                                  href={logEx.videoUrl} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="flex items-center gap-2 text-primary hover:text-white transition-all font-headline font-black uppercase text-[10px]"
                                >
                                  <Eye className="w-4 h-4" />
                                  VIEW CLIP
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Sets Logging Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {Array.from({ length: numSets }).map((_, sIdx) => {
                              const setData = logEx?.sets[sIdx];
                              const prevSetData = prevEx?.sets[sIdx];
                              
                              return (
                                <div key={sIdx} className="bg-black border border-zinc-800 p-3 space-y-3">
                                  <div className="flex justify-between items-center">
                                    <span className="font-headline font-black text-[10px] text-zinc-500 uppercase tracking-widest">Set {sIdx + 1}</span>
                                    {prevSetData && (
                                      <span className="text-[8px] text-primary font-bold uppercase">Prev: {prevSetData.weight}KG</span>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <div className="flex-1">
                                      <label className="text-[8px] text-zinc-600 font-black uppercase block mb-1">Weight</label>
                                      <input 
                                        type="number" 
                                        placeholder="0"
                                        value={setData?.weight || ''}
                                        onChange={(e) => handleSetChange(ex.name, sIdx, 'weight', e.target.value)}
                                        className="w-full bg-zinc-900 border-0 border-b border-zinc-700 text-white font-headline text-sm p-1 focus:border-primary outline-none"
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <label className="text-[8px] text-zinc-600 font-black uppercase block mb-1">Reps</label>
                                      <input 
                                        type="number" 
                                        placeholder="0"
                                        value={setData?.reps || ''}
                                        onChange={(e) => handleSetChange(ex.name, sIdx, 'reps', e.target.value)}
                                        className="w-full bg-zinc-900 border-0 border-b border-zinc-700 text-white font-headline text-sm p-1 focus:border-primary outline-none"
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-20 border-4 border-dashed border-zinc-900 flex flex-col items-center justify-center text-zinc-700">
                  <Dumbbell className="w-16 h-16 mb-4 opacity-20" />
                  <p className="font-headline text-xl font-black uppercase tracking-widest">Rest Day</p>
                  <p className="text-xs uppercase font-bold mt-2">No tactical protocol assigned for {format(selectedDate, 'EEEE')}</p>
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Intelligence & Records */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-primary p-6">
              <h5 className="font-headline text-black font-black text-xl uppercase leading-none mb-4">Tactical Intelligence</h5>
              <div className="space-y-4">
                <div className="bg-black/10 p-3 border-l-2 border-black">
                  <p className="text-black font-bold text-[10px] uppercase tracking-widest mb-1">Last Deployment</p>
                  <p className="text-black font-black text-sm uppercase">
                    {previousLog ? format(parseISO(previousLog.date), 'MMM dd, yyyy') : 'NO PREVIOUS DATA'}
                  </p>
                </div>
                <p className="text-black font-medium text-xs italic">
                  "Compare your current weight with last week's performance. Aim for progressive overload."
                </p>
              </div>
            </div>

            <div className="bg-zinc-900 p-6 border-l-4 border-primary">
              <div className="flex justify-between items-center mb-6">
                <h5 className="font-headline text-lg font-black uppercase flex items-center gap-2">
                  <Trophy className="text-primary w-5 h-5" />
                  Personal Records
                </h5>
                <Link to="/records" className="text-[10px] text-primary font-black uppercase hover:underline">Full Intel</Link>
              </div>
              <div className="space-y-4">
                {recentRecords.length > 0 ? (
                  recentRecords.map((record) => (
                    <div key={record.id} className="flex justify-between items-end border-b border-zinc-800 pb-3 group">
                      <div>
                        <p className="font-headline text-[10px] text-zinc-500 uppercase group-hover:text-primary transition-colors">{record.exerciseName}</p>
                        <p className="font-headline font-black text-white text-lg">{record.weight} <span className="text-[10px] text-zinc-500">KG</span></p>
                      </div>
                      <div className="text-right">
                        <span className="font-headline font-black text-[8px] text-zinc-600 uppercase block">
                          {format(parseISO(record.date), 'MMM dd')}
                        </span>
                        {record.reps && <span className="text-[10px] text-primary font-bold">x{record.reps}</span>}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-zinc-500 uppercase italic text-center py-4">No records logged yet.</p>
                )}
              </div>
            </div>

            <div className="bg-zinc-900 p-6 border-l-4 border-primary">
              <h5 className="font-headline text-lg font-black uppercase mb-4">Directives</h5>
              <a 
                href="https://wa.me/9613032913?text=I%20have%20a%20question%20about%20my%20PT%20program"
                target="_blank"
                rel="noreferrer"
                className="block w-full bg-black text-white py-4 font-headline font-black uppercase tracking-widest hover:bg-primary hover:text-black transition-all flex items-center justify-center gap-3 border border-zinc-800"
              >
                <MessageSquare className="w-5 h-5" />
                Contact Command
              </a>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
