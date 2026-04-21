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
  const [notifications, setNotifications] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [providers, setProviders] = useState([]);
  
  // Estados para controlar que los datos ya se cargaron inicialmente
  const [initialized, setInitialized] = useState({
    inventory: false,
    platforms: false,
    providers: false,
    sales: false
  });

  // Jugar sonido simple al recibir notificación (opcional si falla)
  const playAlertSound = () => {
    try {
      const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-09a.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch(e) {}
  };

  const handleNotificationClick = (notification) => {
    if (notification.type === 'human') {
      setActiveTab('simulator');
      setSelectedChat(notification.data.from);
    } else if (notification.type === 'sale') {
      setActiveTab('analytics');
    }
    setNotifications(prev => prev.filter(n => n.id !== notification.id));
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  useEffect(() => {
    socket.on('initial_chats', (data) => {
      console.log('Received initial history:', data);
      setChats(data);
    });

    socket.on('initial_settings', (data) => {
      setSettings(data);
    });

    socket.on('human_required', (data) => {
      setNotifications(prev => [
        {
          id: Date.now() + Math.random(),
          type: 'human',
          title: '¡Atención Requerida!',
          body: `El cliente ${data.customerName} necesita soporte humano.`,
          icon: 'support_agent',
          data: data,
          timestamp: new Date()
        },
        ...prev
      ]);
      playAlertSound();
    });

    socket.on('receipt_received', (data) => {
      setNotifications(prev => [
        {
          id: Date.now() + Math.random(),
          type: 'receipt',
          title: '¡Nuevo Comprobante!',
          body: `El cliente ${data.customerName} ha enviado una imagen.`,
          icon: 'receipt_long',
          data: data,
          timestamp: new Date()
        },
        ...prev
      ]);
      playAlertSound();
    });

    socket.on('tag_updated', (data) => {
      setChats(prev => {
        if (!prev[data.from]) return prev;
        return {
          ...prev,
          [data.from]: {
            ...prev[data.from],
            tags: data.tags
          }
        };
      });
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
            updatedAt: Date.now(),
            messages: [...chatData.messages, { 
              ...msg, 
              content: msg.body, 
              timestampRaw: Date.now(),
              role: msg.role || (msg.isMe ? 'bot' : 'user') 
            }]
          }
        };
      });
    });
    socket.on('platforms_updated', (data) => {
      if (Array.isArray(data)) {
        setPlatforms(prev => {
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
          return data;
        });
      }
    });

    socket.on('providers_updated', (data) => {
      if (Array.isArray(data)) {
        setProviders(prev => {
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
          return data;
        });
      }
    });

    return () => {
      socket.off('message');
      socket.off('initial_chats');
      socket.off('initial_settings');
      socket.off('human_required');
      socket.off('platforms_updated');
      socket.off('providers_updated');
    };
  }, []);
  
  // Cargamos inventario desde el servidor (persistente en Railway)
  const [accounts, setAccounts] = useState([]);

  // Cargar plataformas y proveedores del servidor al iniciar
  useEffect(() => {
    fetch(`${SERVER_URL}/api/platforms`)
      .then(res => res.json())
      .then(data => { 
        if (Array.isArray(data)) {
          setPlatforms(data);
          setInitialized(prev => ({ ...prev, platforms: true }));
        }
      })
      .catch(() => {});

    fetch(`${SERVER_URL}/api/providers`)
      .then(res => res.json())
      .then(data => { 
        if (Array.isArray(data)) {
          setProviders(data);
          setInitialized(prev => ({ ...prev, providers: true }));
        }
      })
      .catch(() => {});
  }, []);

  // Cargar inventario del servidor al iniciar
  useEffect(() => {
    fetch(`${SERVER_URL}/api/inventory`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setAccounts(data);
          setInitialized(prev => ({ ...prev, inventory: true }));
        } else {
          // Datos de ejemplo si el servidor está vacío en producción
          const fallback = localStorage.getItem('streaming_accounts');
          if (fallback) setAccounts(JSON.parse(fallback));
          setInitialized(prev => ({ ...prev, inventory: true }));
        }
      })
      .catch(() => {
        // Si el servidor no responde, usamos localStorage como fallback
        const saved = localStorage.getItem('streaming_accounts');
        if (saved) setAccounts(JSON.parse(saved));
        setInitialized(prev => ({ ...prev, inventory: true }));
      });
  }, []);

  // Escuchar actualizaciones de inventario desde el servidor (tiempo real)
  useEffect(() => {
    socket.on('inventory_updated', (data) => {
      if (Array.isArray(data)) {
        setAccounts(prev => {
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
          return data;
        });
      }
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
          setInitialized(prev => ({ ...prev, sales: true }));
        } else {
          const fallback = localStorage.getItem('streaming_sales');
          if (fallback) setSalesHistory(JSON.parse(fallback));
          setInitialized(prev => ({ ...prev, sales: true }));
        }
      })
      .catch(() => {
        const saved = localStorage.getItem('streaming_sales');
        if (saved) setSalesHistory(JSON.parse(saved));
        setInitialized(prev => ({ ...prev, sales: true }));
      });
  }, []);

  // Escuchar actualizaciones de ventas en tiempo real
  useEffect(() => {
    socket.on('sales_updated', (data) => {
      if (Array.isArray(data)) {
        setSalesHistory(prev => {
          if (data.length > prev.length && prev.length > 0) {
             setNotifications(prevNotifs => [
               {
                 id: Date.now() + Math.random(),
                 type: 'sale',
                 title: '¡Nueva Venta!',
                 body: `Se ha registrado una venta de ${data[0].service} por $${data[0].price}`,
                 icon: 'local_mall',
                 data: data[0],
                 timestamp: new Date()
               },
               ...prevNotifs
             ]);
             playAlertSound();
          }
          return data;
        });
      }
    });
    return () => socket.off('sales_updated');
  }, []);

  // Guardar inventario en servidor + localStorage cada vez que cambia
  useEffect(() => {
    if (!initialized.inventory) return; 
    
    localStorage.setItem('streaming_accounts', JSON.stringify(accounts));
    socket.emit('sync_inventory', accounts);
  }, [accounts]);

  useEffect(() => {
    if (!initialized.platforms) return;
    socket.emit('sync_platforms', platforms);
  }, [platforms]);

  useEffect(() => {
    if (!initialized.providers) return;
    socket.emit('sync_providers', providers);
  }, [providers]);

  useEffect(() => {
    if (!initialized.sales) return;
    localStorage.setItem('streaming_sales', JSON.stringify(salesHistory));
    socket.emit('sync_sales', salesHistory);
  }, [salesHistory]);

  const handleSale = (account, customerId = null, customerName = null) => {
    if (account.uses <= 0) return;
    
    const costPerSlot = (account.cost || 0) / (account.originalUses || 1);
    const newSale = {
      id: Date.now(),
      service: account.service,
      price: account.price,
      cost: costPerSlot,
      provider: account.provider || 'N/A',
      date: new Date().toISOString().split('T')[0],
      customer: customerName || 'Venta Directa',
      customerId: customerId || null
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
          updatedAt: Date.now(),
          messages: [...existingMessages, { content: messageData.content, isMe: true, role: 'bot', timestamp: new Date().toLocaleTimeString(), timestampRaw: Date.now() }]
        }
      };
    });
  };

  const handleUpdateChatTag = (chatId, tags) => {
    socket.emit('update_chat_tags', { chatId, tags });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'inventory':
        return (
          <Inventory 
            accounts={accounts} 
            setAccounts={setAccounts} 
            onSale={handleSale} 
            platforms={platforms}
            setPlatforms={setPlatforms}
            providers={providers}
            setProviders={setProviders}
          />
        );
      case 'simulator':
        return (
          <Simulator 
            chats={chats} 
            selectedChat={selectedChat} 
            onSelectChat={setSelectedChat}
            onSendMessage={handleSendMessage} 
            accounts={accounts}
            salesHistory={salesHistory}
            onSale={handleSale}
            onUpdateTag={handleUpdateChatTag}
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
    <Layout 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
      notifications={notifications}
      onNotificationClick={handleNotificationClick}
      onClearNotifications={handleClearNotifications}
    >
      {renderContent()}
    </Layout>
  );
}


export default App;
