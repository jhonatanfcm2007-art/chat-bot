import React, { useState, useRef, useEffect } from 'react';

const Dashboard = ({ accounts, salesHistory, onNavigateToChat }) => {

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  const [dateRange, setDateRange] = useState({
    start: today,
    end: today
  });

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isFilterActive, setIsFilterActive] = useState(true);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const pickerRef = useRef(null);

  // Close picker on click outside
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
    if (!isFilterActive) return true;
    return sale.date >= dateRange.start && sale.date <= dateRange.end;
  });

  // Simulated dynamic data based on filter
  const getStats = () => {
    const totalSales = filteredSales.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
    const totalCosts = filteredSales.reduce((sum, s) => sum + (parseFloat(s.cost) || 0), 0);
    const netProfit = totalSales - totalCosts;
    const activeSubs = filteredSales.length; 

    return [
      { label: 'Total Revenue', value: `$${totalSales.toLocaleString()}`, icon: 'insights', color: 'bg-primary/20 text-primary border-primary/20', glow: 'shadow-primary/10' },
      { label: 'Net Profit', value: `$${netProfit.toLocaleString()}`, icon: 'payments', color: 'bg-tertiary/20 text-tertiary border-tertiary/20', glow: 'shadow-tertiary/10' },
      { label: 'Items Sold', value: activeSubs.toString(), icon: 'shopping_cart', color: 'bg-white/10 text-white border-white/20', glow: 'shadow-white/5' },
    ];
  };


  const activityList = filteredSales.map(sale => ({

    id: sale.id,
    customerId: sale.customerId,
    reference: sale.reference,
    customer: sale.customer,
    service: sale.service,
    provider: sale.provider,
    time: sale.date,
    amount: `$${sale.price.toLocaleString()}`
  }));


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
    <div className="flex-grow p-8 bg-background overflow-y-auto custom-scrollbar">
      {/* Unified Picker Area */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-white tracking-tight font-headline">Overview</h1>
            {isFilterActive && (
              <span className="bg-primary/20 text-primary px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-primary/20">
                {dateRange.start === dateRange.end ? 'Daily View' : 'Range View'}
              </span>
            )}
          </div>
          <p className="text-on-surface-variant text-sm mt-1 font-medium opacity-60">Real-time performance analytics</p>

        </div>

        <div className="relative" ref={pickerRef}>
          {/* Unified Trigger Box */}
          <div 
            onClick={() => setIsPickerOpen(!isPickerOpen)}
            className="bg-white/5 border border-white/10 hover:border-primary/40 cursor-pointer shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-4 transition-all active:scale-[0.98] group min-w-[320px] backdrop-blur-md"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors border border-primary/20">
              <span className="material-symbols-outlined text-primary text-xl">calendar_today</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] leading-none mb-1.5 opacity-50">
                {dateRange.start === dateRange.end ? 'Selected Day' : 'Selected Period'}
              </span>
              <span className="text-sm font-black text-white tracking-wide">
                {currentDisplay}
              </span>

            </div>
            <span className={`material-symbols-outlined text-on-surface-variant/40 ml-auto transition-transform duration-500 ${isPickerOpen ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </div>

            <div className="absolute top-full right-0 mt-4 z-[100] bg-[#111827]/95 backdrop-blur-3xl rounded-3xl shadow-[0_30px_100px_rgba(0,0,0,0.8)] border border-white/10 w-[520px] flex overflow-hidden animate-in fade-in zoom-in-95 duration-300">
              {/* Presets Sidebar */}
              <div className="w-[180px] bg-white/5 border-r border-white/5 p-6 space-y-2">
                <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-5">Shortcuts</p>
                <button 
                  onClick={() => handleDateClick(today)}
                  className="w-full text-left px-5 py-3 rounded-xl text-[13px] font-medium text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all border border-transparent hover:border-primary/20"
                >
                  Today
                </button>
                <button 
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 7);
                    setPreset(d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }), today);
                  }}
                  className="w-full text-left px-5 py-3 rounded-xl text-[13px] font-medium text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all border border-transparent hover:border-primary/20"
                >
                  Last 7 Days
                </button>
                <button 
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 30);
                    setPreset(d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }), today);
                  }}
                  className="w-full text-left px-5 py-3 rounded-xl text-[13px] font-medium text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all border border-transparent hover:border-primary/20"
                >
                  Last 30 Days
                </button>
                <button 
                   onClick={() => { setIsFilterActive(false); setIsPickerOpen(false); }}
                  className="w-full text-left px-5 py-3 rounded-xl text-[13px] font-black text-error hover:bg-error/10 transition-all mt-6 border border-transparent hover:border-error/20"
                >
                  Reset Filter
                </button>
              </div>


              {/* Selection Area */}
              <div className="flex-grow p-8">
                <h3 className="text-xl font-black text-on-surface mb-2">Selecciona una Fecha</h3>
                <p className="text-xs text-on-surface-variant mb-8 font-medium italic">
                  Elige un día específico para ver el rendimiento diario.
                </p>


                <div className="space-y-4">
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary opacity-50 group-hover:opacity-100 transition-opacity">calendar_today</span>
                    <input 
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => handleDateClick(e.target.value)}
                      className="w-full bg-secondary-bg border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                    />
                  </div>
                  
                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 mt-6">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-1">Viendo</span>
                    <p className="text-sm font-black text-on-surface">
                      {currentDisplay}
                    </p>
                  </div>

                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
        {getStats().map((stat, i) => (
          <div 
            key={i} 
            className="group relative bg-white/5 p-8 rounded-[2rem] border border-white/5 shadow-2xl transition-all duration-500 hover:border-white/10 cursor-default overflow-hidden backdrop-blur-md"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 ${stat.color} rounded-full -mr-16 -mt-16 blur-3xl opacity-10 group-hover:opacity-20 transition-opacity`}></div>
            
            <div className="flex justify-between items-start mb-6 relative">
              <div className={`w-14 h-14 ${stat.color} rounded-2xl flex items-center justify-center border shadow-inner transition-transform group-hover:scale-110 duration-500`}>
                <span className="material-symbols-outlined text-2xl font-bold">{stat.icon}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-primary text-[10px] font-black flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-lg">
                  <span className="material-symbols-outlined text-xs">trending_up</span>
                  Live
                </span>
              </div>
            </div>
            
            <div className="relative z-10">
              <h3 className="text-on-surface-variant text-[11px] font-black uppercase tracking-[0.2em] mb-1.5 opacity-50">{stat.label}</h3>
              <p className="text-3xl font-black text-white leading-none tracking-tighter">{stat.value}</p>
            </div>
            
            <div className={`absolute bottom-0 left-0 h-1 bg-primary w-0 group-hover:w-full transition-all duration-700 opacity-50`}></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white/5 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl backdrop-blur-md">
          <div className="flex justify-between items-center mb-6 px-2">
            <div>
              <h3 className="font-bold text-on-surface">Actividad de Ventas Reciente</h3>
              <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mt-0.5">Lista de transacciones recientes</p>
            </div>
            <button 
              onClick={() => setIsHistoryModalOpen(true)}
              className="text-primary text-xs font-black hover:underline uppercase tracking-widest"
            >
              Ver Historial
            </button>

          </div>
          <div className="space-y-4">
            {activityList.slice(0, 3).map((item) => (
              <div 
                key={item.id} 
                onClick={() => item.customerId && onNavigateToChat && onNavigateToChat(item.customerId)}
                className={`flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-primary/30 transition-all group ${item.customerId ? 'cursor-pointer hover:bg-primary/5' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 shadow-sm group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-on-surface-variant text-xl">person</span>
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-on-surface flex items-center gap-2">
                      {item.customer}
                      {item.customerId && <span className="material-symbols-outlined text-[10px] text-primary opacity-50 group-hover:opacity-100 transition-opacity">open_in_new</span>}
                    </h4>
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter mt-0.5">
                      {item.reference && <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded mr-1.5 border border-primary/10">{item.reference}</span>}
                      {item.service} • {item.provider || 'N/A'} • {item.time}
                    </p>
                  </div>
                </div>
                <span className="font-black text-primary text-sm">{item.amount}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-outline-variant shadow-sm relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full pointer-events-none"></div>
          <h3 className="font-bold text-on-surface mb-6 px-2 uppercase text-xs tracking-[0.15em]">Ventas por Plataforma</h3>

          <div className="space-y-8">
            {Object.entries(
              filteredSales.reduce((acc, sale) => {
                acc[sale.service] = (acc[sale.service] || 0) + 1;
                return acc;
              }, {})
            ).map(([service, count], idx) => (
              <div key={idx}>
                <div className="flex justify-between text-[11px] font-black uppercase mb-2">
                  <span className="text-on-surface tracking-widest">{service}</span>
                  <span className={idx === 0 ? "text-primary" : "text-orange-500"}>{count} ventas</span>
                </div>
                <div className="w-full h-2.5 bg-secondary-bg rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${idx === 0 ? "bg-primary" : "bg-orange-500"} rounded-full transition-all`} 
                    style={{ width: `${Math.min((count / (filteredSales.length || 1)) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {filteredSales.length === 0 && (
              <p className="text-on-surface-variant text-xs italic">No hay datos de ventas para este periodo.</p>
            )}

          </div>

          
          <div className="mt-10 p-4 bg-secondary-bg/50 rounded-2xl border border-outline-variant/30 flex items-center justify-between">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Plataforma Top</span>
            <span className="text-[10px] font-black text-primary uppercase flex items-center gap-1">
              {filteredSales.length > 0 ? 
                Object.entries(filteredSales.reduce((acc, s) => { acc[s.service] = (acc[s.service] || 0) + 1; return acc; }, {}))
                .sort((a,b) => b[1] - a[1])[0][0] : 'N/A'
              }
            </span>

          </div>

        </div>
      </div>

      {/* History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-end p-4 bg-on-surface/20 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md h-[90vh] rounded-[2.5rem] shadow-2xl border border-outline-variant p-8 flex flex-col animate-in slide-in-from-right duration-500 ease-out">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-black text-on-surface">Historial de Ventas</h2>
                <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mt-1">
                  {isFilterActive ? currentDisplay : 'Actividad Histórica'}
                </p>
              </div>

              <button 
                onClick={() => setIsHistoryModalOpen(false)}
                className="w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-secondary-bg transition-colors"
              >
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>

            <div className="flex-grow overflow-y-auto pr-2 space-y-4 scrollbar-hide">
              {activityList.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => {
                    if(item.customerId && onNavigateToChat) {
                      onNavigateToChat(item.customerId);
                      setIsHistoryModalOpen(false);
                    }
                  }}
                  className={`flex items-center justify-between p-5 bg-secondary-bg/50 rounded-3xl border border-outline-variant/50 group hover:border-primary/30 transition-all ${item.customerId ? 'cursor-pointer hover:bg-white shadow-sm' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center border border-outline-variant shadow-sm group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-primary">receipt_long</span>
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-on-surface flex items-center gap-2">
                        {item.customer}
                        {item.customerId && <span className="material-symbols-outlined text-[12px] text-primary opacity-50 group-hover:opacity-100 transition-opacity">open_in_new</span>}
                      </h4>
                      <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter mt-0.5">
                        {item.reference && <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-md mr-1.5 border border-primary/10">{item.reference}</span>}
                        {item.service} • {item.provider || 'N/A'} • {item.time}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-primary text-sm">{item.amount}</p>
                    <p className="text-[9px] text-tertiary font-bold uppercase">Éxito</p>
                  </div>

                </div>
              ))}
            </div>

            <div className="mt-8 p-6 bg-primary rounded-[2rem] text-white shadow-xl shadow-primary/20">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest opacity-80 mb-1">Resultado Total</p>
                  <p className="text-2xl font-black">{activityList.length} Transacciones</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined">analytics</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
