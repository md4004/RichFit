import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/AuthContext';
import { db, collection, onSnapshot, query, where, orderBy, OperationType, handleFirestoreError } from '@/firebase';
import { TrendingUp, ArrowLeft, Activity, Calendar, Video } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PersonalRecords() {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const path = `records/${user.uid}/logs`;
    const q = query(collection(db, 'records', user.uid, 'logs'), orderBy('date', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recordData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecords(recordData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <Layout>
      <div className="mb-12">
        <Link to="/pt" className="text-zinc-500 hover:text-primary font-headline text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to PT Protocol
        </Link>
        <h2 className="font-headline text-5xl md:text-7xl font-black uppercase tracking-tighter text-white leading-none">
          PERSONAL <span className="text-primary">RECORDS</span>
        </h2>
        <p className="font-headline text-primary font-bold uppercase tracking-widest mt-2">Historical Strength Data</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent animate-spin"></div>
        </div>
      ) : records.length > 0 ? (
        <div className="space-y-4">
          {records.map((record) => (
            <div key={record.id} className="bg-zinc-900 border-l-4 border-primary p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-black flex items-center justify-center">
                  <TrendingUp className="text-primary w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-headline text-2xl font-black uppercase text-white leading-none">{record.exerciseName}</h4>
                  <div className="flex gap-4 mt-1">
                    <p className="text-[10px] text-zinc-500 font-headline uppercase flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(record.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
                <div className="flex items-center gap-6">
                  <div className="text-right flex items-center gap-4">
                    <div className="text-right">
                      <span className="font-headline text-4xl font-black text-primary uppercase italic tracking-tighter">
                        {record.weight} KG
                        {record.reps && <span className="text-xl text-white ml-2">x{record.reps}</span>}
                      </span>
                    </div>

                    {record.videoUrl && (
                      <div className="flex items-center gap-2 border-l border-zinc-800 pl-4">
                        <a 
                          href={record.videoUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center group"
                          title="View Execution Evidence"
                        >
                          <div className="w-8 h-8 bg-black/50 text-primary rounded flex items-center justify-center border border-primary/30 group-hover:bg-primary group-hover:text-black transition-all">
                            <Video className="w-4 h-4" />
                          </div>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 border-4 border-dashed border-zinc-900 flex flex-col items-center justify-center text-zinc-700">
          <Activity className="w-16 h-16 mb-4 opacity-20" />
          <p className="font-headline text-xl font-black uppercase tracking-widest">No Records Logged</p>
          <p className="text-xs uppercase font-bold mt-2">Start logging your lifts in the PT tab to see them here.</p>
        </div>
      )}
    </Layout>
  );
}
