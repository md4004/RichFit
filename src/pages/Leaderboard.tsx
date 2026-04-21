import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Trophy, Medal, Crown, Activity, Search, ChevronRight, TrendingUp, Trash2, Edit2, Save, X, Plus } from 'lucide-react';
import { db, collection, onSnapshot, query, orderBy, limit, doc, deleteDoc, updateDoc, OperationType, handleFirestoreError, setDoc, getDocs } from '@/firebase';
import { cn } from '@/lib/utils';
import { useAuth } from '@/AuthContext';
import { Member } from '@/types';

interface LeaderboardEntry {
  id: string;
  userId: string;
  userName: string;
  userImage: string | null;
  gender?: 'Male' | 'Female';
  exerciseName: string;
  weight: number;
  reps?: number;
  date: string;
}

const DEFAULT_EXERCISES = ['Deadlift', 'Bench Press', 'Squats', 'Shoulder Press'];

export default function Leaderboard() {
  const { isAdmin } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<string>('All');
  const [selectedGender, setSelectedGender] = useState<'Male' | 'Female'>('Male');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<{ weight: number; reps: number }>({ weight: 0, reps: 0 });
  
  const [isAdding, setIsAdding] = useState(false);
  const [newEntry, setNewEntry] = useState({
    userId: '',
    exerciseName: DEFAULT_EXERCISES[0],
    weight: 0,
    reps: 0,
    gender: 'Male' as 'Male' | 'Female'
  });

  useEffect(() => {
    const q = query(collection(db, 'leaderboard'), orderBy('weight', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as LeaderboardEntry));
      setEntries(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      const q = query(collection(db, 'users'));
      getDocs(q).then(snapshot => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
        setMembers(data.filter(m => m.role !== 'admin'));
      });
    }
  }, [isAdmin]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this entry from the leaderboard?')) return;
    try {
      await deleteDoc(doc(db, 'leaderboard', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `leaderboard/${id}`);
    }
  };

  const handleEdit = (entry: LeaderboardEntry) => {
    setEditingId(entry.id);
    setEditValue({ weight: entry.weight, reps: entry.reps || 0 });
  };

  const handleSave = async (id: string) => {
    try {
      await updateDoc(doc(db, 'leaderboard', id), {
        weight: editValue.weight,
        reps: editValue.reps
      });
      setEditingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `leaderboard/${id}`);
    }
  };

  const handleAddEntry = async () => {
    if (!newEntry.userId || !newEntry.exerciseName || newEntry.weight <= 0) {
      alert('Please fill in all tactical data.');
      return;
    }

    const member = members.find(m => m.id === newEntry.userId);
    if (!member) return;

    try {
      const entryId = `${newEntry.exerciseName.replace(/\s+/g, '_').toLowerCase()}_${newEntry.userId}`;
      await setDoc(doc(db, 'leaderboard', entryId), {
        userId: newEntry.userId,
        userName: member.name,
        userImage: member.image || null,
        gender: member.gender || newEntry.gender,
        exerciseName: newEntry.exerciseName,
        weight: newEntry.weight,
        reps: newEntry.reps,
        date: new Date().toISOString()
      }, { merge: true });
      
      setIsAdding(false);
      setNewEntry({
        userId: '',
        exerciseName: DEFAULT_EXERCISES[0],
        weight: 0,
        reps: 0,
        gender: 'Male'
      });
      alert('Manual induction complete.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'leaderboard');
    }
  };

  // Filter entries by gender
  const genderFilteredEntries = entries.filter(e => {
    // If gender is missing in entry (old entries), default to Male or match nothing if needed
    // But better to assume Male for old ones or just show them in Male section
    return (e.gender || 'Male') === selectedGender;
  });

  const exercises = ['All', ...Array.from(new Set([
    ...DEFAULT_EXERCISES,
    ...genderFilteredEntries.map(e => e.exerciseName)
  ]))];

  // Group entries by exercise
  const groupedEntries = genderFilteredEntries.reduce((acc: Record<string, LeaderboardEntry[]>, entry) => {
    if (!acc[entry.exerciseName]) {
      acc[entry.exerciseName] = [];
    }
    acc[entry.exerciseName].push(entry);
    return acc;
  }, {});

  // Ensure default exercises are shown even if empty
  DEFAULT_EXERCISES.forEach(ex => {
    if (!groupedEntries[ex]) groupedEntries[ex] = [];
  });

  // Sort each group by weight desc
  Object.keys(groupedEntries).forEach(ex => {
    groupedEntries[ex].sort((a, b) => b.weight - a.weight);
  });

  const filteredGroups = Object.keys(groupedEntries)
    .filter(ex => selectedExercise === 'All' || ex === selectedExercise)
    .filter(ex => DEFAULT_EXERCISES.includes(ex) || groupedEntries[ex].length > 0) // Only show default ones or those with entries
    .filter(ex => 
      ex.toLowerCase().includes(searchQuery.toLowerCase()) || 
      groupedEntries[ex].some(e => e.userName.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  return (
    <Layout>
      <header className="mb-12 flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <span className="font-headline text-primary text-sm font-bold tracking-[0.2em] uppercase">Global Rankings</span>
          <h2 className="font-headline text-5xl md:text-7xl font-black uppercase leading-none tracking-tighter mt-2">
            Strength<br />Leaderboard
          </h2>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-primary text-black font-headline font-black px-6 py-3 uppercase flex items-center gap-2 hover:bg-white transition-all active:scale-95 text-sm"
          >
            <Plus className="w-5 h-5" />
            Add Record
          </button>
        )}
      </header>

      {/* Gender Toggles */}
      <div className="flex justify-center mb-16">
        <div className="flex bg-black border-2 border-zinc-800 p-1">
          <button 
            onClick={() => setSelectedGender('Male')}
            className={cn(
              "px-12 py-3 font-headline font-black uppercase text-sm tracking-widest transition-all",
              selectedGender === 'Male' ? "bg-primary text-black" : "text-zinc-500 hover:text-white"
            )}
          >
            Men
          </button>
          <button 
            onClick={() => setSelectedGender('Female')}
            className={cn(
              "px-12 py-3 font-headline font-black uppercase text-sm tracking-widest transition-all",
              selectedGender === 'Female' ? "bg-primary text-black" : "text-zinc-500 hover:text-white"
            )}
          >
            Women
          </button>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10 bg-zinc-900 p-6 border-l-4 border-primary">
        <h3 className="font-headline text-3xl font-black uppercase italic text-white flex items-center gap-3">
          <TrendingUp className="text-primary" />
          Lift Rankings
        </h3>
        
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <input 
              type="text" 
              placeholder="SEARCH ATHLETE OR LIFT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-black border-2 border-zinc-800 p-3 pl-12 text-white font-headline text-xs focus:border-primary outline-none uppercase tracking-widest w-full md:w-64"
            />
          </div>
          <select 
            value={selectedExercise}
            onChange={(e) => setSelectedExercise(e.target.value)}
            className="bg-black border-2 border-zinc-800 p-3 text-white font-headline text-xs focus:border-primary outline-none uppercase tracking-widest cursor-pointer"
          >
            {exercises.map(ex => (
              <option key={ex} value={ex}>{ex}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grouped Rankings */}
      <div className="space-y-16">
        {filteredGroups.map(exName => (
          <div key={exName} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-px flex-1 bg-zinc-800"></div>
              <h4 className="font-headline text-2xl font-black uppercase italic text-primary tracking-widest px-4">
                {exName}
              </h4>
              <div className="h-px flex-1 bg-zinc-800"></div>
            </div>

            <div className="space-y-2">
              {groupedEntries[exName]
                .filter(e => e.userName.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((entry, idx) => (
                <div key={entry.id} className="bg-zinc-900 border border-zinc-800 p-4 hover:border-primary transition-all flex items-center gap-6 group">
                  <div className="w-12 font-headline font-black text-2xl text-zinc-800 group-hover:text-primary transition-colors italic">
                    #{idx + 1}
                  </div>
                  <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-black flex items-center justify-center border border-zinc-800 overflow-hidden">
                        {entry.userImage ? (
                          <img src={entry.userImage} alt={entry.userName} className="w-full h-full object-cover grayscale" />
                        ) : (
                          <Activity className="text-zinc-700 w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-headline font-black text-white uppercase tracking-tight">{entry.userName}</p>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold italic">Verified Record</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right min-w-[100px]">
                        {editingId === entry.id ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <input 
                                type="number" 
                                value={editValue.weight}
                                onChange={(e) => setEditValue({ ...editValue, weight: Number(e.target.value) })}
                                className="w-20 bg-black border border-primary p-1 text-primary font-headline text-xs"
                              />
                              <span className="text-[10px] text-zinc-500 font-bold">KG</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input 
                                type="number" 
                                value={editValue.reps}
                                onChange={(e) => setEditValue({ ...editValue, reps: Number(e.target.value) })}
                                className="w-20 bg-black border border-primary p-1 text-primary font-headline text-xs"
                              />
                              <span className="text-[10px] text-zinc-500 font-bold">REPS</span>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="font-headline font-black text-2xl text-primary leading-none">{entry.weight} KG</p>
                            {entry.reps && <p className="text-[10px] text-zinc-500 uppercase font-bold">x{entry.reps} Reps</p>}
                          </>
                        )}
                      </div>
                      
                      {isAdmin && (
                        <div className="flex gap-2 border-l border-zinc-800 pl-4">
                          {editingId === entry.id ? (
                            <>
                              <button onClick={() => handleSave(entry.id)} className="p-2 text-green-500 hover:bg-green-500/10 transition-colors">
                                <Save className="w-4 h-4" />
                              </button>
                              <button onClick={() => setEditingId(null)} className="p-2 text-zinc-500 hover:bg-zinc-500/10 transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => handleEdit(entry)} className="p-2 text-primary hover:bg-primary/10 transition-colors">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(entry.id)} className="p-2 text-red-500 hover:bg-red-500/10 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      <div className="hidden md:block text-right border-l border-zinc-800 pl-8 min-w-[120px]">
                        <p className="text-[8px] text-zinc-600 font-black uppercase tracking-widest">Recorded</p>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase">{new Date(entry.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredGroups.length === 0 && (
          <div className="py-20 text-center text-zinc-700 uppercase font-headline tracking-widest italic bg-zinc-900 border-2 border-dashed border-zinc-800">
            No tactical data found for the current parameters.
          </div>
        )}
      </div>

      {/* Add Entry Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-zinc-900 border-t-8 border-primary p-8 max-w-md w-full animate-in zoom-in-95 duration-200">
            <h3 className="font-headline font-black text-2xl text-white mb-6 uppercase tracking-tighter">Induct Manual Record</h3>
            
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-primary font-black font-headline uppercase tracking-widest">Select Athlete</label>
                <select 
                  value={newEntry.userId}
                  onChange={(e) => setNewEntry({...newEntry, userId: e.target.value})}
                  className="bg-black border-2 border-zinc-800 p-3 text-white font-headline text-xs focus:border-primary outline-none uppercase"
                >
                  <option value="">SELECT PERSONNEL</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-primary font-black font-headline uppercase tracking-widest">Movement / Lift</label>
                <input 
                  type="text" 
                  value={newEntry.exerciseName}
                  onChange={(e) => setNewEntry({...newEntry, exerciseName: e.target.value})}
                  placeholder="EXERCISE NAME"
                  className="bg-black border-2 border-zinc-800 p-3 text-white font-headline text-xs focus:border-primary outline-none uppercase placeholder:text-zinc-700"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {DEFAULT_EXERCISES.map(ex => (
                    <button 
                      key={ex}
                      onClick={() => setNewEntry({...newEntry, exerciseName: ex})}
                      className={cn(
                        "text-[8px] px-2 py-1 border border-zinc-800 uppercase font-black",
                        newEntry.exerciseName === ex ? "bg-primary text-black" : "text-zinc-500"
                      )}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-primary font-black font-headline uppercase tracking-widest">Weight (KG)</label>
                  <input 
                    type="number" 
                    value={newEntry.weight}
                    onChange={(e) => setNewEntry({...newEntry, weight: Number(e.target.value)})}
                    className="bg-black border-2 border-zinc-800 p-3 text-white font-headline text-xs focus:border-primary outline-none"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-primary font-black font-headline uppercase tracking-widest">Reps</label>
                  <input 
                    type="number" 
                    value={newEntry.reps}
                    onChange={(e) => setNewEntry({...newEntry, reps: Number(e.target.value)})}
                    className="bg-black border-2 border-zinc-800 p-3 text-white font-headline text-xs focus:border-primary outline-none"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="bg-zinc-800 text-white font-headline font-black py-4 uppercase text-xs hover:bg-zinc-700 transition-all"
                >
                  Abort
                </button>
                <button 
                  onClick={handleAddEntry}
                  className="bg-primary text-black font-headline font-black py-4 uppercase text-xs hover:bg-white transition-all shadow-lg shadow-primary/20"
                >
                  Confirm Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
