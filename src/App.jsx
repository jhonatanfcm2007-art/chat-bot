import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Simulator from './components/Simulator';
import AIAssistant from './components/AIAssistant';

import io from 'socket.io-client';

// Configuración del Backend para split deployment
const SERVER_URL = import.meta.env.VITE_BACKEND_URL || (import.meta.env.PROD ? window.location.origin : 'http://localhost:3000');
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
            tags: data.tags,
            updatedAt: Date.now() // Subir al tope de la lista cuando cambia etiqueta
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

    socket.on('ai_state_updated', (data) => {
      setChats(prev => {
        if (!prev[data.chatId]) return prev;
        return {
          ...prev,
          [data.chatId]: {
            ...prev[data.chatId],
            aiDisabled: data.disabled
          }
        };
      });
    });

    return () => {
      socket.off('message');
      socket.off('initial_chats');
      socket.off('initial_settings');
      socket.off('human_required');
      socket.off('receipt_received');
      socket.off('tag_updated');
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
          setPlatforms(prev => {
            // Unir sin duplicados: priorizar lo que viene del servidor pero mantener lo nuevo local
            const combined = [...new Set([...data, ...prev])];
            return combined;
          });
          setInitialized(prev => ({ ...prev, platforms: true }));
        }
      })
      .catch(() => {});

    fetch(`${SERVER_URL}/api/providers`)
      .then(res => res.json())
      .then(data => { 
        if (Array.isArray(data)) {
          setProviders(prev => {
            const combined = [...new Set([...data, ...prev])];
            return combined;
          });
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
          // Evitar el loop circular: si los datos son iguales, no actualizar
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
          if (data.length > prev.length && prev.length > 0) {
             setNotifications(prevNotifs => [
               {
                 id: Date.now() + Math.random(),
                 type: 'sale',
                 title: '¡Nueva Venta!',
                 body: `Se ha registrado una venta de ${data[data.length-1]?.service} por $${data[data.length-1]?.price}`,
                 icon: 'local_mall',
                 data: data[data.length-1],
                 timestamp: new Date()
               },
               ...prevNotifs
             ]);
             playAlertSound();
          }
          return data;
        });
      }
      socket.on('ai_state_updated', ({ chatId, disabled }) => {
        setChats(prev => {
          if (!prev[chatId]) return prev;
          return {
            ...prev,
            [chatId]: { ...prev[chatId], aiDisabled: disabled }
          };
        });
      });

      socket.on('chat_deleted', (chatId) => {
        setChats(prev => {
          const newChats = { ...prev };
          delete newChats[chatId];
          return newChats;
        });
        setSelectedChat(prev => prev === chatId ? null : prev);
      });
    });

    return () => {
      socket.off('sales_updated');
      socket.off('ai_state_updated');
      socket.off('chat_deleted');
    };
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

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    
    const cleanService = (account.service || 'SRV').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    let prefix = cleanService.substring(0, 4);
    if (prefix.length < 3) prefix = prefix.padEnd(3, 'X');
    
    const reference = `${prefix}-${dd}${mm}-${hh}${mins}`;

    const newSale = {
      id: Date.now(),
      reference: reference,
      service: account.service,
      price: account.price,
      cost: costPerSlot,
      provider: account.provider || 'N/A',
      date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }),
      customer: customerName || 'Venta Directa',
      customerId: customerId || null,
      email: account.email || '',
      pass: account.pass || '',
      profile: account.profile || '',
      pin: account.pin || '',
      expiration: account.expiration || ''
    };

    setSalesHistory([newSale, ...salesHistory]);
    setAccounts(accounts.map(acc => 
      acc.id === account.id 
        ? { ...acc, uses: acc.uses - 1, status: acc.uses - 1 === 0 ? 'Sold' : 'Available' } 
        : acc
    ));
  };
  const handleDeleteSale = (saleId) => {
    setSalesHistory(prev => prev.filter(sale => sale.id !== saleId));
  };

  const handleUpdateSale = (saleId, updates) => {
    setSalesHistory(prev => prev.map(sale => sale.id === saleId ? { ...sale, ...updates } : sale));
  };

  const handleSendMessage = (messageData) => {
    // messageData: { to: '...', content: '...' }
    socket.emit('send_message', messageData);
  };

  const handleUpdateChatTag = (chatId, tags) => {
    socket.emit('update_chat_tags', { chatId, tags });
  };

  const handleToggleAI = (chatId, disabled) => {
    socket.emit('toggle_ai', { chatId, disabled });
    setChats(prev => {
      if (!prev[chatId]) return prev;
      return {
        ...prev,
        [chatId]: {
          ...prev[chatId],
          aiDisabled: disabled
        }
      };
    });
  };

  const handleDeleteChat = (chatId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este chat permanentemente?')) {
      socket.emit('delete_chat', chatId);
    }
  };

  const handleNavigateToChat = (customerId) => {
    if (customerId) {
       setActiveTab('simulator');
       setSelectedChat(customerId);
    }
  };

  const handleMarkSaleAsSuccess = (saleId) => {
    setSalesHistory(prev => prev.map(sale => 
      sale.id === saleId ? { ...sale, status: 'paid' } : sale
    ));
  };

  const handleMarkSaleAsFailed = (saleId, accountId) => {
    setSalesHistory(prev => prev.filter(sale => sale.id !== saleId));
    setAccounts(prev => prev.map(acc => {
      if (acc.id === accountId) {
        const newUses = (parseInt(acc.uses) || 0) + 1;
        return { 
          ...acc, 
          uses: newUses, 
          failed: (parseInt(acc.failed) || 0) + 1,
          status: 'Available'
        };
      }
      return acc;
    }));
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
            salesHistory={salesHistory}
            onNavigateToChat={handleNavigateToChat}
            onMarkSaleAsSuccess={handleMarkSaleAsSuccess}
            onMarkSaleAsFailed={handleMarkSaleAsFailed}
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
            onDeleteChat={handleDeleteChat}
            onToggleAI={handleToggleAI}
            serverUrl={SERVER_URL}
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
        return <Dashboard accounts={accounts} salesHistory={salesHistory} chats={chats} onNavigateToChat={handleNavigateToChat} onDeleteSale={handleDeleteSale} onUpdateSale={handleUpdateSale} />;
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
