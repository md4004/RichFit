import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Database, Upload, ChevronRight, Trash2, Plus, ArrowLeft, Calendar, Mail, Shield, Activity, User as UserIcon, Search, Filter, X, Save, CheckCircle2, XCircle } from 'lucide-react';
import { db, collection, onSnapshot, query, doc, deleteDoc, OperationType, handleFirestoreError, auth, secondaryAuth, setDoc, storage, ref, uploadBytes, getDownloadURL, uploadBytesResumable, addDoc, updateDoc } from '@/firebase';
import { Member } from '@/types';
import { cn } from '@/lib/utils';

type ViewState = 'list' | 'add' | 'details';

export default function AdminOps() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewState>('list');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'subEnd'>('name');
  const [uploading, setUploading] = useState(false);
  const [showAllMembers, setShowAllMembers] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showRenewModal, setShowRenewModal] = useState<Member | null>(null);
  const [renewMonths, setRenewMonths] = useState<1 | 3>(1);
  const [isEditing, setIsEditing] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    tier: 'Beginner' as const,
    gender: 'Male' as 'Male' | 'Female',
    height: 0,
    weight: 0,
    focus: 'Hypertrophy' as const,
    medical: '',
    image: '',
    phone: '',
    address: '',
    subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  useEffect(() => {
    const path = 'users';
    const q = query(collection(db, path));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const memberData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      
      setMembers(memberData.filter(m => m.role !== 'admin'));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert("File too large. Maximum size is 5MB.");
      return;
    }

    setUploading(true);
    console.log("Attempting upload for:", file.name);
    
    try {
      const storageRef = ref(storage, `members/${Date.now()}_${file.name}`);
      
      // Using uploadBytes for better compatibility in restricted environments
      const snapshot = await uploadBytes(storageRef, file);
      console.log("Upload successful, getting download URL...");
      
      const url = await getDownloadURL(snapshot.ref);
      console.log("File available at:", url);
      
      setFormData(prev => ({ ...prev, image: url }));
      alert("Profile picture uploaded successfully.");
    } catch (error: any) {
      console.error("Upload error caught:", error);
      let message = "IMAGE UPLOAD FAILED\n\n";
      
      if (error.code === 'storage/unknown') {
        message += "CRITICAL: This is likely a CORS (Cross-Origin Resource Sharing) issue.\n\n";
        message += "FIX STEPS:\n";
        message += "1. Go to Firebase Console > Storage.\n";
        message += "2. Click 'Get Started' if you haven't already.\n";
        message += "3. You MUST configure CORS for your bucket to allow this domain.\n";
        message += "4. Run this command in your terminal (if you have gsutil):\n";
        message += "   gsutil cors set cors.json gs://gen-lang-client-0430129528.firebasestorage.app\n\n";
        message += "Alternatively, check if your Storage Rules are deployed.";
      } else if (error.code === 'storage/unauthorized') {
        message += "Permissions denied. Please ensure your Storage Rules allow writes for authenticated users.";
      } else {
        message += error.message;
      }
      
      alert(message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) {
      alert("Please wait for the image to finish uploading.");
      return;
    }

    try {
      const { createUserWithEmailAndPassword, signOut } = await import('firebase/auth');
      
      // Use secondaryAuth to prevent logging out the current admin
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
      const uid = userCredential.user.uid;

      // Immediately sign out the secondary auth instance to be clean
      await signOut(secondaryAuth);

      const memberProfile = {
        uid,
        name: formData.name,
        email: formData.email,
        tier: formData.tier,
        gender: formData.gender,
        height: Number(formData.height),
        weight: Number(formData.weight),
        focus: formData.focus,
        medical: formData.medical,
        phone: formData.phone,
        address: formData.address,
        subscriptionEnd: formData.subscriptionEnd,
        role: 'user',
        createdAt: new Date().toISOString(),
        image: formData.image || `https://picsum.photos/seed/${formData.name}/400/400`
      };

      console.log("Saving member profile:", memberProfile);
      await setDoc(doc(db, 'users', uid), memberProfile);

      // Record initial subscription income
      await addDoc(collection(db, 'transactions'), {
        productId: 'subscription',
        productName: 'Initial Subscription',
        amount: 40,
        type: 'sale',
        quantity: 1,
        date: new Date().toISOString(),
        category: 'Subscription'
      });

      setFormData({
        name: '',
        email: '',
        password: '',
        tier: 'Beginner',
        gender: 'Male',
        height: 0,
        weight: 0,
        focus: 'Hypertrophy',
        medical: '',
        image: '',
        phone: '',
        address: '',
        subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
      setView('list');
      alert('Personnel Induction Successful.');
    } catch (error: any) {
      console.error('Induction error:', error);
      alert(`Induction failed: ${error.message}`);
    }
  };

  const handleDeleteMember = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', id));
      if (selectedMember?.id === id) {
        setView('list');
        setSelectedMember(null);
      }
      setShowDeleteConfirm(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
    }
  };

  const handleRenewSubscription = async () => {
    if (!showRenewModal) return;
    
    try {
      const currentEnd = showRenewModal.subscriptionEnd ? new Date(showRenewModal.subscriptionEnd) : new Date();
      const today = new Date();
      const baseDate = currentEnd > today ? currentEnd : today;
      
      const newEnd = new Date(baseDate);
      newEnd.setMonth(newEnd.getMonth() + renewMonths);
      
      const subscriptionEnd = newEnd.toISOString().split('T')[0];
      
      await updateDoc(doc(db, 'users', showRenewModal.id), { subscriptionEnd });
      
      // Record renewal income
      await addDoc(collection(db, 'transactions'), {
        productId: 'subscription_renewal',
        productName: `Subscription Renewal (${renewMonths} Month${renewMonths > 1 ? 's' : ''})`,
        amount: 40 * renewMonths,
        type: 'sale',
        quantity: renewMonths,
        date: new Date().toISOString(),
        category: 'Subscription'
      });
      
      setShowRenewModal(null);
      alert('Subscription Renewed Successfully.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${showRenewModal.id}`);
    }
  };

  const handleEditClick = (member: Member) => {
    setEditingMember({ ...member });
    setIsEditing(true);
  };

  const handleSaveMember = async () => {
    if (!editingMember) return;
    try {
      const { id, ...updateData } = editingMember;
      await updateDoc(doc(db, 'users', id), updateData);
      setSelectedMember(editingMember);
      setIsEditing(false);
      setEditingMember(null);
      alert('Personnel Record Updated Successfully.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${editingMember?.id}`);
    }
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (editingMember) {
      setEditingMember(prev => prev ? ({ ...prev, [name]: (name === 'height' || name === 'weight') ? Number(value) : value }) : null);
    }
  };

  const filteredMembers = members
    .filter(m => 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      m.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'subEnd') {
        const dateA = a.subscriptionEnd ? new Date(a.subscriptionEnd).getTime() : Infinity;
        const dateB = b.subscriptionEnd ? new Date(b.subscriptionEnd).getTime() : Infinity;
        return dateA - dateB;
      }
      return a.name.localeCompare(b.name);
    });

  const calculateDaysLeft = (subEnd?: string) => {
    if (!subEnd) return null;
    const end = new Date(subEnd);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const stats = {
    today: members.filter(m => {
      const created = m.createdAt ? new Date(m.createdAt) : new Date(0);
      const today = new Date();
      return created.toDateString() === today.toDateString();
    }).length,
    week: members.filter(m => {
      const created = m.createdAt ? new Date(m.createdAt) : new Date(0);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return created >= weekAgo;
    }).length
  };

  return (
    <Layout isAdmin>
      <header className="mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-5xl md:text-7xl font-black font-headline uppercase tracking-tighter text-white leading-none">
              Member <span className="text-primary">Ops</span>
            </h2>
            <p className="text-zinc-500 mt-4 text-sm leading-relaxed uppercase font-headline font-semibold">
              Tactical personnel oversight and biometric induction.
            </p>
          </div>
          <div className="flex gap-4">
            {view === 'list' && (
              <button 
                onClick={() => setView('add')}
                className="bg-primary text-black font-headline font-black px-6 py-3 uppercase flex items-center gap-2 hover:bg-white transition-all active:scale-95 text-sm"
              >
                <Plus className="w-5 h-5" />
                Add Member
              </button>
            )}
            {view !== 'list' && (
              <button 
                onClick={() => setView('list')}
                className="text-zinc-500 hover:text-white font-headline font-black uppercase flex items-center gap-2 transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to List
              </button>
            )}
          </div>
        </div>
      </header>

      {view === 'list' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Mini Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-zinc-900 p-6 border-t-4 border-primary">
              <p className="text-[10px] text-zinc-500 font-headline font-black uppercase tracking-widest mb-2">New Today</p>
              <p className="text-4xl font-black text-white font-headline">{stats.today.toString().padStart(2, '0')}</p>
            </div>
            <div className="bg-zinc-900 p-6 border-t-4 border-zinc-700">
              <p className="text-[10px] text-zinc-500 font-headline font-black uppercase tracking-widest mb-2">New This Week</p>
              <p className="text-4xl font-black text-white font-headline">{stats.week.toString().padStart(2, '0')}</p>
            </div>
            <div className="bg-zinc-900 p-6 border-t-4 border-zinc-700">
              <p className="text-[10px] text-zinc-500 font-headline font-black uppercase tracking-widest mb-2">Total Active</p>
              <p className="text-4xl font-black text-white font-headline">{members.length.toString().padStart(2, '0')}</p>
            </div>
          </div>

            <div className="flex flex-col md:flex-row gap-4 items-center bg-zinc-900 p-4 border border-zinc-800">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="SEARCH BY NAME OR EMAIL..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black border-none focus:ring-1 focus:ring-primary text-white font-headline text-xs uppercase py-3 pl-12 pr-4"
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button 
                  onClick={() => setSortBy(sortBy === 'name' ? 'subEnd' : 'name')}
                  className="flex items-center gap-2 text-zinc-500 hover:text-white font-headline text-xs uppercase font-bold px-4 py-3 border border-zinc-800 flex-1 md:flex-none justify-center"
                >
                  <Filter className="w-4 h-4" />
                  Sort: {sortBy === 'name' ? 'Name' : 'Sub End'}
                </button>
                <button 
                  onClick={() => setShowAllMembers(!showAllMembers)}
                  className="flex items-center gap-2 text-zinc-500 hover:text-white font-headline text-xs uppercase font-bold px-4 py-3 border border-zinc-800 flex-1 md:flex-none justify-center"
                >
                  {showAllMembers ? 'Hide' : 'View'} All
                  <ChevronRight className={cn("w-4 h-4 transition-transform", showAllMembers ? "rotate-90" : "")} />
                </button>
              </div>
            </div>

          {showAllMembers && (
            <section className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-20">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent animate-spin"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {filteredMembers.map((member) => (
                    <div 
                      key={member.id} 
                      onClick={() => { setSelectedMember(member); setView('details'); }}
                      className="bg-zinc-900/50 border-l-2 border-primary p-4 flex items-center gap-4 hover:bg-zinc-800 transition-all cursor-pointer group"
                    >
                      <div className="w-12 h-12 bg-zinc-800 flex-shrink-0 overflow-hidden relative">
                        <img 
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" 
                          src={member.image || `https://picsum.photos/seed/${member.id}/400/400`} 
                          alt={member.name}
                          referrerPolicy="no-referrer"
                        />
                        {/* Sub Status Circle */}
                        {member.subscriptionEnd && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 border-2 border-zinc-900 rounded-full overflow-hidden bg-zinc-800">
                            <div 
                              className={cn(
                                "w-full h-full",
                                (calculateDaysLeft(member.subscriptionEnd) ?? 0) <= 0 ? "bg-red-500" :
                                (calculateDaysLeft(member.subscriptionEnd) ?? 0) <= 3 ? "bg-orange-500" :
                                "bg-primary"
                              )}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-headline font-bold text-white uppercase text-sm truncate">{member.name}</h4>
                          {member.fcmToken ? (
                            <span className="bg-primary/20 text-primary text-[8px] px-1.5 py-0.5 font-headline font-black rounded border border-primary/30">SYNCED</span>
                          ) : (
                            <span className="bg-zinc-800 text-zinc-500 text-[8px] px-1.5 py-0.5 font-headline font-black rounded border border-zinc-700">OFF-GRID</span>
                          )}
                        </div>
                        <p className="text-zinc-500 text-[10px] font-headline uppercase tracking-widest">
                          {member.tier} Tier • {member.subscriptionEnd ? `${calculateDaysLeft(member.subscriptionEnd)} Days Left` : 'No Sub'}
                        </p>
                      </div>
                      <div className="text-right hidden md:block">
                        <p className="text-[10px] text-zinc-500 font-headline uppercase">Sub Ends</p>
                        <p className="text-xs font-bold text-white">{member.subscriptionEnd || 'N/A'}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-primary transition-colors" />
                    </div>
                  ))}
                  {filteredMembers.length === 0 && (
                    <div className="text-center py-12 bg-zinc-900 border border-dashed border-zinc-800">
                      <p className="text-zinc-500 font-headline uppercase text-sm">No personnel matching search criteria.</p>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {view === 'add' && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-zinc-900 p-6 md:p-10 border-t-8 border-primary relative overflow-hidden">
            <h3 className="font-headline font-black uppercase text-2xl text-white mb-8">Personnel Induction</h3>
            <form className="space-y-8 relative z-10" onSubmit={handleSubmit}>
              {/* Image Upload */}
              <div className="flex flex-col items-center gap-6 mb-12 p-8 bg-black/40 border border-zinc-800 rounded-lg">
                <div className="w-40 h-40 bg-black border-4 border-zinc-800 flex items-center justify-center relative group overflow-hidden shadow-2xl">
                  {formData.image ? (
                    <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-16 h-16 text-zinc-800" />
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent animate-spin"></div>
                      <span className="text-[10px] font-headline font-black text-primary uppercase tracking-widest animate-pulse">Uploading...</span>
                    </div>
                  )}
                  {!uploading && !formData.image && (
                    <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <label className="cursor-pointer bg-primary hover:bg-white text-black px-8 py-3 text-xs font-headline font-black uppercase tracking-widest transition-all active:scale-95 inline-block shadow-lg">
                    <Upload className="w-4 h-4 inline-block mr-2" />
                    {formData.image ? 'Change Profile Picture' : 'Select Profile Picture'}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  <p className="text-[9px] text-zinc-600 mt-3 font-headline uppercase tracking-[0.2em]">Max Size: 5MB | Format: JPG, PNG</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-primary font-black font-headline uppercase tracking-widest">Full Identity Name</label>
                  <input name="name" value={formData.name} onChange={handleInputChange} required className="bg-black border-0 border-b-2 border-zinc-800 text-white font-headline font-bold focus:border-primary focus:ring-0 placeholder:text-zinc-700 uppercase p-3" placeholder="ENTER FULL NAME" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-primary font-black font-headline uppercase tracking-widest">Email Address</label>
                  <input name="email" value={formData.email} onChange={handleInputChange} required className="bg-black border-0 border-b-2 border-zinc-800 text-white font-headline font-bold focus:border-primary focus:ring-0 placeholder:text-zinc-700 uppercase p-3" placeholder="MEMBER@RICHFIT.COM" type="email" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-primary font-black font-headline uppercase tracking-widest">Phone Number</label>
                  <input name="phone" value={formData.phone} onChange={handleInputChange} className="bg-black border-0 border-b-2 border-zinc-800 text-white font-headline font-bold focus:border-primary focus:ring-0 placeholder:text-zinc-700 uppercase p-3" placeholder="+X (XXX) XXX-XXXX" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-primary font-black font-headline uppercase tracking-widest">Address</label>
                  <input name="address" value={formData.address} onChange={handleInputChange} className="bg-black border-0 border-b-2 border-zinc-800 text-white font-headline font-bold focus:border-primary focus:ring-0 placeholder:text-zinc-700 uppercase p-3" placeholder="PHYSICAL LOCATION" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-primary font-black font-headline uppercase tracking-widest">Access Password</label>
                  <input name="password" value={formData.password} onChange={handleInputChange} required className="bg-black border-0 border-b-2 border-zinc-800 text-white font-headline font-bold focus:border-primary focus:ring-0 p-3" placeholder="••••••••" type="password" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-primary font-black font-headline uppercase tracking-widest">Subscription End Date</label>
                  <input name="subscriptionEnd" value={formData.subscriptionEnd} onChange={handleInputChange} required className="bg-black border-0 border-b-2 border-zinc-800 text-white font-headline font-bold focus:border-primary focus:ring-0 p-3" type="date" />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-primary font-black font-headline uppercase tracking-widest">Weight (KG)</label>
                  <input name="weight" type="number" value={formData.weight} onChange={handleInputChange} className="bg-black border-0 border-b-2 border-zinc-800 text-white font-headline font-bold focus:border-primary focus:ring-0 p-3" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-primary font-black font-headline uppercase tracking-widest">Height (CM)</label>
                  <input name="height" type="number" value={formData.height} onChange={handleInputChange} className="bg-black border-0 border-b-2 border-zinc-800 text-white font-headline font-bold focus:border-primary focus:ring-0 p-3" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-primary font-black font-headline uppercase tracking-widest">Gender</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, gender: 'Male'})}
                      className={cn(
                        "py-3 font-headline font-black uppercase text-xs transition-all border-2",
                        formData.gender === 'Male' ? "bg-primary border-primary text-black" : "bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600"
                      )}
                    >
                      Male
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, gender: 'Female'})}
                      className={cn(
                        "py-3 font-headline font-black uppercase text-xs transition-all border-2",
                        formData.gender === 'Female' ? "bg-primary border-primary text-black" : "bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600"
                      )}
                    >
                      Female
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-primary font-black font-headline uppercase tracking-widest">Tier Classification</label>
                  <select name="tier" value={formData.tier} onChange={handleInputChange} className="bg-black border-0 border-b-2 border-zinc-800 text-white font-headline font-bold focus:border-primary focus:ring-0 uppercase p-3">
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-primary font-black font-headline uppercase tracking-widest">Training Focus</label>
                  <select name="focus" value={formData.focus} onChange={handleInputChange} className="bg-black border-0 border-b-2 border-zinc-800 text-white font-headline font-bold focus:border-primary focus:ring-0 uppercase p-3">
                    <option value="Hypertrophy">Hypertrophy</option>
                    <option value="Strength">Strength</option>
                    <option value="Endurance">Endurance</option>
                    <option value="Mobility">Mobility</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-[10px] text-primary font-black font-headline uppercase tracking-widest">Medical Conditions</label>
                  <textarea name="medical" value={formData.medical} onChange={handleInputChange} className="bg-black border-0 border-b-2 border-zinc-800 text-white font-headline font-bold focus:border-primary focus:ring-0 p-3 min-h-[100px] uppercase" placeholder="LOG ANY CRITICAL HEALTH INTEL..." />
                </div>
              </div>
              <button className="w-full bg-primary text-black font-headline font-black text-xl uppercase py-5 hover:bg-white transition-colors flex items-center justify-center gap-4 group" type="submit" disabled={uploading}>
                <span>{uploading ? 'Uploading Image...' : 'Add Member'}</span>
                <Database className="w-8 h-8 group-hover:translate-x-2 transition-transform" />
              </button>
            </form>
          </div>
        </section>
      )}

      {view === 'details' && selectedMember && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-zinc-900 border-t-8 border-primary p-6 md:p-10">
            <div className="flex flex-col md:flex-row gap-10">
              <div className="w-full md:w-64 space-y-6">
                <div className="aspect-square bg-black border-4 border-primary overflow-hidden">
                  <img 
                    className="w-full h-full object-cover grayscale" 
                    src={selectedMember.image || `https://picsum.photos/seed/${selectedMember.id}/400/400`} 
                    alt={selectedMember.name} 
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="space-y-3">
                  {!isEditing ? (
                    <button 
                      onClick={() => handleEditClick(selectedMember)}
                      className="w-full bg-white text-black py-3 font-headline font-black uppercase text-xs hover:bg-primary transition-all flex items-center justify-center gap-2"
                    >
                      <Database className="w-4 h-4" />
                      Edit Bio Data
                    </button>
                  ) : (
                    <button 
                      onClick={handleSaveMember}
                      className="w-full bg-primary text-black py-3 font-headline font-black uppercase text-xs hover:bg-white transition-all flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Save Intelligence
                    </button>
                  )}
                  <button 
                    onClick={() => setShowDeleteConfirm(selectedMember.id)}
                    className="w-full border-2 border-red-500 text-red-500 py-3 font-headline font-black uppercase text-xs hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Terminate Record
                  </button>
                  {isEditing && (
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="w-full border-2 border-zinc-700 text-zinc-500 py-3 font-headline font-black uppercase text-xs hover:bg-zinc-700 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-10">
                <div>
                  {isEditing ? (
                    <input 
                      name="name"
                      value={editingMember?.name || ''}
                      onChange={handleEditInputChange}
                      className="text-4xl md:text-6xl font-black font-headline uppercase tracking-tighter text-white leading-none mb-2 bg-black/50 border-b-2 border-primary w-full outline-none"
                    />
                  ) : (
                    <h3 className="text-4xl md:text-6xl font-black font-headline uppercase tracking-tighter text-white leading-none mb-2">
                      {selectedMember.name}
                    </h3>
                  )}
                  {isEditing ? (
                    <select 
                      name="tier"
                      value={editingMember?.tier || 'Beginner'}
                      onChange={handleEditInputChange}
                      className="text-primary bg-black font-headline font-bold uppercase tracking-widest outline-none"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Expert">Expert</option>
                    </select>
                  ) : (
                    <p className="text-primary font-headline font-bold uppercase tracking-widest">{selectedMember.tier} Classification</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="bg-black p-4 border-l-4 border-primary">
                      <p className="text-[10px] text-zinc-500 font-headline font-black uppercase tracking-widest mb-1">Contact Intel</p>
                      {isEditing ? (
                        <div className="space-y-2 mt-2">
                          <input 
                            name="email"
                            value={editingMember?.email || ''}
                            disabled // Email usually fixed for account
                            className="font-headline font-bold text-white bg-zinc-900 border-b border-zinc-800 w-full p-2 text-sm opacity-50"
                          />
                          <input 
                            name="phone"
                            value={editingMember?.phone || ''}
                            onChange={handleEditInputChange}
                            placeholder="PHONE NUMBER"
                            className="font-headline font-bold text-white bg-zinc-900 border-b border-zinc-800 w-full p-2 text-sm"
                          />
                          <input 
                            name="address"
                            value={editingMember?.address || ''}
                            onChange={handleEditInputChange}
                            placeholder="ADDRESS"
                            className="font-headline font-bold text-white bg-zinc-900 border-b border-zinc-800 w-full p-2 text-sm"
                          />
                        </div>
                      ) : (
                        <>
                          <p className="font-headline font-bold text-white">{selectedMember.email}</p>
                          {selectedMember.phone && <p className="font-headline text-zinc-400 text-xs mt-1">{selectedMember.phone}</p>}
                          {selectedMember.address && <p className="font-headline text-zinc-600 text-[10px] mt-1">{selectedMember.address}</p>}
                        </>
                      )}
                    </div>
                    <div className="bg-black p-4 border-l-4 border-primary flex justify-between items-center">
                      <div>
                        <p className="text-[10px] text-zinc-500 font-headline font-black uppercase tracking-widest mb-1">Subscription Status</p>
                        {isEditing ? (
                          <input 
                            name="subscriptionEnd"
                            type="date"
                            value={editingMember?.subscriptionEnd || ''}
                            onChange={handleEditInputChange}
                            className="font-headline font-bold text-white bg-zinc-900 border-b border-zinc-800 w-full p-2 text-sm"
                          />
                        ) : (
                          <p className="font-headline font-bold text-white">
                            Ends: {selectedMember.subscriptionEnd || 'N/A'}
                          </p>
                        )}
                      </div>
                      {!isEditing && (
                        <button 
                          onClick={() => setShowRenewModal(selectedMember)}
                          className="bg-primary text-black font-headline font-black px-4 py-2 uppercase text-[10px] hover:bg-white transition-all"
                        >
                          Renew Sub
                        </button>
                      )}
                    </div>
                    <div className={cn(
                      "bg-black p-4 border-l-4",
                      selectedMember.fcmToken ? "border-primary" : "border-zinc-700"
                    )}>
                      <p className="text-[10px] text-zinc-500 font-headline font-black uppercase tracking-widest mb-1">COMMS STATUS</p>
                      <div className="flex items-center gap-2">
                        {selectedMember.fcmToken ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                            <span className="font-headline font-bold text-white uppercase text-xs">ENCRYPTED SYNC ACTIVE</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-zinc-600" />
                            <span className="font-headline font-bold text-zinc-500 uppercase text-xs">DEVICE OFF-GRID</span>
                          </>
                        )}
                      </div>
                      {selectedMember.lastSync && (
                        <p className="text-[8px] text-zinc-600 font-headline uppercase mt-1">Last Contact: {new Date(selectedMember.lastSync).toLocaleString()}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-black p-4 border-l-4 border-primary">
                      <p className="text-[10px] text-zinc-500 font-headline font-black uppercase tracking-widest mb-1">Biometric Data</p>
                      <div className="flex flex-wrap gap-8">
                        <div>
                          <span className="text-[10px] text-zinc-600 block">HEIGHT</span>
                          {isEditing ? (
                            <input 
                              name="height"
                              type="number"
                              value={editingMember?.height || 0}
                              onChange={handleEditInputChange}
                              className="font-headline font-bold text-xl bg-zinc-900 border-b border-zinc-800 w-20 p-1 text-white"
                            />
                          ) : (
                            <span className="font-headline font-bold text-xl">{selectedMember.height} CM</span>
                          )}
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-600 block">WEIGHT</span>
                          {isEditing ? (
                            <input 
                              name="weight"
                              type="number"
                              value={editingMember?.weight || 0}
                              onChange={handleEditInputChange}
                              className="font-headline font-bold text-xl bg-zinc-900 border-b border-zinc-800 w-20 p-1 text-white"
                            />
                          ) : (
                            <span className="font-headline font-bold text-xl">{selectedMember.weight} KG</span>
                          )}
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-600 block">GENDER</span>
                          {isEditing ? (
                            <select 
                              name="gender"
                              value={editingMember?.gender || 'Male'}
                              onChange={handleEditInputChange}
                              className="font-headline font-bold text-xl bg-zinc-900 border-b border-zinc-800 w-32 p-1 text-white uppercase"
                            >
                              <option value="Male">MALE</option>
                              <option value="Female">FEMALE</option>
                            </select>
                          ) : (
                            <span className="font-headline font-bold text-xl uppercase">{selectedMember.gender || 'MALE'}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="bg-black p-4 border-l-4 border-primary">
                      <p className="text-[10px] text-zinc-500 font-headline font-black uppercase tracking-widest mb-1">Training Focus</p>
                      {isEditing ? (
                        <select 
                          name="focus"
                          value={editingMember?.focus || 'Hypertrophy'}
                          onChange={handleEditInputChange}
                          className="font-headline font-bold text-white uppercase italic bg-zinc-900 border-b border-zinc-800 w-full p-2"
                        >
                          <option value="Hypertrophy">Hypertrophy</option>
                          <option value="Strength">Strength</option>
                          <option value="Endurance">Endurance</option>
                          <option value="Mobility">Mobility</option>
                        </select>
                      ) : (
                        <p className="font-headline font-bold text-white uppercase italic">{selectedMember.focus}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-black p-6 border border-zinc-800">
                  <h4 className="font-headline font-black uppercase text-sm text-primary mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Medical Clearance / Risk Factors
                  </h4>
                  {isEditing ? (
                    <textarea 
                      name="medical"
                      value={editingMember?.medical || ''}
                      onChange={handleEditInputChange}
                      className="text-white text-sm leading-relaxed uppercase font-headline font-bold bg-zinc-900 border border-zinc-800 w-full p-4 min-h-[120px] outline-none focus:border-primary"
                    />
                  ) : (
                    <p className="text-zinc-400 text-sm leading-relaxed uppercase font-headline font-bold">
                      {selectedMember.medical || 'NO CRITICAL RISK FACTORS LOGGED.'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
      {/* Renew Subscription Modal */}
      {showRenewModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-zinc-900 border-t-8 border-primary p-8 max-w-md w-full animate-in zoom-in-95 duration-200">
            <h3 className="font-headline font-black text-2xl text-white mb-2 uppercase tracking-tighter">Renew Subscription</h3>
            <p className="text-zinc-500 font-headline text-[10px] uppercase tracking-widest mb-6">{showRenewModal.name}</p>
            
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-primary font-black font-headline uppercase tracking-widest">Select Duration</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setRenewMonths(1)}
                    className={cn(
                      "py-4 font-headline font-black uppercase text-xs transition-all border-2",
                      renewMonths === 1 ? "bg-primary border-primary text-black" : "bg-black border-zinc-800 text-zinc-500"
                    )}
                  >
                    1 Month ($40)
                  </button>
                  <button 
                    onClick={() => setRenewMonths(3)}
                    className={cn(
                      "py-4 font-headline font-black uppercase text-xs transition-all border-2",
                      renewMonths === 3 ? "bg-primary border-primary text-black" : "bg-black border-zinc-800 text-zinc-500"
                    )}
                  >
                    3 Months ($120)
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setShowRenewModal(null)}
                  className="bg-zinc-800 text-white font-headline font-black py-4 uppercase text-xs hover:bg-zinc-700 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleRenewSubscription}
                  className="bg-primary text-black font-headline font-black py-4 uppercase text-xs hover:bg-white transition-all"
                >
                  Confirm Renewal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-zinc-900 border-t-8 border-red-500 p-8 max-w-md w-full animate-in zoom-in-95 duration-200">
            <h3 className="font-headline font-black text-2xl text-white mb-4 uppercase tracking-tighter">Confirm Termination</h3>
            <p className="text-zinc-400 font-headline text-sm mb-8 uppercase tracking-widest leading-relaxed">
              Are you sure you want to permanently remove this personnel from the tactical database? This action cannot be undone.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setShowDeleteConfirm(null)}
                className="bg-zinc-800 text-white font-headline font-black py-4 uppercase text-xs hover:bg-zinc-700 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDeleteMember(showDeleteConfirm)}
                className="bg-red-500 text-white font-headline font-black py-4 uppercase text-xs hover:bg-red-600 transition-all"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
