import React, { useState, useRef, useEffect, Component } from 'react';

class DashboardErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("Dashboard Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50 text-red-900 h-full w-full overflow-auto">
          <h1 className="text-2xl font-bold mb-4">Fatal Error in Dashboard</h1>
          <pre className="text-sm bg-white p-4 rounded border border-red-200">{this.state.error && this.state.error.toString()}</pre>
          <pre className="text-xs mt-4 text-red-700">{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const Dashboard = ({ accounts, salesHistory, anomalies, chats = {}, onNavigateToChat, onDeleteSale, onUpdateSale, globalLine }) => {
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

  const allLogisticsTags = ['preparar_pedido', 'guia_enviada', 'viajando_destino', 'en_ruta', 'novedad', 'entregado'];

  const dynamicSales = (salesHistory || []).map(sale => {
    // Attempt to determine if it has been delivered by checking current chat tags
    const chat = chats?.[sale.customerId];
    const isEntregado = chat?.tags?.includes('entregado');
    
    // Create Date object based on sale.date
    let dateObj = null;
    let dateStr = sale.date || '';
    if (dateStr.includes('T')) {
        dateObj = new Date(dateStr);
    } else {
        const [year, month, day] = dateStr.split('-').map(Number);
        dateObj = new Date(year, month - 1, day);
    }

    return {
        ...sale,
        dateObj,
        paid: isEntregado || sale.paid,
        tag: chat?.tags?.find(t => allLogisticsTags.includes(t)) || null
    };
  });

  const startObj = new Date(dateRange.start);
  startObj.setHours(0,0,0,0);
  const endObj = new Date(dateRange.end);
  endObj.setHours(23,59,59,999);

  const filteredSales = dynamicSales.filter(sale => {
    if (!isFilterActive) return globalLine === 'all' || sale.waLine == globalLine;
    const dateMatch = sale.dateObj >= startObj && sale.dateObj <= endObj;
    const lineMatch = globalLine === 'all' || sale.waLine == globalLine || !sale.waLine;
    return dateMatch && lineMatch;
  });

  const stats = (() => {
    // Guatemala (GT / GTQ)
    const salesGT = filteredSales.filter(s => s.country !== 'HN');
    const totalSalesGT = salesGT.reduce((sum, s) => sum + s.price, 0);
    const itemsSoldGT = salesGT.length;
    
    // Honduras (HN / HNL)
    const salesHN = filteredSales.filter(s => s.country === 'HN');
    const totalSalesHN = salesHN.reduce((sum, s) => sum + s.price, 0);
    const itemsSoldHN = salesHN.length;

    // Totals for all
    const itemsSold = filteredSales.length;

    // Tags
    const prepararPedido = filteredSales.filter(s => s.tag === 'preparar_pedido').length;
    const guiaEnviada = filteredSales.filter(s => s.tag === 'guia_enviada').length;
    const viajando = filteredSales.filter(s => s.tag === 'viajando_destino').length;
    const enRuta = filteredSales.filter(s => s.tag === 'en_ruta').length;
    const novedad = filteredSales.filter(s => s.tag === 'novedad').length;
    const entregado = filteredSales.filter(s => s.tag === 'entregado').length;

    return { 
        itemsSold, 
        totalSalesGT, itemsSoldGT,
        totalSalesHN, itemsSoldHN,
        prepararPedido, guiaEnviada, viajando, enRuta, novedad, entregado
    };
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
    <div className="flex-grow p-4 md:p-10 bg-background overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-xl font-bold text-on-surface">Reportes de Rendimiento</h1>
        </div>

        <div className="relative" ref={pickerRef}>
          <button 
            onClick={() => setIsPickerOpen(!isPickerOpen)}
            className="group bg-white border border-slate-200 shadow-sm rounded-lg px-4 py-2.5 flex items-center gap-4 transition-colors hover:shadow min-w-[260px]"
          >
            <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">calendar_month</span>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-xs font-medium text-slate-400 leading-none mb-1">Periodo</span>
              <span className="text-sm font-semibold text-on-surface">
                {currentDisplay}
              </span>
            </div>
            <span className={`material-symbols-outlined text-slate-400 ml-auto transition-transform duration-300 ${isPickerOpen ? 'rotate-180 text-primary' : ''}`}>
              expand_more
            </span>
          </button>

          {isPickerOpen && (
            <div className="absolute top-full right-0 mt-2 z-[100] bg-white rounded-xl shadow-xl border border-slate-200 w-[500px] flex overflow-hidden">
              <div className="w-[180px] bg-slate-50 border-r border-slate-200 p-4 space-y-1">
                <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">Atajos</p>
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
                    className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-primary hover:bg-primary-light transition-all"
                  >
                    {btn.label}
                  </button>
                ))}
                <div className="pt-3 mt-3 border-t border-slate-200">
                  <button 
                     onClick={() => { setIsFilterActive(false); setIsPickerOpen(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-error hover:bg-red-50 transition-colors"
                  >
                    Resetear Filtros
                  </button>
                </div>
              </div>

              <div className="flex-grow p-6 bg-white">
                <h3 className="text-base font-semibold text-on-surface mb-1">Calendario</h3>
                <p className="text-sm text-slate-500 mb-5">Selecciona un día específico.</p>

                <div className="p-3 bg-white rounded-lg border border-slate-200 focus-within:border-primary transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-500">
                      <span className="material-symbols-outlined text-lg">event</span>
                    </div>
                    <div className="flex-grow">
                      <label className="block text-xs font-medium text-slate-400 mb-1">Fecha</label>
                      <input 
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => handleDateClick(e.target.value)}
                        className="w-full bg-transparent border-none p-0 text-sm font-semibold text-on-surface focus:ring-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mt-5 pt-5 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-slate-400 block mb-0.5">Activo</span>
                    <p className="text-sm font-semibold text-on-surface">{currentDisplay}</p>
                  </div>
                  <button onClick={() => setIsPickerOpen(false)} className="bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors">
                    Aplicar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* GUATEMALA CARD */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-2xl shadow-lg p-6 border border-indigo-500/30 group">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors"></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                  <span className="text-2xl">🇬🇹</span>
                </div>
                <div>
                  <h3 className="text-indigo-100 text-sm font-medium">Guatemala</h3>
                  <p className="text-white text-xs opacity-70">Ingresos Brutos (Quetzales)</p>
                </div>
              </div>
              <span className="bg-indigo-500/30 text-indigo-100 text-xs font-semibold px-3 py-1 rounded-full border border-indigo-400/30 backdrop-blur-sm">
                GTQ
              </span>
            </div>
            
            <div>
              <div className="flex items-end gap-3 mb-2">
                <p className="text-4xl font-bold text-white tracking-tight">
                  Q{stats.totalSalesGT.toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded-md">
                  <span className="material-symbols-outlined text-[16px]">shopping_bag</span>
                  <span className="font-medium">{stats.itemsSoldGT} Pedidos</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* HONDURAS CARD */}
        <div className="relative overflow-hidden bg-gradient-to-br from-sky-600 to-blue-900 rounded-2xl shadow-lg p-6 border border-blue-500/30 group">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors"></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                  <span className="text-2xl">🇭🇳</span>
                </div>
                <div>
                  <h3 className="text-blue-100 text-sm font-medium">Honduras</h3>
                  <p className="text-white text-xs opacity-70">Ingresos Brutos (Lempiras)</p>
                </div>
              </div>
              <span className="bg-blue-500/30 text-blue-100 text-xs font-semibold px-3 py-1 rounded-full border border-blue-400/30 backdrop-blur-sm">
                HNL
              </span>
            </div>
            
            <div>
              <div className="flex items-end gap-3 mb-2">
                <p className="text-4xl font-bold text-white tracking-tight">
                  L{stats.totalSalesHN.toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded-md">
                  <span className="material-symbols-outlined text-[16px]">shopping_bag</span>
                  <span className="font-medium">{stats.itemsSoldHN} Pedidos</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: 'Preparar Pedido', value: stats.prepararPedido, icon: 'inventory_2', color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Guía Enviada', value: stats.guiaEnviada, icon: 'receipt_long', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Viajando', value: stats.viajando, icon: 'local_shipping', color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'En Ruta', value: stats.enRuta, icon: 'directions_car', color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Novedad', value: stats.novedad, icon: 'warning', color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Entregado', value: stats.entregado, icon: 'check_circle', color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center justify-center">
            <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-lg flex items-center justify-center mb-3`}>
              <span className="material-symbols-outlined">{stat.icon}</span>
            </div>
            <p className="text-2xl font-bold text-on-surface mb-1">{stat.value}</p>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Anomalies / AI Reports Section */}
        {(anomalies && anomalies.length > 0) && (
          <div className="lg:col-span-12 bg-rose-50/50 p-6 rounded-xl border border-rose-200 shadow-sm mb-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">warning</span>
              </div>
              <div>
                <h3 className="text-base font-semibold text-rose-900">Alertas y Reportes IA</h3>
                <p className="text-sm font-medium text-rose-700/70 mt-0.5">Anomalías detectadas recientemente que requieren revisión manual</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {anomalies.filter(a => !a.resolved).slice(0, 6).map(anomaly => (
                <div key={anomaly.id} className="bg-white border border-rose-200 rounded-lg p-4 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded uppercase tracking-wider">{anomaly.type}</span>
                      <span className="text-xs font-medium text-slate-400">{new Date(anomaly.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 mb-1">{anomaly.customerName}</p>
                    <p className="text-xs text-slate-500 mb-4 line-clamp-2">
                      {anomaly.type === 'Pedido Abandonado' 
                        ? 'El cliente parecía interesado pero no finalizó los datos, o la IA se detuvo sin confirmar.'
                        : 'El cliente ha reportado un problema o ha solicitado soporte humano.'}
                    </p>
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <button 
                      onClick={() => {
                        fetch(`${SERVER_URL}/api/anomalies/${anomaly.id}/resolve`, { method: 'POST' });
                      }}
                      className="flex-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 py-1.5 rounded transition-colors"
                    >
                      Marcar Resuelto
                    </button>
                    <button 
                      onClick={() => onNavigateToChat && onNavigateToChat(anomaly.from)}
                      className="flex-1 text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white py-1.5 rounded transition-colors"
                    >
                      Ver Chat
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {anomalies.filter(a => !a.resolved).length === 0 && (
              <p className="text-sm font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined">check_circle</span>
                No hay anomalías pendientes. Todo está funcionando correctamente.
              </p>
            )}
          </div>
        )}

        {/* Recent Activity Card - Expanded */}
        <div className="lg:col-span-12 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-light text-primary rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">list_alt</span>
              </div>
              <div>
                <h3 className="text-base font-semibold text-on-surface">Actividad de Ventas</h3>
                <p className="text-sm font-medium text-slate-500 mt-0.5">Últimas transacciones procesadas</p>
              </div>
            </div>
            <button 
              onClick={() => setIsHistoryModalOpen(true)}
              className="bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Ver Historial Completo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSales.slice(0, 10).map((sale, idx) => (
              <div 
                key={sale.id} 
                onClick={() => sale.customerId && onNavigateToChat && onNavigateToChat(sale.customerId)}
                className={`group flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200 hover:border-primary/40 hover:shadow-sm transition-all duration-200 ${sale.customerId ? 'cursor-pointer' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                      <span className="material-symbols-outlined text-[20px]">person</span>
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-on-surface flex items-center gap-1">
                      {sale.customer}
                      {sale.customerId && <span className="material-symbols-outlined text-[16px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">chevron_right</span>}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-0.5 rounded-md">
                        {sale.reference}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">{sale.service} • {sale.date}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1.5">
                  <p className="text-lg font-bold text-on-surface">
                    {sale.currency === 'HNL' ? 'L' : (sale.currency === 'GTQ' ? 'Q' : 'Q')}{sale.price.toLocaleString()}
                  </p>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onUpdateSale && onUpdateSale(sale.id, { paid: !sale.paid }); }}
                    className={`text-xs font-medium px-2 py-0.5 rounded-md transition-colors ${sale.paid ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100' : 'text-rose-700 bg-rose-50 hover:bg-rose-100'}`}
                  >
                    {sale.paid ? 'Pagado' : 'Pendiente'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {filteredSales.length === 0 && (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-lg p-12 flex flex-col items-center text-center">
               <span className="material-symbols-outlined text-[32px] text-slate-400 mb-2">folder_off</span>
               <p className="text-slate-500 font-medium text-sm">No se encontraron ventas para este periodo.</p>
            </div>
          )}
        </div>
      </div>

      {/* History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-end bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl h-screen shadow-2xl flex flex-col animate-slide-in-right">
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-white">
              <div>
                <h2 className="text-lg font-bold text-on-surface">Historial de Transacciones</h2>
                <div className="flex items-center gap-2 mt-1">
                   <span className="bg-emerald-50 text-emerald-700 text-xs font-medium px-2 py-0.5 rounded-md">Live Ledger</span>
                   <p className="text-slate-500 text-sm font-medium">
                     {isFilterActive ? currentDisplay : 'Todos los Registros'}
                   </p>
                </div>
              </div>
              <button 
                onClick={() => setIsHistoryModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-6 space-y-3 custom-scrollbar bg-slate-50">
              {filteredSales.slice().reverse().map((item, idx) => (
                <div 
                  key={item.id} 
                  onClick={() => {
                    if(item.customerId && onNavigateToChat) {
                      onNavigateToChat(item.customerId);
                      setIsHistoryModalOpen(false);
                    }
                  }}
                  className={`group relative flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200 transition-all hover:border-primary/30 hover:shadow-sm ${item.customerId ? 'cursor-pointer' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                      <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-on-surface flex items-center gap-1">
                        {item.customer}
                        {item.customerId && <span className="material-symbols-outlined text-[16px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-0.5 rounded-md">{item.reference || 'N/A'}</span>
                        <span className="text-xs font-medium text-slate-500">{item.service}</span>
                        <span className="text-xs text-slate-400 font-medium">• {item.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right flex flex-col items-end gap-1">
                      <p className="text-lg font-bold text-on-surface">${item.price.toLocaleString()}</p>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onUpdateSale && onUpdateSale(item.id, { paid: !item.paid }); }}
                        className={`text-xs font-medium px-2 py-0.5 rounded-md transition-colors ${item.paid ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100' : 'text-rose-700 bg-rose-50 hover:bg-rose-100'}`}
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
                        className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 bg-white border-t border-slate-200">
              <div className="bg-slate-800 rounded-xl p-5 text-white flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-slate-300 mb-0.5">Liquidación Total</p>
                  <p className="text-xl font-bold">GTQ {stats.totalSalesGT.toLocaleString()} | HNL {stats.totalSalesHN.toLocaleString()}</p>
                </div>
                <div className="bg-white/10 rounded-lg px-4 py-2 border border-white/10">
                   <div className="text-center">
                      <p className="text-lg font-bold leading-none">{filteredSales.length}</p>
                      <p className="text-[10px] uppercase tracking-wide text-white/60 mt-1">Ventas</p>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Breakdown Modal */}
      {isBreakdownOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-slide-in-up">
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-light text-primary rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">bar_chart</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface">Distribución</h3>
                  <p className="text-sm font-medium text-slate-500 mt-0.5">Unidades por Plataforma</p>
                </div>
              </div>
              <button 
                onClick={() => setIsBreakdownOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 bg-slate-50 space-y-2 max-h-[60vh] overflow-y-auto">
              {Object.entries(
                filteredSales.reduce((acc, s) => {
                  acc[s.service] = (acc[s.service] || 0) + 1;
                  return acc;
                }, {})
              ).sort((a,b) => b[1] - a[1]).map(([service, count], idx) => (
                <div key={idx} className="flex items-center justify-between px-4 py-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3">
                     <span className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-primary' : 'bg-slate-400'}`}></span>
                     <span className="text-sm font-semibold text-on-surface">{service}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-bold text-on-surface">{count}</span>
                    <span className="text-xs font-medium text-slate-500">uds</span>
                  </div>
                </div>
              ))}
              {filteredSales.length === 0 && (
                <div className="text-center py-6">
                   <p className="text-slate-500 text-sm font-medium">No hay datos de distribución disponibles.</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-white border-t border-slate-200 flex justify-between items-center">
               <div>
                  <p className="text-sm font-medium text-slate-500 mb-0.5">Volumen Total Vendido</p>
                  <p className="text-xl font-bold text-on-surface">{stats.itemsSold} Unidades</p>
               </div>
               <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function DashboardWrapper(props) {
  return (
    <DashboardErrorBoundary>
      <Dashboard {...props} />
    </DashboardErrorBoundary>
  );
}
