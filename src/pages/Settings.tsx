import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Bell, Shield, Smartphone, ArrowRight, CheckCircle2, XCircle, AlertCircle, Server, RefreshCw, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

const CURRENT_VERSION = '1.0.2';
const VERSION_JSON_URL = 'https://richfit-236411176275.us-west1.run.app/version.json';
const G_DRIVE_LINK = 'https://drive.google.com/uc?export=download&id=19u4sZ1HgXLumIEhoy17Hct5zGLQFkr2S';

export default function Settings() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [swReady, setSwReady] = useState(false);
  const [bgSync, setBgSync] = useState(true);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Update State
  const [isChecking, setIsChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateDetails, setUpdateDetails] = useState<{ version: string; whatsNew: string[] } | null>(null);
  const [updateMessage, setUpdateMessage] = useState<string>('');

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => setSwReady(true));
    }
    // Check if token already exists in profile
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('fcm_token_cache');
      setFcmToken(savedToken);
    }
  }, []);

  const syncFcmToken = async () => {
    import('@/firebase').then(async ({ messaging, getToken, db, doc, updateDoc, auth }) => {
      if (!messaging || !auth.currentUser) return;
      setIsSyncing(true);
      try {
        const token = await getToken(messaging);
        if (token) {
          await updateDoc(doc(db, 'users', auth.currentUser.uid), {
            fcmToken: token,
            lastSync: new Date().toISOString()
          });
          setFcmToken(token);
          localStorage.setItem('fcm_token_cache', token);
          alert("TACTICAL SYNC COMPLETE: DEVICE TOKEN SECURED IN FIRESTORE.");
        }
      } catch (e) {
        console.error(e);
        alert("SYNC FAILURE: ENSURE NOTIFICATIONS ARE GRANTED BEFORE SYNCING.");
      } finally {
        setIsSyncing(false);
      }
    });
  };

  const checkForUpdates = async () => {
    setIsChecking(true);
    setUpdateMessage('');
    try {
      // Append timestamp to bypass web-view caching
      const response = await fetch(`${VERSION_JSON_URL}?t=${Date.now()}`);
      if (!response.ok) throw new Error('NETWORK DISRUPTION');
      
      const data = await response.json();
      
      if (data.version !== CURRENT_VERSION) {
        setUpdateAvailable(true);
        setUpdateDetails(data);
      } else {
        setUpdateMessage(`TACTICAL BUILD [${CURRENT_VERSION}] IS UP TO DATE.`);
      }
    } catch (error) {
      console.error("Update protocol failed:", error);
      setUpdateMessage('CRITICAL: CONNECTION TO UPDATE SERVER FAILED. RETRY IN SECURE ZONE.');
    } finally {
      setIsChecking(false);
    }
  };

  const requestPermission = async () => {
    try {
      if (typeof Notification === 'undefined') {
        alert('CRITICAL FAILURE: THE NOTIFICATION API IS COMPLETELY MISSING FROM THIS DEVICE. IF YOU ARE USING AN APK, ENSURE THE WEBVIEW PERMISSIONS ARE ENABLED.');
        return;
      }

      console.log("Tactical Permission Request initiated...");
      
      // Handle both Promise and Callback styles for older mobile browsers
      let result: NotificationPermission;
      try {
        const p = Notification.requestPermission();
        if (p && (p as any).then) {
          result = await p;
        } else {
          // Callback style
          result = await new Promise((resolve) => {
            Notification.requestPermission((res) => resolve(res));
          });
        }
      } catch (err) {
        // Fallback for older browsers
        result = await new Promise((resolve) => {
          Notification.requestPermission((res) => resolve(res));
        });
      }

      setPermission(result);
      
      if (result === 'granted') {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          registration.showNotification('RICHFIT PROTOCOL: ACTIVE', {
            body: 'Tactical comms established. You are now synchronized.',
            icon: '/icon.png',
            badge: '/icon.png',
            vibrate: [200, 100, 200]
          } as any);
        } else {
          new Notification('RICHFIT PROTOCOL: ACTIVE', {
            body: 'Tactical comms established. You are now synchronized.',
            icon: '/icon.png'
          });
        }
      } else if (result === 'denied') {
        alert('STATUS: DENIED. YOUR DEVICE IS CURRENTLY BLOCKING THE RICHFIT INDUCTION. YOU MUST MANUALLY RESET PERMISSIONS IN APP INFO > NOTIFICATIONS.');
      }
    } catch (error) {
      console.error("Induction Error Details:", error);
      alert("Induction Blocked: OS/Browser interference detected.");
    }
  };

  const getStatusColor = () => {
    switch (permission) {
      case 'granted': return 'text-primary';
      case 'denied': return 'text-red-500';
      default: return 'text-zinc-500';
    }
  };

  const getStatusIcon = () => {
    switch (permission) {
      case 'granted': return <CheckCircle2 className="w-5 h-5 text-primary" />;
      case 'denied': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <AlertCircle className="w-5 h-5 text-zinc-500" />;
    }
  };

  return (
    <Layout>
      <header className="mb-12">
        <h2 className="font-headline text-5xl font-black uppercase tracking-tighter text-white mb-2 leading-none">
          SYSTEM <span className="text-primary">SETTINGS</span>
        </h2>
        <p className="font-headline text-primary font-bold uppercase tracking-widest">Protocol Configuration & Security</p>
      </header>

      <div className="max-w-4xl space-y-8">
        {/* Notification Status Section */}
        <section className="bg-zinc-900 border-t-4 border-primary p-8">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-6 h-6 text-primary" />
            <h3 className="font-headline text-2xl font-black uppercase text-white">Tactical Notifications</h3>
          </div>

          <div className="bg-black p-6 border border-zinc-800 rounded-lg mb-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-zinc-500 font-headline font-black uppercase tracking-widest mb-1">Authorization Status</p>
                <div className="flex items-center gap-2">
                  {getStatusIcon()}
                  <span className={cn("font-headline font-bold uppercase tracking-tight", getStatusColor())}>
                    {permission === 'default' ? 'PENDING DISCOVERY' : permission.toUpperCase()}
                  </span>
                </div>
              </div>
              
              <button 
                onClick={requestPermission}
                className={cn(
                  "font-headline font-black px-6 py-3 uppercase text-xs transition-all active:scale-95 flex items-center gap-2",
                  permission === 'granted' ? "bg-zinc-800 text-zinc-500 cursor-default" : "bg-primary text-black hover:bg-white"
                )}
              >
                {permission === 'granted' ? 'Established' : 'Enable Link'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="mt-6 pt-6 border-t border-zinc-900">
              <p className="text-zinc-500 text-xs leading-relaxed uppercase font-headline font-medium">
                {permission === 'granted' 
                  ? 'COMMUNICATION LINES SECURE. PUSH PROTOCOLS ARE ACTIVE IN THE BACKGROUND.' 
                  : permission === 'denied' 
                    ? 'CRITICAL ERROR: ACCESS DENIED BY SYSTEM. GO TO PHONE SETTINGS > APPS > RICHFIT > NOTIFICATIONS AND ENABLE PERMISSION MANUALLY.'
                    : 'THE INDUCTION PORTAL IS WAITING FOR YOUR INPUT. CLICK "ENABLE LINK" TO START THE TACTICAL SYNC.'}
              </p>
            </div>

            {permission === 'granted' && (
              <div className="mt-6 p-4 bg-zinc-900 border border-zinc-800 rounded">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[9px] text-zinc-500 font-headline uppercase mb-1">FCM Messaging Token</p>
                    <p className="text-[10px] font-mono text-zinc-400 break-all max-w-[250px]">
                      {fcmToken ? `${fcmToken.substring(0, 30)}...` : 'NOT SYNCED'}
                    </p>
                  </div>
                  <button 
                    onClick={syncFcmToken}
                    disabled={isSyncing}
                    className="bg-zinc-800 text-white text-[10px] font-headline font-black px-4 py-2 uppercase hover:bg-primary hover:text-black transition-all disabled:opacity-50"
                  >
                    {isSyncing ? 'Syncing...' : 'Sync Tactical Token'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* System Update Protocol Section */}
        <section className="bg-zinc-900 border-t-4 border-primary p-8 relative">
          <div className="absolute top-4 right-4 bg-primary/20 border border-primary/30 px-2 py-1 rounded">
            <span className="text-[10px] font-headline font-black text-primary uppercase">v{CURRENT_VERSION}</span>
          </div>
          
          <div className="flex items-center gap-3 mb-6">
            <Server className="w-6 h-6 text-primary" />
            <h3 className="font-headline text-2xl font-black uppercase text-white">System Update Protocol</h3>
          </div>

          <div className="bg-black p-6 border border-zinc-800 rounded-lg">
            {!updateAvailable ? (
              <div className="flex flex-col items-center justify-center py-4">
                <button 
                  onClick={checkForUpdates}
                  disabled={isChecking}
                  className={cn(
                    "font-headline font-black px-10 py-4 uppercase text-xs transition-all active:scale-95 flex items-center gap-3",
                    isChecking ? "bg-zinc-800 text-zinc-500 cursor-default" : "bg-primary text-black hover:bg-white"
                  )}
                >
                  {isChecking ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {isChecking ? 'Checking Server...' : 'Check For Updates'}
                </button>
                {updateMessage && (
                  <p className="mt-4 text-[10px] font-headline font-black text-primary uppercase tracking-widest text-center">
                    {updateMessage}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <div>
                    <p className="text-[10px] text-zinc-500 font-headline font-black uppercase tracking-widest mb-1">New Build Identified</p>
                    <h4 className="font-headline text-3xl font-black text-white uppercase">v{updateDetails?.version}</h4>
                  </div>
                  <div className="bg-primary text-black px-3 py-1 text-[10px] font-headline font-black uppercase">AVAILABLE NOW</div>
                </div>

                <div>
                  <p className="text-[10px] text-primary font-headline font-black uppercase tracking-widest mb-3">Protocol Changelog:</p>
                  <ul className="space-y-2">
                    {updateDetails?.whatsNew.map((item, idx) => (
                      <li key={idx} className="flex gap-3 text-[11px] font-headline text-zinc-400 uppercase leading-tight">
                        <span className="text-primary">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <a 
                  href={G_DRIVE_LINK}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full bg-primary text-black font-headline font-black text-base uppercase py-5 hover:bg-white transition-all flex items-center justify-center gap-4 group animate-pulse shadow-[0_0_20px_rgba(206,1,1,0.3)]"
                >
                  <span>Download & Install Protocol</span>
                  <Download className="w-6 h-6 group-hover:translate-y-1 transition-transform" />
                </a>
              </div>
            )}
          </div>
        </section>

        {/* Other Settings Placeholder */}
        <section className="bg-zinc-900 border-t-4 border-zinc-700 p-8">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-6 h-6 text-zinc-500" />
            <h3 className="font-headline text-2xl font-black uppercase text-white">Advanced Protocols</h3>
          </div>
          <div className="space-y-4">
            <div 
              className={cn(
                "flex justify-between items-center p-6 bg-black border border-zinc-800 cursor-pointer transition-colors",
                bgSync ? "border-primary/40" : "border-zinc-800"
              )}
              onClick={() => setBgSync(!bgSync)}
            >
              <div className="flex items-center gap-3">
                <Smartphone className={cn("w-5 h-5", bgSync ? "text-primary" : "text-zinc-600")} />
                <div>
                  <span className="font-headline font-bold text-xs uppercase text-white block mb-1">Background Protocol Sync</span>
                  <p className="text-[10px] text-zinc-500 font-headline uppercase leading-none">Keeps biometric data updated while offline</p>
                </div>
              </div>
              <div className={cn(
                "w-12 h-6 rounded-full relative transition-colors duration-300",
                bgSync ? "bg-primary" : "bg-zinc-800"
              )}>
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300",
                  bgSync ? "left-7" : "left-1"
                )}></div>
              </div>
            </div>
          </div>
        </section>

        <div className="bg-primary/5 p-6 border border-primary/20">
          <p className="text-[10px] text-primary/80 font-headline font-black uppercase tracking-[0.1em] leading-relaxed mb-4">
            TROUBLESHOOTING APK NOTIFICATIONS:
          </p>
          <ul className="space-y-2 text-[9px] text-zinc-400 font-headline uppercase">
            <li>1. OPEN PHONE SETTINGS {'>'} APPS {'>'} RICHFIT</li>
            <li>2. ENSURE "NOTIFICATIONS" IS TOGGLED ON</li>
            <li>3. ENSURE "BACKGROUND DATA" IS ALLOWED</li>
            <li>4. RESTART THE INDUCTION (CLOSE AND REOPEN THE APP)</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
