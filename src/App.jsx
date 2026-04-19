import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import WhatsAppConnector from './components/WhatsAppConnector';
import Inventory from './components/Inventory';
import Simulator from './components/Simulator';

import io from 'socket.io-client';

// En producción (Railway) usamos la misma URL base del frontend. En local, el puerto 3001.
const SERVER_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';
const socket = io(SERVER_URL);

function App() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [chats, setChats] = useState({});
  const [selectedChat, setSelectedChat] = useState(null);

  useEffect(() => {
    socket.on('initial_chats', (data) => {
      console.log('Received initial history:', data);
      setChats(data);
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
      if (Array.isArray(data)) setSalesHistory(data);
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
      case 'whatsapp':
        return <WhatsAppConnector />;
      case 'analytics':
      case 'dashboard':
      default:
        return <Dashboard accounts={accounts} salesHistory={salesHistory} />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}


export default App;
