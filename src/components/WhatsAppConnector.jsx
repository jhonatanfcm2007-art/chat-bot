import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

const WhatsAppConnector = () => {
    const [status, setStatus] = useState('DISCONNECTED');
    const [message, setMessage] = useState('Checking connection to Meta...');

    useEffect(() => {
        socket.on('connect', () => {
            console.log('Connected to socket server');
        });

        socket.on('status', (data) => {
            setStatus(data);
            if (data === 'CONNECTED') {
                setMessage('Meta Cloud API is active and ready.');
            } else {
                setMessage('Please configure WHATSAPP_TOKEN and WHATSAPP_PHONE_ID in your .env file.');
            }
        });

        return () => {
            socket.off('status');
        };
    }, []);

  return (
    <div className="flex-grow p-8 md:p-14 bg-background overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto">
        <div className="mb-14 text-center">
          <h1 className="text-4xl font-semibold text-on-surface tracking-tight font-headline">Meta Cloud Integration</h1>
          <p className="text-on-surface-variant text-xs md:text-sm mt-3 uppercase font-semibold tracking-[0.4em] opacity-40">Secure Neural Relay Service</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-stretch">
          {/* Status Card */}
          <div className="bg-white p-10 rounded-xl border border-slate-200 shadow-2xl relative overflow-hidden group flex flex-col justify-center">
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-1/2 translate-x-1/2 transition-colors duration-700 ${status === 'CONNECTED' ? 'bg-tertiary/10' : 'bg-error/5'}`}></div>
            
            <div className="flex flex-col items-center text-center relative z-10">
              <div className={`w-24 h-24 rounded-xl flex items-center justify-center mb-8 shadow-2xl transition-all duration-700 hover:scale-110 border ${
                status === 'CONNECTED' 
                  ? 'bg-tertiary/20 text-tertiary border-tertiary/20 shadow-tertiary/10' 
                  : 'bg-slate-100 text-on-surface-variant/20 border-slate-200'
              }`}>
                <span className="material-symbols-outlined text-5xl">
                  {status === 'CONNECTED' ? 'verified_user' : 'private_connectivity'}
                </span>
              </div>
              
              <h2 className="text-2xl font-semibold text-on-surface mb-3 tracking-tight">{status === 'CONNECTED' ? 'Uplink Active' : 'Relay Offline'}</h2>
              <p className="text-xs font-bold text-on-surface-variant opacity-50 mb-8 max-w-[340px] leading-relaxed ">
                {message}
              </p>

              {status === 'CONNECTED' && (
                <div className="w-full space-y-6 text-left bg-slate-50 p-8 rounded-xl border border-slate-200">
                  <div className="group/code">
                    <p className="text-xs font-semibold uppercase text-on-surface-variant opacity-40 mb-3 tracking-widest flex items-center justify-between">
                      Webhook End-point
                      <span className="material-symbols-outlined text-xs">content_copy</span>
                    </p>
                    <code className="text-xs font-mono bg-white px-4 py-3 rounded-xl border border-slate-200 block text-primary overflow-x-auto whitespace-nowrap scrollbar-hide">
                      https://vault-relay.com/webhook
                    </code>
                  </div>
                  <div className="group/code">
                    <p className="text-xs font-semibold uppercase text-on-surface-variant opacity-40 mb-3 tracking-widest flex items-center justify-between">
                      Handshake Token
                      <span className="material-symbols-outlined text-xs">vpn_key</span>
                    </p>
                    <code className="text-xs font-mono bg-white px-4 py-3 rounded-xl border border-slate-200 block text-on-surface-variant/40 overflow-x-auto whitespace-nowrap">
                      Check ENV_VAR_01 (Verify Token)
                    </code>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Instructions Card */}
          <div className="bg-white p-10 rounded-xl border border-slate-200 shadow-2xl flex flex-col">
            <h3 className="text-xs font-semibold text-on-surface uppercase tracking-[0.3em] mb-10 flex items-center gap-3">
              <span className="w-2 h-2 bg-primary rounded-full"></span>
              Onboarding Protocol
            </h3>
            <div className="space-y-6 flex-grow">
              {[
                { step: '01', title: 'Meta Portal', desc: 'Secure an app instance at developers.facebook.com and initiate WhatsApp node.' },
                { step: '02', title: 'Sync Webhook', desc: 'Deploy the relay endpoint in Meta console and verify neural handshake.' },
                { step: '03', title: 'Data Stream', desc: 'Subscribe to "messages" to pipe incoming signals into the CRM vault.' }
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-5 p-6 bg-slate-50 rounded-xl border border-transparent hover:border-slate-200 transition-all group">
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-white text-primary flex items-center justify-center text-xs font-semibold border border-slate-200 group-hover:bg-primary group-hover:text-on-primary transition-all duration-300 shadow-lg">{item.step}</div>
                  <div>
                    <h4 className="text-xs font-semibold text-on-surface ">{item.title}</h4>
                    <p className="text-xs font-medium text-on-surface-variant leading-relaxed mt-2 opacity-50 group-hover:opacity-100 transition-opacity">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-10 pt-8 border-t border-slate-200 flex justify-center">
              <p className="text-xs font-semibold text-on-surface-variant/10 uppercase tracking-[0.5em] animate-pulse">Awaiting Manual Configuration</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    );
};

export default WhatsAppConnector;
