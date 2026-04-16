import React from 'react';
import Layout from '@/components/Layout';
import { Phone, MessageCircle, Mail, MapPin, Clock } from 'lucide-react';

export default function UserContact() {
  return (
    <Layout>
      <div className="mb-12">
        <h2 className="font-headline text-5xl font-black uppercase tracking-tighter text-white mb-2 leading-none">
          CONTACT <span className="text-primary">SUPPORT</span>
        </h2>
        <p className="font-headline text-primary font-bold uppercase tracking-widest">Tactical Assistance Available 24/7</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-zinc-900 p-8 border-l-4 border-primary">
            <h3 className="font-headline text-2xl font-black uppercase text-white mb-4">Direct Comms</h3>
            <p className="text-zinc-400 mb-8 text-sm uppercase tracking-wide">Immediate response requested? Use the channels below.</p>
            
            <div className="space-y-4">
              <a 
                href="tel:+9613032913" 
                className="flex items-center gap-4 bg-black p-4 border border-zinc-800 hover:border-primary transition-all group"
              >
                <div className="w-12 h-12 bg-zinc-800 flex items-center justify-center group-hover:bg-primary transition-colors">
                  <Phone className="w-6 h-6 text-primary group-hover:text-black" />
                </div>
                <div>
                  <p className="font-headline text-[10px] text-zinc-500 uppercase font-bold">Voice Line</p>
                  <p className="font-headline text-lg font-bold text-white">+961 3 032 913</p>
                </div>
              </a>

              <a 
                href="https://wa.me/9613032913" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 bg-black p-4 border border-zinc-800 hover:border-primary transition-all group"
              >
                <div className="w-12 h-12 bg-zinc-800 flex items-center justify-center group-hover:bg-green-500 transition-colors">
                  <MessageCircle className="w-6 h-6 text-green-500 group-hover:text-black" />
                </div>
                <div>
                  <p className="font-headline text-[10px] text-zinc-500 uppercase font-bold">WhatsApp Protocol</p>
                  <p className="font-headline text-lg font-bold text-white">Secure Messaging</p>
                </div>
              </a>
            </div>
          </div>

          <div className="bg-zinc-900 p-8 border-l-4 border-zinc-700">
            <h3 className="font-headline text-xl font-black uppercase text-white mb-6">Facility Intel</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <MapPin className="w-5 h-5 text-primary mt-1" />
                <div>
                  <p className="font-headline text-xs font-bold text-white uppercase">HQ Location</p>
                  <p className="text-zinc-400 text-sm">Biakout Municipality, Lebanon.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Clock className="w-5 h-5 text-primary mt-1" />
                <div>
                  <p className="font-headline text-xs font-bold text-white uppercase">Operational Hours</p>
                  <p className="text-zinc-400 text-sm">Mon-Fri: 09:30 - 23:00<br />Sat: 09:00 - 16:00</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative h-full min-h-[400px] bg-zinc-900 overflow-hidden border border-zinc-800 group">
          <img 
            src="https://i.postimg.cc/ZBKZP8L8/muscles-loading.jpg" 
            alt="Facility" 
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 opacity-80"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
          
          <div className="absolute bottom-8 left-8 right-8">
            <h4 className="font-headline text-3xl font-black text-white uppercase leading-tight mb-2">Elite Training Grounds</h4>
            <p className="text-primary font-headline font-bold uppercase tracking-widest text-xs">RichFit Gym - Established 2025</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
