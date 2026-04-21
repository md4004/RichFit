import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { TrendingUp, Clock, LockOpen, Calendar as CalendarIcon, Bolt, Dumbbell, Plus, Trash2, Save, User as UserIcon, ChevronRight, ChevronLeft, Info, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { db, collection, onSnapshot, query, addDoc, doc, setDoc, deleteDoc, OperationType, handleFirestoreError, where, getDoc } from '@/firebase';
import { Member, Exercise, WorkoutCalendar } from '@/types';
import { EXERCISES } from '@/constants';
import ExerciseSelector from '@/components/ExerciseSelector';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function AdminPT() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [schedule, setSchedule] = useState<{ [key: string]: Exercise[] }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const path = 'users';
    const q = query(collection(db, path));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const memberData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Member[];
      setMembers(memberData.filter(m => m.role !== 'admin'));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedMember) {
      const fetchCalendar = async () => {
        const docRef = doc(db, 'calendars', selectedMember.id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSchedule(docSnap.data().schedule || {});
        } else {
          setSchedule({});
        }
      };
      fetchCalendar();
    } else {
      setSchedule({});
    }
  }, [selectedMember]);

  const addExercise = () => {
    const dayExercises = schedule[selectedDay] || [];
    setSchedule({
      ...schedule,
      [selectedDay]: [...dayExercises, { name: '', sets: '', reps: '', notes: '' }]
    });
  };

  const updateExercise = (index: number, field: keyof Exercise, value: string) => {
    const dayExercises = [...(schedule[selectedDay] || [])];
    (dayExercises[index] as any)[field] = value;
    setSchedule({
      ...schedule,
      [selectedDay]: dayExercises
    });
  };

  const removeExercise = (index: number) => {
    const dayExercises = (schedule[selectedDay] || []).filter((_, i) => i !== index);
    setSchedule({
      ...schedule,
      [selectedDay]: dayExercises
    });
  };

  const handleSaveCalendar = async () => {
    if (!selectedMember) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'calendars', selectedMember.id), {
        userId: selectedMember.id,
        schedule,
        updatedAt: new Date().toISOString()
      });
      alert(`Tactical schedule updated for ${selectedMember.name}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `calendars/${selectedMember.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout isAdmin>
      <header className="mb-8">
        <h2 className="font-headline text-5xl md:text-7xl font-black uppercase tracking-tighter mb-2 leading-none">
          PT <span className="text-primary">COMMAND</span>
        </h2>
        <p className="font-headline text-zinc-500 tracking-widest uppercase text-sm">Operational Protocol: Calendar Assignment</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Member Selection */}
        <section className="xl:col-span-3">
          <div className="mb-4 flex justify-between items-end border-b-2 border-primary pb-2">
            <h3 className="font-headline font-black uppercase text-sm text-white">Personnel</h3>
          </div>
          
          <div className="space-y-1 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {members.map((member) => (
              <div 
                key={member.id} 
                onClick={() => setSelectedMember(member)}
                className={cn(
                  "p-3 flex items-center gap-3 cursor-pointer transition-all border-l-2",
                  selectedMember?.id === member.id 
                    ? "bg-primary text-black border-white" 
                    : "bg-zinc-900 text-white border-primary hover:bg-zinc-800"
                )}
              >
                <div className="w-8 h-8 bg-zinc-800 flex-shrink-0 overflow-hidden">
                  <img 
                    className="w-full h-full object-cover grayscale" 
                    src={member.image || `https://picsum.photos/seed/${member.id}/200/200`} 
                    alt={member.name}
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-headline font-bold uppercase text-[10px] truncate">{member.name}</h4>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Calendar Builder */}
        <section className="xl:col-span-9">
          {selectedMember ? (
            <div className="bg-zinc-900 border-t-8 border-primary p-6 md:p-8 animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                  <h3 className="font-headline font-black uppercase text-2xl text-white">Tactical Calendar</h3>
                  <p className="text-primary font-headline font-bold text-[10px] uppercase tracking-widest">Assigning to: {selectedMember.name}</p>
                </div>
                <button 
                  onClick={handleSaveCalendar}
                  disabled={saving}
                  className="bg-primary text-black font-headline font-black px-6 py-3 uppercase flex items-center gap-2 hover:bg-white transition-all disabled:opacity-50 text-sm"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Syncing...' : 'Commit Schedule'}
                </button>
              </div>

              {/* Day Selector */}
              <div className="flex overflow-x-auto pb-4 gap-2 no-scrollbar">
                {DAYS.map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "px-4 py-2 font-headline font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap border-2",
                      selectedDay === day 
                        ? "bg-primary border-primary text-black" 
                        : "bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600"
                    )}
                  >
                    {day}
                  </button>
                ))}
              </div>

              {/* Exercise List for Selected Day */}
              <div className="mt-8 space-y-4">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                  <h4 className="font-headline font-black uppercase text-lg text-white flex items-center gap-2">
                    <Dumbbell className="w-5 h-5 text-primary" />
                    {selectedDay} Protocol
                  </h4>
                  <button 
                    onClick={addExercise}
                    className="flex items-center gap-2 text-primary hover:text-white transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-[10px] font-black font-headline uppercase">Add Movement</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {(schedule[selectedDay] || []).map((ex, index) => (
                    <div key={index} className="bg-black p-4 border border-zinc-800 space-y-4 animate-in slide-in-from-left-2">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-[8px] text-zinc-500 font-black font-headline uppercase">Movement</label>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <ExerciseSelector 
                                value={ex.name}
                                onChange={(val) => updateExercise(index, 'name', val)}
                                className="w-full"
                              />
                            </div>
                            {ex.name && (
                              <a 
                                href={EXERCISES.find(e => e.name === ex.name)?.video} 
                                target="_blank" 
                                rel="noreferrer"
                                className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center text-primary hover:bg-primary hover:text-black transition-all"
                                title="View Form Video"
                              >
                                <PlayCircle className="w-5 h-5" />
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[8px] text-zinc-500 font-black font-headline uppercase">Sets</label>
                          <input 
                            value={ex.sets}
                            onChange={(e) => updateExercise(index, 'sets', e.target.value)}
                            className="bg-zinc-900 border-0 border-b border-zinc-700 text-white font-headline text-xs p-2 focus:border-primary focus:ring-0 uppercase" 
                            placeholder="E.G. 4" 
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[8px] text-zinc-500 font-black font-headline uppercase">Reps</label>
                          <input 
                            value={ex.reps || ''}
                            onChange={(e) => updateExercise(index, 'reps', e.target.value)}
                            className="bg-zinc-900 border-0 border-b border-zinc-700 text-white font-headline text-xs p-2 focus:border-primary focus:ring-0 uppercase" 
                            placeholder="E.G. 10-12" 
                          />
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1 flex flex-col gap-1">
                          <label className="text-[8px] text-zinc-500 font-black font-headline uppercase">Coach Notes</label>
                          <input 
                            value={ex.notes || ''}
                            onChange={(e) => updateExercise(index, 'notes', e.target.value)}
                            className="bg-zinc-900 border-0 border-b border-zinc-700 text-white font-headline text-[10px] p-2 focus:border-primary focus:ring-0 uppercase" 
                            placeholder="TEMPO, REST, ETC." 
                          />
                        </div>
                        <button 
                          onClick={() => removeExercise(index)}
                          className="self-end text-zinc-700 hover:text-red-500 transition-colors p-2"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {(schedule[selectedDay] || []).length === 0 && (
                    <div className="py-16 border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-700">
                      <CalendarIcon className="w-12 h-12 mb-2 opacity-20" />
                      <p className="font-headline text-xs uppercase font-bold">Rest Day / No Protocol Defined</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] border-4 border-dashed border-zinc-900 flex flex-col items-center justify-center text-zinc-700">
              <UserIcon className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-headline text-xl font-black uppercase tracking-widest">Select Personnel to Begin Command</p>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
