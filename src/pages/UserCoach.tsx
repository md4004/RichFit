import React, { useState, useRef, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Brain, Send, Camera, PlusCircle, ZoomIn, User, BarChart, Loader2, X, Settings2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GoogleGenAI } from "@google/genai";
import { useAuth } from '@/AuthContext';
import { db, doc, getDoc, setDoc, OperationType, handleFirestoreError } from '@/firebase';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Message {
  id: string;
  role: 'ai' | 'user';
  text: string;
  time: string;
  image?: string;
  isScan?: boolean;
}

export default function UserCoach() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '1', 
      role: 'ai', 
      text: "System scan complete. I'm ready to analyze your performance and nutrition. Ask me anything or upload a photo of your meal for a macro breakdown.",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Snapshot State
  const [isEditingSnapshot, setIsEditingSnapshot] = useState(false);
  const [snapshot, setSnapshot] = useState({
    caloriesCurrent: 2450,
    caloriesGoal: 3000,
    proteinCurrent: 185,
    proteinGoal: 200,
    carbsCurrent: 210,
    carbsGoal: 300,
    fatsCurrent: 65,
    fatsGoal: 80,
    coachAdvice: "Current intake is optimal for hypertrophy phase. Increase carb loading by 15% before tonight's high-intensity session."
  });

  useEffect(() => {
    if (!user) return;
    const fetchSnapshot = async () => {
      try {
        const docRef = doc(db, 'snapshots', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSnapshot(docSnap.data() as any);
        }
      } catch (error) {
        console.error("Error fetching snapshot:", error);
      }
    };
    fetchSnapshot();
  }, [user]);

  const saveSnapshot = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'snapshots', user.uid), snapshot);
      setIsEditingSnapshot(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `snapshots/${user.uid}`);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const fileToPart = async (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = (reader.result as string).split(',')[1];
        resolve({
          inlineData: {
            data: base64Data,
            mimeType: file.type,
          },
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      image: imagePreview || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    const currentImage = selectedImage;
    const currentPreview = imagePreview;
    setSelectedImage(null);
    setImagePreview(null);
    setLoading(true);

    try {
      let responseText = '';
      if (currentImage) {
        const imagePart = await fileToPart(currentImage);
        const prompt = input || "Analyze this food and provide a macro breakdown (Protein, Carbs, Fats) and estimated calories.";
        const result = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: { parts: [imagePart, { text: prompt }] },
          config: {
            systemInstruction: "You are an elite AI Fitness Coach and Nutritionist. When analyzing food, be precise with macro estimates. Use a tactical, professional, and encouraging tone."
          }
        });
        responseText = result.text || "I couldn't analyze that image. Please try again.";
      } else {
        const result = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite-preview",
          contents: input,
          config: {
            systemInstruction: "You are an elite AI Fitness Coach and Nutritionist. Provide concise, tactical advice on training and nutrition. Use a professional and encouraging tone."
          }
        });
        responseText = result.text || "I'm having trouble connecting to my tactical database. Please try again.";
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: responseText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isScan: !!currentImage
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("AI Coach Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: "Tactical error encountered. Connection to AI core interrupted. Please check your network and try again.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="mb-8 border-l-4 border-primary pl-6 py-2">
        <h2 className="font-headline text-4xl font-extrabold uppercase tracking-tighter text-white">AI COACH <span className="text-primary">v2.0</span></h2>
        <p className="font-headline text-zinc-500 text-sm tracking-widest uppercase">Tactical Nutrition & Performance Analysis</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Snapshot */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface-container-lowest border-2 border-white p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline text-xl font-bold uppercase flex items-center gap-2">
                <BarChart className="text-primary w-5 h-5" />
                Daily Snapshot
              </h3>
              <button 
                onClick={() => isEditingSnapshot ? saveSnapshot() : setIsEditingSnapshot(true)}
                className="text-zinc-500 hover:text-primary transition-colors"
              >
                {isEditingSnapshot ? <Save className="w-5 h-5" /> : <Settings2 className="w-5 h-5" />}
              </button>
            </div>
            
            <div className="space-y-8">
              <div className="relative">
                <div className="flex justify-between items-end mb-2">
                  <span className="font-headline text-xs uppercase text-zinc-400">Calories</span>
                  {isEditingSnapshot ? (
                    <div className="flex items-center gap-1">
                      <input 
                        type="number" 
                        value={snapshot.caloriesCurrent}
                        onChange={(e) => setSnapshot({...snapshot, caloriesCurrent: Number(e.target.value)})}
                        className="bg-zinc-900 border-none text-white font-headline text-sm w-16 p-1 text-right"
                      />
                      <span className="text-xs text-zinc-500">/</span>
                      <input 
                        type="number" 
                        value={snapshot.caloriesGoal}
                        onChange={(e) => setSnapshot({...snapshot, caloriesGoal: Number(e.target.value)})}
                        className="bg-zinc-900 border-none text-white font-headline text-sm w-16 p-1"
                      />
                    </div>
                  ) : (
                    <span className="font-headline text-2xl font-black text-white">
                      {snapshot.caloriesCurrent.toLocaleString()} <span className="text-xs text-zinc-500">/ {snapshot.caloriesGoal.toLocaleString()}</span>
                    </span>
                  )}
                </div>
                <div className="h-4 bg-zinc-900 overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500" 
                    style={{ width: `${Math.min((snapshot.caloriesCurrent / snapshot.caloriesGoal) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {[
                  { label: 'Protein', current: snapshot.proteinCurrent, goal: snapshot.proteinGoal, key: 'protein', color: 'bg-primary' },
                  { label: 'Carbs', current: snapshot.carbsCurrent, goal: snapshot.carbsGoal, key: 'carbs', color: 'bg-white' },
                  { label: 'Fats', current: snapshot.fatsCurrent, goal: snapshot.fatsGoal, key: 'fats', color: 'bg-zinc-600' },
                ].map((macro) => (
                  <div key={macro.label} className="flex items-center justify-between p-3 bg-zinc-900/50">
                    <div className="flex flex-col flex-1">
                      <span className="font-headline text-[10px] uppercase text-zinc-500">{macro.label}</span>
                      {isEditingSnapshot ? (
                        <div className="flex items-center gap-1">
                          <input 
                            type="number" 
                            value={macro.current}
                            onChange={(e) => setSnapshot({...snapshot, [`${macro.key}Current`]: Number(e.target.value)})}
                            className="bg-zinc-950 border-none text-white font-headline text-sm w-12 p-1"
                          />
                          <span className="text-xs text-zinc-500">/</span>
                          <input 
                            type="number" 
                            value={macro.goal}
                            onChange={(e) => setSnapshot({...snapshot, [`${macro.key}Goal`]: Number(e.target.value)})}
                            className="bg-zinc-950 border-none text-white font-headline text-sm w-12 p-1"
                          />
                          <span className="text-[10px] text-zinc-500 ml-1">G</span>
                        </div>
                      ) : (
                        <span className="font-headline text-lg font-bold text-white">
                          {macro.current}g <span className="text-xs text-zinc-500 font-normal">/ {macro.goal}g</span>
                        </span>
                      )}
                    </div>
                    <div className="w-16 h-1 bg-zinc-800 relative">
                      <div 
                        className={cn("absolute inset-0 transition-all duration-500", macro.color)}
                        style={{ width: `${Math.min((macro.current / macro.goal) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-800">
              {isEditingSnapshot ? (
                <textarea 
                  value={snapshot.coachAdvice}
                  onChange={(e) => setSnapshot({...snapshot, coachAdvice: e.target.value})}
                  className="w-full bg-zinc-900 border-none text-xs text-white font-body p-2 h-20 resize-none"
                  placeholder="Coach's tactical advice..."
                />
              ) : (
                <p className="text-xs text-zinc-400 font-body leading-relaxed italic">
                  "{snapshot.coachAdvice}"
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Chat */}
        <div className="lg:col-span-8 flex flex-col h-[618px] bg-surface-container-lowest border-2 border-white relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-white"></div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex gap-4 max-w-[85%]", msg.role === 'user' && "ml-auto flex-row-reverse")}>
                <div className={cn("w-10 h-10 flex items-center justify-center shrink-0", msg.role === 'ai' ? "bg-primary" : "bg-white")}>
                  {msg.role === 'ai' ? <Brain className="text-black font-bold w-6 h-6" /> : <User className="text-black font-bold w-6 h-6" />}
                </div>
                <div className={cn("space-y-2", msg.role === 'user' && "flex flex-col items-end")}>
                  <div className={cn("p-4", msg.role === 'ai' ? "bg-zinc-900" : "bg-primary", msg.isScan && "border-l-4 border-primary")}>
                    {msg.isScan && <p className="text-sm font-headline font-bold text-primary mb-3 uppercase tracking-widest">Meal Scan Complete:</p>}
                    <p className={cn("text-sm font-body leading-relaxed whitespace-pre-line", msg.role === 'user' ? "text-black font-medium" : "text-white")}>
                      {msg.text}
                    </p>
                  </div>
                  {msg.image && (
                    <div className="w-48 h-32 bg-zinc-800 relative mt-2 group overflow-hidden border border-zinc-700">
                      <img src={msg.image} alt="Meal" className="w-full h-full object-cover opacity-90" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ZoomIn className="text-white w-6 h-6" />
                      </div>
                    </div>
                  )}
                  <span className="font-headline text-[10px] text-zinc-600 uppercase font-bold tracking-widest">
                    {msg.role === 'ai' ? 'Coach AI' : 'You'} • {msg.time}
                  </span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-4 max-w-[85%]">
                <div className="w-10 h-10 bg-primary flex items-center justify-center shrink-0">
                  <Brain className="text-black font-bold w-6 h-6" />
                </div>
                <div className="bg-zinc-900 p-4 flex items-center gap-3">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <span className="text-xs font-headline font-bold text-zinc-500 uppercase tracking-widest">Analyzing Tactical Data...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-black border-t-2 border-zinc-900">
            {imagePreview && (
              <div className="mb-4 relative inline-block">
                <img src={imagePreview} alt="Preview" className="w-24 h-24 object-cover border-2 border-primary" />
                <button 
                  onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <p className="text-[10px] text-zinc-500 font-headline font-bold uppercase mb-2 ml-2 tracking-widest">
              Ask a question or snap a photo of your food to see its macros!
            </p>
            <div className="flex gap-2 items-center">
              <div className="flex-1 relative">
                <input 
                  className="w-full bg-zinc-900 border-none focus:ring-0 text-white font-headline placeholder:text-zinc-600 px-4 h-12 uppercase text-sm tracking-widest pr-12" 
                  placeholder="ASK THE AI..." 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  disabled={loading}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-primary transition-colors"
                >
                  <Camera className="w-6 h-6" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageSelect}
                />
              </div>
              <button 
                onClick={handleSend}
                disabled={loading || (!input.trim() && !selectedImage)}
                className="w-12 h-12 bg-primary flex items-center justify-center text-black active:scale-95 transition-transform disabled:opacity-50 disabled:grayscale"
              >
                <Send className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
