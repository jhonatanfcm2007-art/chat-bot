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
        <div className="flex-grow p-8 bg-background overflow-y-auto">
            <div className="max-w-4xl mx-auto">
                <div className="mb-10 text-center">
                    <h1 className="text-3xl font-black text-on-surface tracking-tight">WhatsApp Cloud API</h1>
                    <p className="text-on-surface-variant text-sm mt-2">Manage your official Meta WhatsApp connection securely.</p>
                </div>

                <div className="grid grid-cols-1 gap-10 items-start">
                    {/* Status Card */}
                    <div className="bg-white p-10 rounded-[3rem] border border-outline-variant shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                        
                        <div className="flex flex-col items-center text-center relative">
                            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-xl transition-all duration-500 scale-110 ${
                                status === 'CONNECTED' ? 'bg-tertiary text-white' : 'bg-secondary-bg text-on-surface-variant'
                            }`}>
                                <span className="material-symbols-outlined text-4xl">
                                    {status === 'CONNECTED' ? 'verified_user' : 'lock_reset'}
                                </span>
                            </div>
                            
                            <h2 className="text-2xl font-black text-on-surface mb-2">{status === 'CONNECTED' ? 'API Active' : 'Setup Required'}</h2>
                            <p className="text-sm font-bold text-on-surface-variant opacity-70 mb-8 max-w-[340px] leading-relaxed">
                                {message}
                            </p>

                            {status === 'CONNECTED' && (
                                <div className="w-full space-y-4 text-left bg-secondary-bg/30 p-6 rounded-3xl border border-outline-variant/50">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-on-surface-variant opacity-50 mb-1">Webhook URL (Meta Console)</p>
                                        <code className="text-[11px] font-mono bg-white px-3 py-2 rounded-lg border border-outline-variant block">
                                            https://tu-dominio.com/webhook
                                        </code>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-on-surface-variant opacity-50 mb-1">Verify Token</p>
                                        <code className="text-[11px] font-mono bg-white px-3 py-2 rounded-lg border border-outline-variant block">
                                            {/* Podríamos emitir el token por socket si quisiéramos mostrarlo aquí */}
                                            (Check your .env VERIFY_TOKEN)
                                        </code>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Instructions Card */}
                    <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-outline-variant/40">
                        <h3 className="text-lg font-black text-on-surface mb-6 px-4">Meta Cloud Setup Steps</h3>
                        <div className="space-y-4">
                            {[
                                { step: 1, title: 'Meta Developer Portal', desc: 'Create an app at developers.facebook.com and add WhatsApp product.' },
                                { step: 2, title: 'Configure Webhook', desc: 'Paste the Webhook URL above in Meta console with your Verify Token.' },
                                { step: 3, title: 'Subscribe to Messages', desc: 'In Webhook settings, subscribe to "messages" to receive incoming chats.' }
                            ].map((item) => (
                                <div key={item.step} className="flex items-start gap-4 p-4 hover:bg-primary/5 rounded-2xl transition-colors">
                                    <div className="w-8 h-8 shrink-0 rounded-full bg-primary text-white flex items-center justify-center text-xs font-black">{item.step}</div>
                                    <div>
                                        <h4 className="text-xs font-black text-on-surface uppercase tracking-tight">{item.title}</h4>
                                        <p className="text-[11px] font-bold text-on-surface-variant leading-tight mt-1">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WhatsAppConnector;
