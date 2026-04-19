import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Simulator from './components/Simulator';
import AIAssistant from './components/AIAssistant';

import io from 'socket.io-client';

// En producción (Railway) usamos la misma URL base del frontend. En local, el puerto 3001.
const SERVER_URL = import.meta.env.PROD ? window.location.origin : 'http://localhost:3001';
const socket = io(SERVER_URL);

function App() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [chats, setChats] = useState({});
  const [selectedChat, setSelectedChat] = useState(null);
  const [settings, setSettings] = useState({ systemPrompt: '' });
  const [inAppNotification, setInAppNotification] = useState(null);

  const triggerInAppNotification = (title, body, icon) => {
    setInAppNotification({ title, body, icon });
    // Sonido de alerta
    try {
      const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-09a.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch(e) {}
    
    setTimeout(() => {
      setInAppNotification(null);
    }, 5000);
  };

  // Los permisos de notificación ahora se solicitarán de forma manual a través del Header, 
  // ya que navegadores como Safari (iOS) bloquean las peticiones automáticas sin interacción.

  useEffect(() => {
    socket.on('initial_chats', (data) => {
      console.log('Received initial history:', data);
      setChats(data);
    });

    socket.on('initial_settings', (data) => {
      setSettings(data);
    });

    socket.on('human_required', (data) => {
      const title = '¡Atención Requerida!';
      const body = `El cliente ${data.customerName} necesita soporte humano.`;
      
      triggerInAppNotification(title, body, 'support_agent');

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/app_icon.png' });
      }
    });

    socket.on('message', (msg) => {
      setChats(prev => {
        const chatId = msg.from;
        const chatData = prev[chatId] || { 
          customerName: msg.customerName, 
          from: chatId, 
          messages: [] 
        };
        
        // Evitábamos duplicados por ID si el servidor los envía
        if (chatData.messages.some(m => m.id === msg.id)) return prev;

        return {
          ...prev,
          [chatId]: {
            ...chatData,
            messages: [...chatData.messages, { 
              ...msg, 
              content: msg.body, 
              role: msg.role || (msg.isMe ? 'bot' : 'user') 
            }]
          }
        };
      });
    });
    return () => {
      socket.off('message');
      socket.off('initial_chats');
      socket.off('initial_settings');
      socket.off('human_required');
    };
  }, []);
  
  // Cargamos inventario desde el servidor (persistente en Railway)
  const [accounts, setAccounts] = useState([]);

  // Cargar inventario del servidor al iniciar
  useEffect(() => {
    fetch(`${SERVER_URL}/api/inventory`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setAccounts(data);
        } else {
          // Datos de ejemplo si el servidor está vacío en producción
          const fallback = localStorage.getItem('streaming_accounts');
          if (fallback) setAccounts(JSON.parse(fallback));
        }
      })
      .catch(() => {
        // Si el servidor no responde, usamos localStorage como fallback
        const saved = localStorage.getItem('streaming_accounts');
        if (saved) setAccounts(JSON.parse(saved));
      });
  }, []);

  // Escuchar actualizaciones de inventario desde el servidor (tiempo real)
  useEffect(() => {
    socket.on('inventory_updated', (data) => {
      if (Array.isArray(data)) setAccounts(data);
    });
    return () => {
      socket.off('inventory_updated');
      socket.off('sales_updated');
    };
  }, []);

  const [salesHistory, setSalesHistory] = useState([]);

  // Cargar ventas del servidor al iniciar
  useEffect(() => {
    fetch(`${SERVER_URL}/api/sales`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setSalesHistory(data);
        } else {
          const fallback = localStorage.getItem('streaming_sales');
          if (fallback) setSalesHistory(JSON.parse(fallback));
        }
      })
      .catch(() => {
        const saved = localStorage.getItem('streaming_sales');
        if (saved) setSalesHistory(JSON.parse(saved));
      });
  }, []);

  // Escuchar actualizaciones de ventas en tiempo real
  useEffect(() => {
    socket.on('sales_updated', (data) => {
      if (Array.isArray(data)) {
        setSalesHistory(prev => {
          if (data.length > prev.length && prev.length > 0) {
             const title = '¡Nueva Venta!';
             const body = `Se ha registrado una venta de ${data[0].service} por $${data[0].price}`;
             
             triggerInAppNotification(title, body, 'local_mall');
             
             if ('Notification' in window && Notification.permission === 'granted') {
               new Notification(title, { body, icon: '/app_icon.png' });
             }
          }
          return data;
        });
      }
    });
    return () => socket.off('sales_updated');
  }, []);

  // Guardar inventario en servidor + localStorage cada vez que cambia
  useEffect(() => {
    if (accounts.length === 0) return; // No sobreescribir antes de cargar
    localStorage.setItem('streaming_accounts', JSON.stringify(accounts));
    // Persistir en el servidor via WebSocket
    socket.emit('sync_inventory', accounts);
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('streaming_sales', JSON.stringify(salesHistory));
    if (salesHistory.length > 0) {
      socket.emit('sync_sales', salesHistory);
    }
  }, [salesHistory]);

  const handleSale = (account) => {
    if (account.uses <= 0) return;
    
    const costPerSlot = (account.cost || 0) / (account.originalUses || 1);
    const newSale = {
      id: Date.now(),
      service: account.service,
      price: account.price,
      cost: costPerSlot,
      provider: account.provider || 'N/A',
      date: new Date().toISOString().split('T')[0],
      customer: 'Venta Directa'
    };

    setSalesHistory([newSale, ...salesHistory]);
    setAccounts(accounts.map(acc => 
      acc.id === account.id 
        ? { ...acc, uses: acc.uses - 1, status: acc.uses - 1 === 0 ? 'Sold' : 'Available' } 
        : acc
    ));
  };


  const handleSendMessage = (messageData) => {
    // messageData: { to: '...', content: '...' }
    socket.emit('send_message', messageData);
    
    setChats(prev => {
      const to = messageData.to;
      const existingMessages = prev[to]?.messages || [];
      return {
        ...prev,
        [to]: {
          ...prev[to],
          messages: [...existingMessages, { content: messageData.content, isMe: true, role: 'bot', timestamp: new Date().toLocaleTimeString() }]
        }
      };
    });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'inventory':
        return <Inventory accounts={accounts} setAccounts={setAccounts} onSale={handleSale} />;
      case 'simulator':
        return (
          <Simulator 
            chats={chats} 
            selectedChat={selectedChat} 
            onSelectChat={setSelectedChat}
            onSendMessage={handleSendMessage} 
          />
        );
      case 'ai_assistant':
        return (
          <AIAssistant 
            settings={settings}
            socket={socket}
          />
        );
      case 'analytics':
      case 'dashboard':
      default:
        return <Dashboard accounts={accounts} salesHistory={salesHistory} />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}

      {/* In-App Notification (Toast) */}
      {inAppNotification && (
        <div className="fixed top-4 right-4 md:top-6 md:right-6 z-[1000] animate-in slide-in-from-top-10 fade-in duration-300">
          <div className="bg-white px-6 py-4 rounded-2xl shadow-2xl border border-outline-variant flex items-center gap-4 cursor-pointer hover:scale-105 transition-transform" onClick={() => setInAppNotification(null)}>
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center flex-shrink-0">
               <span className="material-symbols-outlined text-2xl">{inAppNotification.icon}</span>
            </div>
            <div>
               <h4 className="font-black text-on-surface text-base">{inAppNotification.title}</h4>
               <p className="text-xs text-on-surface-variant font-medium mt-0.5">{inAppNotification.body}</p>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}


export default App;
