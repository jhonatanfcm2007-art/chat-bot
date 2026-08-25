import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Inventory from './components/Inventory';
import Simulator from './components/Simulator';
import AIAssistant from './components/AIAssistant';
import Campaigns from './components/Campaigns';
import KnowledgeBase from './components/KnowledgeBase';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';

import io from 'socket.io-client';

// Configuración del Backend para split deployment
const SERVER_URL = import.meta.env.VITE_BACKEND_URL || (import.meta.env.PROD ? window.location.origin : 'http://localhost:3000');
const socket = io(SERVER_URL);

function App() {
  const [activeTab, setActiveTab] = useState('simulator');
  const [chats, setChats] = useState({});
  const [selectedChat, setSelectedChat] = useState(null);
  const [settings, setSettings] = useState({ systemPrompt: '' });
  const [notifications, setNotifications] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [providers, setProviders] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  
  // Estados para controlar que los datos ya se cargaron inicialmente
  const [initialized, setInitialized] = useState({
    inventory: false,
    platforms: false,
    providers: false,
    knowledge: false,
    sales: false,
    anomalies: false
  });

  useEffect(() => {
    if (!initialized.anomalies) {
      fetch(`${SERVER_URL}/api/anomalies`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setAnomalies(data);
          setInitialized(prev => ({ ...prev, anomalies: true }));
        })
        .catch(err => {
          console.error("Error cargando anomalies:", err);
          setInitialized(prev => ({ ...prev, anomalies: true }));
        });
    }
  }, [initialized]);

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

  // Registrar Service Worker para PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          console.log('✅ Service Worker registrado con éxito:', reg.scope);
        })
        .catch(err => {
          console.error('❌ Falló el registro del Service Worker:', err);
        });
    }
  }, []);

  useEffect(() => {
    // Cargar chats pesados por HTTP para evitar que el proxy bloquee payloads gigantes
    fetch(`${SERVER_URL}/api/chats`)
      .then(res => res.json())
      .then(data => {
        console.log('Received initial history via HTTP:', data);
        setChats(data);
      })
      .catch(err => console.error('Error fetching chats via HTTP:', err));

    socket.on('initial_chats', (data) => {
      // Ignoramos initial_chats del socket si pesa mucho, ya lo traemos por HTTP
      // pero lo dejamos por compatibilidad o por si viene chiquito
      if (Object.keys(data).length > 0 && Object.keys(data).length <= 800) {
        setChats(data);
      }
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

    socket.on('chat_meta_updated', (data) => {
      setChats(prev => {
        if (!prev[data.id]) return prev;
        return {
          ...prev,
          [data.id]: {
            ...prev[data.id],
            ...data.chat,
            messages: prev[data.id].messages // mantener los mensajes del frontend
          }
        };
      });
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

    socket.on('message_status_updated', (data) => {
      setChats(prev => {
        if (!prev[data.from]) return prev;
        const currentChat = prev[data.from];
        const updatedMessages = currentChat.messages.map(m => {
          if (m.wamid === data.messageId || m.id === data.messageId || (m.isMe || m.role === 'bot')) {
            return { ...m, status: data.status };
          }
          return m;
        });
        return {
          ...prev,
          [data.from]: {
            ...currentChat,
            messages: updatedMessages
          }
        };
      });
    });

    socket.on('message', (message) => {
      setChats(prev => {
        const chatId = message.from;
        const currentChat = prev[chatId] || { 
          from: chatId, 
          customerName: message.customerName || chatId, 
          messages: [],
          waLine: message.waLine || 1
        };
        
        // Actualizar la línea por si no existía localmente o viene en el evento
        if (message.waLine) currentChat.waLine = message.waLine;
        
        // Evitar duplicados por ID
        if (currentChat.messages.some(m => m.id === message.id)) return prev;

        return {
          ...prev,
          [chatId]: {
            ...currentChat,
            updatedAt: Date.now(),
            messages: [...currentChat.messages, { 
              ...message, 
              content: message.body, 
              timestampRaw: Date.now(),
              role: message.role || (message.isMe ? 'bot' : 'user') 
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

    socket.on('block_state_updated', (data) => {
      setChats(prev => {
        if (!prev[data.chatId]) return prev;
        return {
          ...prev,
          [data.chatId]: {
            ...prev[data.chatId],
            isBlocked: data.blocked
          }
        };
      });
    });

    socket.on('message_deleted', ({ chatId, messageId }) => {
      setChats(prev => {
        if (!prev[chatId]) return prev;
        return {
          ...prev,
          [chatId]: {
            ...prev[chatId],
            messages: prev[chatId].messages.filter(m => m.id !== messageId && m.timestampRaw !== messageId)
          }
        };
      });
    });

    socket.on('campaigns_updated', (data) => {
      if (Array.isArray(data)) {
        setCampaigns(data);
      }
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
      socket.off('block_state_updated');
      socket.off('message_deleted');
      socket.off('campaigns_updated');
      socket.off('inventory_updated');
      socket.off('sales_updated');
      socket.off('anomalies_updated');
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
  const [anomalies, setAnomalies] = useState([]);

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

      socket.on('block_state_updated', ({ chatId, blocked }) => {
        setChats(prev => {
          if (!prev[chatId]) return prev;
          return {
            ...prev,
            [chatId]: { ...prev[chatId], isBlocked: blocked }
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
      socket.off('block_state_updated');
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
    
    const reference = `${prefix}-${dd}${mm}-${hh}-${mins}`;
    
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
      expiration: account.expiration || '',
      accountId: account.id,
      paid: false,
      waLine: customerId && chats[customerId] ? chats[customerId].waLine : null
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

  const handleSendMessage = async (messageData) => {
    try {
      const res = await fetch(`${SERVER_URL}/api/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });
      if (!res.ok) throw new Error('Network response was not ok');
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error de conexión. El mensaje no se pudo enviar.');
      return false;
    }
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

  const handleToggleBlock = (chatId, blocked) => {
    const action = blocked ? 'bloquear' : 'desbloquear';
    if (window.confirm(`¿Estás seguro de que quieres ${action} a este contacto?`)) {
      socket.emit('toggle_block', { chatId, blocked });
      setChats(prev => {
        if (!prev[chatId]) return prev;
        return {
          ...prev,
          [chatId]: {
            ...prev[chatId],
            isBlocked: blocked
          }
        };
      });
    }
  };

  const handleDeleteMessage = (chatId, messageId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este mensaje?')) {
      socket.emit('delete_message', { chatId, messageId });
    }
  };

  const handleBulkClearTags = (chatIds) => {
    if (!chatIds || chatIds.length === 0) return;
    if (window.confirm(`¿Deseas quitar las etiquetas de estos ${chatIds.length} chats? Las conversaciones NO se borrarán.`)) {
      chatIds.forEach(id => {
        handleUpdateChatTag(id, []);
      });
    }
  };

  const handleNavigateToChat = (customerId) => {
    if (customerId) {
       setActiveTab('simulator');
       setSelectedChat(customerId);
    }
  };

  const handleMarkSaleAsSuccess = (saleId, accountId) => {
    setSalesHistory(prev => prev.map(sale => 
      sale.id === saleId ? { ...sale, status: 'paid', paid: true } : sale
    ));
    if (accountId) {
      setAccounts(prev => prev.map(acc => 
        acc.id === accountId ? { ...acc, exitosas: (parseInt(acc.exitosas) || 0) + 1 } : acc
      ));
    }
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

  const [globalLine, setGlobalLine] = useState('all');

  const handleSendTrackingManual = (chatId, trackingNumber) => {
    socket.emit('send_tracking_manual', { chatId, trackingNumber });
  };

  const handleConfirmBulkTracking = (results) => {
    socket.emit('send_bulk_tracking', { results });
  };

  const renderContent = () => {
    switch (activeTab) {
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
            onDeleteMessage={handleDeleteMessage}
            onBulkClearTags={handleBulkClearTags}
            onToggleAI={handleToggleAI}
            onToggleBlock={handleToggleBlock}
            serverUrl={SERVER_URL}
            globalLine={globalLine}
            onSendTrackingManual={handleSendTrackingManual}
            onConfirmBulkTracking={handleConfirmBulkTracking}
          />
        );
      case 'ai_assistant':
        return (
          <AIAssistant 
            settings={settings}
            socket={socket}
            serverUrl={SERVER_URL}
            globalLine={globalLine}
          />
        );
      case 'knowledge_base':
        return <KnowledgeBase serverUrl={SERVER_URL} />;
      case 'simulator':
      default:
        return (
          <Simulator 
            chats={chats}
            socket={socket}
            onSendMessage={handleSendMessage}
            onAssignProduct={handleAssignProduct}
            onToggleAI={handleToggleAI}
            onCloseSale={handleCloseSale}
            onUploadMedia={handleUploadMedia}
            onDeleteChat={handleDeleteChat}
            serverUrl={SERVER_URL}
            globalLine={globalLine}
            onSendTrackingManual={handleSendTrackingManual}
            onConfirmBulkTracking={handleConfirmBulkTracking}
          />
        );
    }
  };

  return (
    <Layout 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
      notifications={notifications}
      onNotificationClick={handleNotificationClick}
      onClearNotifications={handleClearNotifications}
      serverUrl={SERVER_URL}
      globalLine={globalLine}
      setGlobalLine={setGlobalLine}
    >
      {renderContent()}
    </Layout>
  );
}


export default App;
