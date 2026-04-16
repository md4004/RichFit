import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Trophy, Medal, Crown, Activity, Search, ChevronRight, TrendingUp, Trash2, Edit2, Save, X } from 'lucide-react';
import { db, collection, onSnapshot, query, orderBy, limit, doc, deleteDoc, updateDoc, OperationType, handleFirestoreError } from '@/firebase';
import { cn } from '@/lib/utils';
import { useAuth } from '@/AuthContext';

interface LeaderboardEntry {
  id: string;
  userId: string;
  userName: string;
  userImage: string | null;
  exerciseName: string;
  weight: number;
  reps?: number;
  date: string;
}

interface UserTotal {
  userId: string;
  userName: string;
  userImage: string | null;
  totalWeight: number;
  liftsCount: number;
}

export default function Leaderboard() {
  const { isAdmin } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<{ weight: number; reps: number }>({ weight: 0, reps: 0 });

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

  const exercises = ['All', ...Array.from(new Set(entries.map(e => e.exerciseName)))];

  // Calculate totals per user
  const userTotals = (Object.values(
    entries.reduce((acc: Record<string, UserTotal>, entry) => {
      if (!acc[entry.userId]) {
        acc[entry.userId] = {
          userId: entry.userId,
          userName: entry.userName,
          userImage: entry.userImage,
          totalWeight: 0,
          liftsCount: 0
        };
      }
      acc[entry.userId].totalWeight += entry.weight;
      acc[entry.userId].liftsCount += 1;
      return acc;
    }, {})
  ) as UserTotal[]).sort((a, b) => b.totalWeight - a.totalWeight);

  const top3 = userTotals.slice(0, 3);

  // Group entries by exercise
  const groupedEntries = entries.reduce((acc: Record<string, LeaderboardEntry[]>, entry) => {
    if (!acc[entry.exerciseName]) {
      acc[entry.exerciseName] = [];
    }
    acc[entry.exerciseName].push(entry);
    return acc;
  }, {});

  // Sort each group by weight desc
  Object.keys(groupedEntries).forEach(ex => {
    groupedEntries[ex].sort((a, b) => b.weight - a.weight);
  });

  const filteredGroups = Object.keys(groupedEntries)
    .filter(ex => selectedExercise === 'All' || ex === selectedExercise)
    .filter(ex => 
      ex.toLowerCase().includes(searchQuery.toLowerCase()) || 
      groupedEntries[ex].some(e => e.userName.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  return (
    <Layout>
      <header className="mb-12">
        <span className="font-headline text-primary text-sm font-bold tracking-[0.2em] uppercase">Global Rankings</span>
        <h2 className="font-headline text-5xl md:text-7xl font-black uppercase leading-none tracking-tighter mt-2">
          Strength<br />Leaderboard
        </h2>
      </header>

      {/* Podium Section */}
      <section className="mb-16">
        <h3 className="font-headline text-2xl font-black uppercase italic mb-8 flex items-center gap-3">
          <Crown className="text-primary" />
          Total Weight Standings
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          {/* 2nd Place */}
          {top3[1] && (
            <div className="order-2 md:order-1 bg-zinc-900 border-t-4 border-zinc-500 p-6 text-center relative pt-12">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-zinc-800 rounded-full border-4 border-zinc-500 flex items-center justify-center">
                <Medal className="text-zinc-500 w-8 h-8" />
              </div>
              <p className="font-headline font-black text-xl uppercase truncate">{top3[1].userName}</p>
              <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mt-1">Silver Medalist</p>
              <div className="mt-4 bg-black py-2">
                <p className="font-headline font-black text-2xl text-white">{top3[1].totalWeight} KG</p>
                <p className="text-[8px] text-zinc-600 uppercase font-black tracking-tighter">{top3[1].liftsCount} LIFTS RECORDED</p>
              </div>
            </div>
          )}

          {/* 1st Place */}
          {top3[0] && (
            <div className="order-1 md:order-2 bg-zinc-900 border-t-8 border-primary p-8 text-center relative pt-16 scale-105 shadow-2xl shadow-primary/10">
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-primary rounded-full border-4 border-white flex items-center justify-center">
                <Trophy className="text-black w-10 h-10" />
              </div>
              <p className="font-headline font-black text-3xl uppercase truncate">{top3[0].userName}</p>
              <p className="text-primary text-xs uppercase font-black tracking-[0.2em] mt-1">Current Champion</p>
              <div className="mt-6 bg-black py-4 border-x-2 border-primary">
                <p className="font-headline font-black text-4xl text-white">{top3[0].totalWeight} KG</p>
                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-tighter">{top3[0].liftsCount} LIFTS RECORDED</p>
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {top3[2] && (
            <div className="order-3 bg-zinc-900 border-t-4 border-orange-800 p-6 text-center relative pt-12">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-zinc-800 rounded-full border-4 border-orange-800 flex items-center justify-center">
                <Medal className="text-orange-800 w-8 h-8" />
              </div>
              <p className="font-headline font-black text-xl uppercase truncate">{top3[2].userName}</p>
              <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mt-1">Bronze Medalist</p>
              <div className="mt-4 bg-black py-2">
                <p className="font-headline font-black text-2xl text-white">{top3[2].totalWeight} KG</p>
                <p className="text-[8px] text-zinc-600 uppercase font-black tracking-tighter">{top3[2].liftsCount} LIFTS RECORDED</p>
              </div>
            </div>
          )}
        </div>
      </section>

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
    </Layout>
  );
}
