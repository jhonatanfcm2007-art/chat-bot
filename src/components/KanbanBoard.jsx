import React, { useState } from 'react';

const KanbanBoard = ({ chats, onUpdateTag, onClose }) => {
  const [draggedChatId, setDraggedChatId] = useState(null);

  const COLUMNS = [
    { id: 'preparar_pedido', title: 'Preparar Pedido', color: 'bg-sky-50 text-sky-700 border-sky-200' },
    { id: 'guia_enviada', title: 'Guía Enviada', color: 'bg-violet-50 text-violet-700 border-violet-200' },
    { id: 'viajando_destino', title: 'Viajando a Destino', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { id: 'en_ruta', title: 'En Ruta de Entrega', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    { id: 'entregado', title: 'Entregado', color: 'bg-teal-50 text-teal-700 border-teal-200' },
    { id: 'novedad', title: 'Novedades', color: 'bg-red-50 text-red-700 border-red-200' }
  ];

  // Helper to format date
  const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  };

  const handleDragStart = (e, chatId) => {
    setDraggedChatId(chatId);
    e.dataTransfer.setData('text/plain', chatId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetColumnId) => {
    e.preventDefault();
    const chatId = e.dataTransfer.getData('text/plain');
    
    if (chatId) {
      onUpdateTag(chatId, [targetColumnId]);
    }
    
    setDraggedChatId(null);
  };

  // Group chats by their logistics tag
  const chatsByColumn = {};
  COLUMNS.forEach(col => {
    chatsByColumn[col.id] = [];
  });

  const chatList = Object.values(chats || {});
  
  chatList.forEach(chat => {
    if (chat.tags && chat.tags.length > 0) {
      const tag = chat.tags[0]; // Assuming the logistics tag is the first one
      if (chatsByColumn[tag]) {
        chatsByColumn[tag].push(chat);
      }
    }
  });

  // Sort chats in each column by latest update
  Object.keys(chatsByColumn).forEach(colId => {
    chatsByColumn[colId].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  });

  return (
    <div className="absolute inset-0 z-[200] bg-slate-50 flex flex-col font-sans h-full w-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <span className="material-symbols-outlined">view_kanban</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Tablero Logístico</h2>
            <p className="text-xs text-slate-500">Arrastra y suelta las conversaciones para cambiar su estado logístico</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-slate-100 text-slate-500 rounded-full transition-colors flex items-center justify-center"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Kanban Board Area */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <div className="flex gap-6 h-full items-start min-w-max">
          {COLUMNS.map(column => (
            <div 
              key={column.id}
              className="flex flex-col h-full w-[300px] flex-shrink-0 bg-slate-100/50 rounded-xl border border-slate-200/60 overflow-hidden"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className={`px-4 py-3 border-b border-slate-200 font-semibold text-sm flex items-center justify-between ${column.color}`}>
                <span>{column.title}</span>
                <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs">
                  {chatsByColumn[column.id].length}
                </span>
              </div>
              
              {/* Column Content (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {chatsByColumn[column.id].map(chat => (
                  <div 
                    key={chat.from}
                    draggable
                    onDragStart={(e) => handleDragStart(e, chat.from)}
                    onDragEnd={() => setDraggedChatId(null)}
                    className={`bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-slate-300 transition-all ${draggedChatId === chat.from ? 'opacity-50 scale-95' : 'opacity-100'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-slate-800 text-sm truncate pr-2">
                        {chat.orderName || chat.customerName || chat.from.split('@')[0]}
                      </h4>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {formatTime(chat.updatedAt)}
                      </span>
                    </div>
                    
                    <div className="text-xs text-slate-500 mb-3 font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">call</span>
                      +{chat.from.split('@')[0]}
                    </div>
                    
                    {chat.city && (
                      <div className="text-[11px] text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100 flex items-center gap-1 mt-2">
                        <span className="material-symbols-outlined text-[12px] text-slate-400">location_on</span>
                        <span className="truncate">{chat.city}, {chat.province}</span>
                      </div>
                    )}
                  </div>
                ))}
                
                {chatsByColumn[column.id].length === 0 && (
                  <div className="h-24 flex items-center justify-center text-xs text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                    Arrastra aquí
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KanbanBoard;
