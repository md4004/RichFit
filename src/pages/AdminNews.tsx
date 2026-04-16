import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { ANNOUNCEMENTS as STATIC_ANNOUNCEMENTS } from '@/constants';
import { Megaphone, Send, Paperclip, Image as ImageIcon, Trash2 } from 'lucide-react';
import { db, collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, OperationType, handleFirestoreError } from '@/firebase';
import { Announcement } from '@/types';

export default function AdminNews() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    const path = 'announcements';
    const q = query(collection(db, path), orderBy('date', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      
      setAnnouncements(newsData.length > 0 ? newsData : STATIC_ANNOUNCEMENTS);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'announcements';
    try {
      await addDoc(collection(db, path), {
        title,
        content,
        category: 'Facility',
        date: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).toUpperCase().replace(',', ' |')
      });
      setTitle('');
      setContent('');
      alert('Announcement Broadcasted');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const handleDelete = async (id: string) => {
    const path = `announcements/${id}`;
    if (window.confirm('Delete this announcement?')) {
      try {
        await deleteDoc(doc(db, 'announcements', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    }
  };

  return (
    <Layout isAdmin>
      <header className="mb-12">
        <h2 className="font-headline text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-4">
          NEWS <span className="text-primary">BROADCAST</span>
        </h2>
        <div className="h-1 w-24 bg-primary"></div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7">
          <div className="bg-surface-container-lowest p-8 border-l-4 border-primary">
            <h3 className="font-headline text-xl font-bold uppercase mb-8 flex items-center gap-2">
              <Megaphone className="text-primary w-6 h-6" />
              Draft Message
            </h3>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="block font-headline text-xs uppercase tracking-widest text-zinc-500 mb-2">Announcement Title</label>
                <input 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full bg-black border-0 border-b-2 border-zinc-800 focus:border-primary focus:ring-0 text-white font-headline text-lg uppercase py-3 px-0 transition-colors placeholder:text-zinc-700" 
                  placeholder="URGENT: FACILITY MAINTENANCE" 
                  type="text" 
                />
              </div>
              <div>
                <label className="block font-headline text-xs uppercase tracking-widest text-zinc-500 mb-2">Message Body</label>
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  className="w-full bg-black border-0 border-b-2 border-zinc-800 focus:border-primary focus:ring-0 text-white font-body py-3 px-0 transition-colors resize-none placeholder:text-zinc-700" 
                  placeholder="ENTER SYSTEM BROADCAST CONTENT..." 
                  rows={6}
                ></textarea>
              </div>
              <div className="flex items-center justify-between pt-4">
                <div className="flex gap-4">
                  <button className="text-zinc-500 hover:text-white transition-colors" type="button">
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <button className="text-zinc-500 hover:text-white transition-colors" type="button">
                    <ImageIcon className="w-5 h-5" />
                  </button>
                </div>
                <button className="bg-primary text-black px-8 py-4 font-headline font-black uppercase tracking-widest hover:bg-white transition-colors flex items-center gap-2 group" type="submit">
                  Send Announcement
                  <Send className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-8">
          <div className="bg-zinc-900 p-6 border-t-4 border-primary">
            <h3 className="font-headline text-lg font-bold uppercase mb-6 flex items-center justify-between">
              Recent Dispatches
              <span className="text-xs font-headline text-zinc-500">Live Feed</span>
            </h3>
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent animate-spin"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map((dispatch) => (
                  <div key={dispatch.id} className="bg-black p-4 border-l-2 border-zinc-700 hover:border-primary transition-colors group relative">
                    <p className="font-headline text-[10px] text-primary mb-1">{dispatch.date}</p>
                    <h4 className="font-headline font-bold text-sm uppercase mb-2">{dispatch.title}</h4>
                    <p className="text-xs text-zinc-400 font-body leading-relaxed">{dispatch.content}</p>
                    <button 
                      onClick={() => handleDelete(dispatch.id)}
                      className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button className="w-full mt-6 py-3 font-headline text-xs uppercase tracking-widest text-zinc-500 border border-zinc-800 hover:border-primary hover:text-primary transition-all">
              View Dispatch History
            </button>
          </div>

          <div className="relative group overflow-hidden bg-black aspect-video flex items-end p-6 border border-zinc-900">
            <img 
              className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500" 
              src="https://picsum.photos/seed/gym/800/450" 
              alt="Gym" 
              referrerPolicy="no-referrer"
            />
            <div className="relative z-10">
              <span className="bg-primary text-black px-2 py-1 font-headline text-[10px] font-bold uppercase mb-2 inline-block">Pro Tip</span>
              <h4 className="font-headline text-xl font-black uppercase leading-tight">Engage your members with tactical updates.</h4>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
