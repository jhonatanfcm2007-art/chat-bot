import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import WhatsAppConnector from './components/WhatsAppConnector';
import Inventory from './components/Inventory';
import Simulator from './components/Simulator';

import io from 'socket.io-client';

const socket = io('http://localhost:3001');

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
  
  // Persistence logic - Load initial state from localStorage
  const [accounts, setAccounts] = useState(() => {
    const saved = localStorage.getItem('streaming_accounts');
    return saved ? JSON.parse(saved) : [
      { id: 1, service: 'Netflix', profile: 'Profile 1', email: 'user1@example.com', pass: 'pass123', price: 12000, cost: 8000, status: 'Available', uses: 3, originalUses: 3 },
      { id: 2, service: 'Disney+', profile: 'Full', email: 'user2@example.com', pass: 'disney99', price: 25000, cost: 20000, status: 'Sold', uses: 0, originalUses: 3 },
      { id: 3, service: 'HBO Max', profile: 'Profile 2', email: 'user3@example.com', pass: 'hbo777', price: 10000, cost: 7000, status: 'Available', uses: 3, originalUses: 3 },
    ];
  });

  const [salesHistory, setSalesHistory] = useState(() => {
    const saved = localStorage.getItem('streaming_sales');
    return saved ? JSON.parse(saved) : [
      { id: 1, service: 'Netflix', price: 12000, cost: 2666, date: '2024-04-15', customer: 'Carlos M.' },
      { id: 2, service: 'Disney+', price: 25000, cost: 6666, date: '2024-04-15', customer: 'Sofia R.' },
    ];
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('streaming_accounts', JSON.stringify(accounts));
    // Sync with WhatsApp Backend
    socket.emit('sync_inventory', accounts);
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('streaming_sales', JSON.stringify(salesHistory));
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
