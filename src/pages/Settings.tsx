import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Bell, Shield, Smartphone, ArrowRight, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Settings() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') {
      alert('This device does not support notifications.');
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    
    if (result === 'granted') {
      new Notification('RICHFIT PROTOCOL ACTIVE', {
        body: 'Deployment successful. Tactical notifications are now live.',
        icon: '/icon.png'
      });
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
                <p className="text-[10px] text-zinc-500 font-headline font-black uppercase tracking-widest mb-1">Current Status</p>
                <div className="flex items-center gap-2">
                  {getStatusIcon()}
                  <span className={cn("font-headline font-bold uppercase tracking-tight", getStatusColor())}>
                    {permission === 'default' ? 'PENDING AUTHORIZATION' : permission.toUpperCase()}
                  </span>
                </div>
              </div>
              {permission !== 'granted' && (
                <button 
                  onClick={requestPermission}
                  className="bg-primary text-black font-headline font-black px-6 py-3 uppercase text-xs hover:bg-white transition-all active:scale-95 flex items-center gap-2"
                >
                  Enable Notifications
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="mt-6 pt-6 border-t border-zinc-900">
              <p className="text-zinc-500 text-xs leading-relaxed uppercase font-headline font-medium">
                {permission === 'granted' 
                  ? 'COMMUNICATION LINES SECURE. YOU WILL RECEIVE REAL-TIME WORKOUT ALERTS, STOCK UPDATES, AND SUBSCRIPTION WARNINGS.' 
                  : 'NOTIFICATIONS ARE CURRENTLY RESTRICTED. YOU MAY MISS CRITICAL TACTICAL UPDATES AND SESSION REMINDERS.'}
              </p>
            </div>
          </div>
        </section>

        {/* Other Settings Placeholder */}
        <section className="bg-zinc-900 border-t-4 border-zinc-700 p-8">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-6 h-6 text-zinc-500" />
            <h3 className="font-headline text-2xl font-black uppercase text-white opacity-50">App Permissions</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-black border border-zinc-800 opacity-50">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-zinc-600" />
                <span className="font-headline font-bold text-xs uppercase text-zinc-400">Background Data Sync</span>
              </div>
              <div className="w-10 h-5 bg-zinc-800 rounded-full relative">
                <div className="absolute left-1 top-1 w-3 h-3 bg-zinc-600 rounded-full"></div>
              </div>
            </div>
          </div>
        </section>

        <div className="bg-primary/5 p-6 border border-primary/20">
          <p className="text-[9px] text-primary/60 font-headline font-black uppercase tracking-[0.2em] leading-relaxed">
            Note: Android APK users must also ensure that "Notifications" are enabled in the Phone Settings {'>'} App Info {'>'} RichFit induction portal.
          </p>
        </div>
      </div>
    </Layout>
  );
}
