import React, { useState, useRef, useEffect } from 'react';
const Dashboard = ({ accounts, salesHistory, chats = {}, onNavigateToChat, onDeleteSale, onUpdateSale, globalLine }) => {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  const [dateRange, setDateRange] = useState({
    start: today,
    end: today
  });

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isFilterActive, setIsFilterActive] = useState(true);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSales = salesHistory.filter(sale => {
    if (!isFilterActive) return globalLine === 'all' || sale.waLine == globalLine;
    const dateMatch = sale.date >= dateRange.start && sale.date <= dateRange.end;
    const lineMatch = globalLine === 'all' || sale.waLine == globalLine || !sale.waLine; // Si no tiene waLine (ventas antiguas), la mostramos
    return dateMatch && lineMatch;
  });

  const stats = (() => {
    const totalSales = filteredSales.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
    const totalCosts = filteredSales.reduce((sum, s) => sum + (parseFloat(s.cost) || 0), 0);
    const totalPendiente = filteredSales.reduce((sum, s) => s.paid ? sum : sum + (parseFloat(s.price) || 0), 0);
    const netProfit = totalSales - totalCosts;
    const itemsSold = filteredSales.length;
    
    const cuentasPendientes = filteredSales.filter(s => !s.paid).length;
    
    // Calcular chats nuevos/activos
    const startObj = new Date(dateRange.start);
    startObj.setHours(0,0,0,0);
    const endObj = new Date(dateRange.end);
    endObj.setHours(23,59,59,999);
    
    const chatsActivos = Object.values(chats || {}).filter(chat => {
       const msgs = chat.messages || [];
       if (msgs.length === 0) return false;
       if (globalLine !== 'all' && chat.waLine != globalLine) return false;
       const firstMsg = msgs.find(m => m.role === 'user') || msgs[0];
       const d = new Date(Number(firstMsg.timestampRaw || chat.updatedAt || 0));
       return d >= startObj && d <= endObj;
    }).length;

    return { totalSales, totalCosts, netProfit, itemsSold, totalPendiente, cuentasPendientes, chatsActivos };
  })();

  const handleDateClick = (value) => {
    setDateRange({ start: value, end: value });
    setIsFilterActive(true);
    setIsPickerOpen(false);
  };

  const setPreset = (start, end) => {
    setDateRange({ start, end });
    setIsFilterActive(true);
    setIsPickerOpen(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Select';
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const currentDisplay = dateRange.start === dateRange.end 
    ? formatDate(dateRange.start)
    : `${formatDate(dateRange.start)} — ${formatDate(dateRange.end)}`;

  return (
    <div className="flex-grow p-4 md:p-10 bg-[#f8fafc] overflow-y-auto custom-scrollbar">
      {/* Premium Header Container */}
      <div className="mb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="animate-in fade-in slide-in-from-left duration-700">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-2 h-10 bg-primary rounded-full shadow-[0_0_15px_rgba(79,70,229,0.4)]"></div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight font-headline">Reportes de Rendimiento</h1>
          </div>
        </div>

        <div className="relative" ref={pickerRef}>
          <button 
            onClick={() => setIsPickerOpen(!isPickerOpen)}
            className="group relative bg-white border border-slate-200 shadow-xl shadow-slate-200/50 rounded-[2rem] px-8 py-5 flex items-center gap-6 transition-all active:scale-[0.98] min-w-[340px] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/[0.02] to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-inner">
              <span className="material-symbols-outlined text-xl">calendar_month</span>
            </div>
            <div className="flex flex-col items-start relative z-10">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] leading-none mb-2">Periodo Seleccionado</span>
              <span className="text-base font-black text-slate-800 tracking-tight">
                {currentDisplay}
              </span>
            </div>
            <span className={`material-symbols-outlined text-slate-300 ml-auto transition-transform duration-500 ${isPickerOpen ? 'rotate-180 text-primary' : ''}`}>
              expand_more
            </span>
          </button>

          {isPickerOpen && (
            <div className="absolute top-full right-0 mt-6 z-[100] bg-white rounded-[2.5rem] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.15)] border border-slate-100 w-[540px] flex overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-500">
              <div className="w-[200px] bg-slate-50 border-r border-slate-100 p-8 space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Atajos Rápidos</p>
                {[
                  { label: 'Hoy', action: () => handleDateClick(today) },
                  { label: 'Últimos 7 Días', action: () => {
                    const d = new Date(); d.setDate(d.getDate() - 7);
                    setPreset(d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }), today);
                  }},
                  { label: 'Últimos 30 Días', action: () => {
                    const d = new Date(); d.setDate(d.getDate() - 30);
                    setPreset(d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }), today);
                  }}
                ].map((btn) => (
                  <button 
                    key={btn.label}
                    onClick={btn.action}
                    className="w-full text-left px-5 py-3.5 rounded-2xl text-sm font-bold text-slate-600 hover:text-primary hover:bg-white hover:shadow-md transition-all border border-transparent"
                  >
                    {btn.label}
                  </button>
                ))}
                <div className="pt-6 mt-6 border-t border-slate-200">
                  <button 
                     onClick={() => { setIsFilterActive(false); setIsPickerOpen(false); }}
                    className="w-full text-left px-5 py-3.5 rounded-2xl text-[13px] font-black text-error hover:bg-error/5 transition-all"
                  >
                    Resetear Filtros
                  </button>
                </div>
              </div>

              <div className="flex-grow p-10 bg-white">
                <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Calendario Personalizado</h3>
                <p className="text-[13px] text-slate-400 mb-8 font-medium italic leading-relaxed">
                  Busca el historial de un día específico.
                </p>

                <div className="relative group p-6 bg-slate-50 rounded-3xl border-2 border-transparent focus-within:border-primary/20 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-lg font-bold">event</span>
                    </div>
                    <div className="flex-grow">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha Exacta</label>
                      <input 
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => handleDateClick(e.target.value)}
                        className="w-full bg-transparent border-none p-0 text-base font-black text-slate-800 focus:ring-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 p-6 bg-primary/5 rounded-[2rem] border border-primary/10 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-1">Rango Activo</span>
                    <p className="text-sm font-black text-slate-800">{currentDisplay}</p>
                  </div>
                  <button onClick={() => setIsPickerOpen(false)} className="bg-primary text-white text-[10px] font-black uppercase px-6 py-3 rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                    Aplicar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
        {[
          { label: 'Ventas Totales', value: `$${stats.totalSales.toLocaleString()}`, icon: 'payments', color: 'text-primary', bg: 'bg-primary/10', trend: 'Ingresos Brutos' },
          { label: 'Ganancia Neta', value: `$${stats.netProfit.toLocaleString()}`, icon: 'trending_up', color: 'text-emerald-500', bg: 'bg-emerald-500/10', trend: 'Utilidad Real' },
          { label: 'Unidades Vendidas', value: stats.itemsSold.toString(), icon: 'shopping_bag', color: 'text-slate-800', bg: 'bg-slate-100', trend: 'Volumen Transaccional', action: () => setIsBreakdownOpen(true) },
          { label: 'Deuda por Cobrar ($)', value: `$${stats.totalPendiente.toLocaleString()}`, icon: 'account_balance_wallet', color: 'text-rose-500', bg: 'bg-rose-500/10', trend: 'Valor Pendiente' },
          { label: 'Cuentas Fíadas', value: `${stats.cuentasPendientes}`, icon: 'money_off', color: 'text-amber-500', bg: 'bg-amber-500/10', trend: 'Cuentas sin pago' },
          { label: 'Chats Nuevos', value: stats.chatsActivos.toString(), icon: 'forum', color: 'text-indigo-500', bg: 'bg-indigo-500/10', trend: 'Interacciones hoy' },
        ].map((stat, i) => (
          <div 
            key={i} 
            onClick={stat.action}
            className={`group relative bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 overflow-hidden animate-in fade-in slide-in-from-bottom duration-700 ${stat.action ? 'cursor-pointer' : 'cursor-default'}`}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className={`absolute top-0 right-0 w-32 h-32 ${stat.bg} rounded-full -mr-12 -mt-12 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity`}></div>
            
            <div className="flex justify-between items-start mb-10 relative z-10">
              <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] group-hover:rotate-12 transition-all duration-500`}>
                <span className="material-symbols-outlined text-2xl font-bold">{stat.icon}</span>
              </div>
              <span className={`text-[9px] font-black px-3 py-1.5 rounded-full border border-slate-100 uppercase tracking-widest text-slate-400 bg-slate-50 group-hover:bg-white transition-colors`}>
                {stat.trend}
              </span>
            </div>
            
            <div className="relative z-10">
              <h3 className="text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] mb-2">{stat.label}</h3>
              <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{stat.value}</p>
            </div>
            
            <div className={`mt-6 flex items-center gap-2 relative z-10`}>
              <div className="w-8 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${stat.color.replace('text-', 'bg-')} w-full animate-in slide-in-from-left duration-1000`}></div>
              </div>
              <span className="text-[10px] font-bold text-slate-300">{stat.action ? 'Ver Detalle' : 'Live Sync'}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Recent Activity Card - Expanded */}
        <div className="lg:col-span-12 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center border border-primary/10">
                <span className="material-symbols-outlined text-2xl font-bold">list_alt</span>
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Actividad de Ventas</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Últimas transacciones procesadas</p>
              </div>
            </div>
            <button 
              onClick={() => setIsHistoryModalOpen(true)}
              className="bg-slate-900 text-white text-[10px] font-black uppercase px-8 py-4 rounded-2xl hover:bg-primary shadow-xl shadow-slate-900/10 transition-all active:scale-95"
            >
              Ver Historial Completo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSales.slice(0, 10).map((sale, idx) => (
              <div 
                key={sale.id} 
                onClick={() => sale.customerId && onNavigateToChat && onNavigateToChat(sale.customerId)}
                className={`group flex items-center justify-between p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 hover:border-primary/20 hover:bg-white hover:shadow-xl transition-all duration-500 animate-in fade-in slide-in-from-bottom duration-500 ${sale.customerId ? 'cursor-pointer' : ''}`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center border border-slate-200 shadow-sm group-hover:scale-110 transition-transform duration-500">
                      <span className="material-symbols-outlined text-slate-400 text-2xl">person</span>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-4 border-white rounded-full"></div>
                  </div>
                  <div>
                    <h4 className="font-black text-base text-slate-800 flex items-center gap-3">
                      {sale.customer}
                      {sale.customerId && <span className="material-symbols-outlined text-lg text-primary opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">arrow_right_alt</span>}
                    </h4>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="bg-primary/10 text-primary text-[10px] font-black px-2.5 py-1 rounded-lg border border-primary/10 tracking-widest uppercase">
                        {sale.reference}
                      </span>
                      <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">{sale.service} • {sale.date}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <p className="text-xl font-black text-slate-900 tracking-tighter">${sale.price.toLocaleString()}</p>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onUpdateSale && onUpdateSale(sale.id, { paid: !sale.paid }); }}
                    className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition-all active:scale-95 ${sale.paid ? 'text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20' : 'text-rose-600 bg-rose-500/10 hover:bg-rose-500/20'}`}
                  >
                    {sale.paid ? 'Pagado' : 'Pendiente'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {filteredSales.length === 0 && (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-20 flex flex-col items-center text-center">
               <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">folder_off</span>
               <p className="text-slate-400 font-bold">No se encontraron ventas para este periodo.</p>
            </div>
          )}
        </div>
      </div>

      {/* History Modal - Premium Drawer Style */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-end bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-500">
          <div 
            className="bg-white w-full max-w-2xl h-screen shadow-2xl flex flex-col animate-in slide-in-from-right duration-700 ease-out border-l border-slate-100"
          >
            <div className="p-10 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Historial de Transacciones</h2>
                </div>
                <div className="flex items-center gap-3 mt-2">
                   <span className="bg-emerald-100 text-emerald-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Live Ledger</span>
                   <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                     {isFilterActive ? currentDisplay : 'Todos los Registros'}
                   </p>
                </div>
              </div>

              <button 
                onClick={() => setIsHistoryModalOpen(false)}
                className="w-14 h-14 flex items-center justify-center rounded-[1.5rem] bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
              >
                <span className="material-symbols-outlined text-slate-400">close</span>
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-10 space-y-6 custom-scrollbar bg-[#fcfcfc]">
              {filteredSales.slice().reverse().map((item, idx) => (
                <div 
                  key={item.id} 
                  onClick={() => {
                    if(item.customerId && onNavigateToChat) {
                      onNavigateToChat(item.customerId);
                      setIsHistoryModalOpen(false);
                    }
                  }}
                  className={`group relative flex items-center justify-between p-8 bg-white rounded-[2.5rem] border border-slate-100 transition-all hover:border-primary/20 hover:shadow-2xl hover:shadow-slate-200/50 ${item.customerId ? 'cursor-pointer hover:-translate-x-2' : ''} animate-in slide-in-from-right duration-500`}
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50 border border-slate-100 group-hover:bg-primary/5 transition-colors flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-2xl font-bold">receipt_long</span>
                    </div>
                    <div>
                      <h4 className="font-black text-lg text-slate-800 flex items-center gap-3">
                        {item.customer}
                        {item.customerId && <span className="material-symbols-outlined text-[12px] text-primary opacity-50 group-hover:opacity-100 transition-opacity">open_in_new</span>}
                      </h4>
                      <div className="flex flex-wrap items-center gap-4 mt-2">
                        <span className="bg-primary/10 text-primary text-[10px] font-black px-2.5 py-1 rounded-lg tracking-widest border border-primary/10 uppercase">{item.reference || 'REF-N/A'}</span>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{item.service}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                        <span className="text-xs text-slate-400 font-bold">{item.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-right flex flex-col items-end gap-1">
                      <p className="text-2xl font-black text-primary tracking-tighter leading-none">${item.price.toLocaleString()}</p>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onUpdateSale && onUpdateSale(item.id, { paid: !item.paid }); }}
                        className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md transition-all active:scale-95 ${item.paid ? 'text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20' : 'text-rose-600 bg-rose-500/10 hover:bg-rose-500/20'}`}
                      >
                        {item.paid ? 'Pagado' : 'Pendiente'}
                      </button>
                    </div>
                    {onDeleteSale && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSale(item.id);
                        }}
                        className="w-12 h-12 flex items-center justify-center rounded-[1rem] bg-error/5 text-error/20 hover:bg-error hover:text-white transition-all opacity-0 group-hover:opacity-100 active:scale-90"
                      >
                        <span className="material-symbols-outlined">delete_outline</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-10 bg-white border-t border-slate-100 mt-auto">
              <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white flex justify-between items-center shadow-2xl shadow-slate-900/20">
                <div>
                  <p className="text-[11px] uppercase font-black tracking-widest text-slate-500 mb-1.5">Liquidación Total</p>
                  <p className="text-4xl font-black tracking-tighter">${stats.totalSales.toLocaleString()}</p>
                </div>
                <div className="w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center border border-white/10">
                   <div className="text-center font-black">
                      <p className="text-2xl leading-none">{filteredSales.length}</p>
                      <p className="text-[9px] uppercase tracking-widest opacity-60">Ventas</p>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Breakdown Modal */}
      {isBreakdownOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-500 p-6">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl font-bold">bar_chart</span>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Distribución</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Unidades por Plataforma</p>
                </div>
              </div>
              <button 
                onClick={() => setIsBreakdownOpen(false)}
                className="w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-slate-100 transition-colors border border-slate-200"
              >
                <span className="material-symbols-outlined text-slate-400">close</span>
              </button>
            </div>

            <div className="p-10 bg-white space-y-6">
              {Object.entries(
                filteredSales.reduce((acc, s) => {
                  acc[s.service] = (acc[s.service] || 0) + 1;
                  return acc;
                }, {})
              ).sort((a,b) => b[1] - a[1]).map(([service, count], idx) => (
                <div key={idx} className="flex items-center justify-between p-5 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:border-primary/20 hover:bg-white transition-all">
                  <div className="flex items-center gap-4">
                     <span className={`w-3 h-3 rounded-full ${idx === 0 ? 'bg-primary shadow-[0_0_10px_rgba(79,70,229,0.5)]' : 'bg-slate-300'}`}></span>
                     <span className="text-sm font-black text-slate-700 uppercase tracking-widest">{service}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black text-slate-900">{count}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase">Unidades</span>
                  </div>
                </div>
              ))}
              {filteredSales.length === 0 && (
                <div className="text-center py-10">
                   <p className="text-slate-400 font-medium italic">No hay datos de distribución disponibles.</p>
                </div>
              )}
            </div>

            <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
               <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Volumen Total Vendido</p>
                  <p className="text-3xl font-black tracking-tight">{stats.itemsSold} Unidades</p>
               </div>
               <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-white">shopping_bag</span>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

