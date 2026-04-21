import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Plus, Check, ChevronDown, Activity, PlayCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EXERCISES } from '@/constants';
import { db, collection, addDoc, onSnapshot, query } from '@/firebase';

interface ExerciseItem {
  name: string;
  target: string;
  video?: string;
  custom?: boolean;
}

interface ExerciseSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function ExerciseSelector({ value, onChange, className }: ExerciseSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customExercises, setCustomExercises] = useState<ExerciseItem[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newExercise, setNewExercise] = useState({ name: '', target: 'Other' });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'custom_exercises'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data() as ExerciseItem, custom: true }));
      setCustomExercises(data);
    });
    return () => unsubscribe();
  }, []);

  const allExercises = useMemo(() => {
    const base = EXERCISES.map(e => ({ ...e, custom: false }));
    const combined = [...base, ...customExercises];
    // Remove duplicates by name
    const unique = combined.reduce((acc: ExerciseItem[], curr) => {
      if (!acc.find(item => item.name.toLowerCase() === curr.name.toLowerCase())) {
        acc.push(curr);
      }
      return acc;
    }, []);
    return unique;
  }, [customExercises]);

  const filteredExercises = useMemo(() => {
    return allExercises.filter(ex => 
      ex.name.toLowerCase().includes(search.toLowerCase()) || 
      ex.target.toLowerCase().includes(search.toLowerCase())
    );
  }, [allExercises, search]);

  const groupedExercises = useMemo(() => {
    const groups: Record<string, ExerciseItem[]> = {};
    filteredExercises.forEach(ex => {
      if (!groups[ex.target]) groups[ex.target] = [];
      groups[ex.target].push(ex);
    });
    return groups;
  }, [filteredExercises]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateExercise = async () => {
    if (!newExercise.name) return;
    try {
      await addDoc(collection(db, 'custom_exercises'), {
        name: newExercise.name,
        target: newExercise.target,
        createdAt: new Date().toISOString()
      });
      onChange(newExercise.name);
      setIsAddingNew(false);
      setNewExercise({ name: '', target: 'Other' });
      setIsOpen(false);
    } catch (error) {
      console.error("Error adding exercise:", error);
    }
  };

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <div 
        onClick={() => !isAddingNew && setIsOpen(!isOpen)}
        className={cn(
          "bg-zinc-900 border-0 border-b border-zinc-700 text-white font-headline text-xs p-2 flex items-center justify-between cursor-pointer hover:border-primary transition-all uppercase min-h-[40px]",
          isOpen && "border-primary"
        )}
      >
        <span className={cn(value ? "text-white" : "text-zinc-500 font-bold")}>
          {value || "SELECT MOVEMENT"}
        </span>
        <ChevronDown className={cn("w-3 h-3 text-zinc-500 transition-transform", isOpen && "rotate-180")} />
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col max-h-[400px]">
          {!isAddingNew ? (
            <>
              <div className="p-2 border-b border-zinc-800 bg-black">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="SEARCH EXERCISES..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-zinc-800 border-none text-white font-headline text-[10px] p-2 pl-7 placeholder:text-zinc-600 focus:ring-1 focus:ring-primary uppercase tracking-widest outline-none"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {Object.keys(groupedExercises).sort().map(category => (
                  <div key={category}>
                    <div className="bg-black/50 px-3 py-1 border-y border-zinc-800">
                      <span className="text-[8px] font-black text-primary uppercase tracking-widest">{category}</span>
                    </div>
                    {groupedExercises[category].map(ex => (
                      <div 
                        key={ex.name}
                        onClick={() => {
                          onChange(ex.name);
                          setIsOpen(false);
                        }}
                        className={cn(
                          "px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-zinc-800 transition-colors group",
                          value === ex.name && "bg-primary/10 text-primary"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-headline font-bold text-[10px] uppercase">{ex.name}</span>
                          {ex.custom && <span className="text-[8px] bg-zinc-800 text-zinc-500 px-1 rounded">USER</span>}
                        </div>
                        {value === ex.name && <Check className="w-3 h-3" />}
                      </div>
                    ))}
                  </div>
                ))}
                {(!search || filteredExercises.length === 0) && (
                  <div 
                    onClick={() => setIsAddingNew(true)}
                    className="p-4 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 transition-colors cursor-pointer border-t border-zinc-800 mt-2"
                  >
                    <Plus className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-black font-headline uppercase text-primary">Add New Exercise</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-4 space-y-4 bg-black animate-in fade-in slide-in-from-bottom-2">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-headline font-black text-xs uppercase text-primary">New Tactical Movement</h4>
                <button onClick={() => setIsAddingNew(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] text-zinc-600 font-black uppercase">Exercise Name</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={newExercise.name}
                    onChange={(e) => setNewExercise({...newExercise, name: e.target.value})}
                    placeholder="E.G. ZOTTMAN CURLS"
                    className="w-full bg-zinc-900 border border-zinc-800 text-white font-headline text-[10px] p-2 focus:border-primary outline-none uppercase"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] text-zinc-600 font-black uppercase">Muscle Group</label>
                  <select 
                    value={newExercise.target}
                    onChange={(e) => setNewExercise({...newExercise, target: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 text-white font-headline text-[10px] p-2 focus:border-primary outline-none uppercase"
                  >
                    {Array.from(new Set(EXERCISES.map(e => e.target))).sort().map(target => (
                      <option key={target} value={target}>{target}</option>
                    ))}
                    <option value="Other">OTHER</option>
                  </select>
                </div>
                <button 
                  onClick={handleCreateExercise}
                  className="w-full bg-primary text-black font-headline font-black py-2 uppercase text-[10px] hover:bg-white transition-all shadow-lg shadow-primary/10"
                >
                  Induct Movement
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
