import React, { useState, useEffect } from 'react';

const Remarketing = ({ serverUrl }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${serverUrl}/api/customers`);
      const data = await res.json();
      setCustomers(data.sort((a, b) => b.firstSeen - a.firstSeen));
    } catch (e) {
      console.error('Error fetching customers:', e);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Teléfono,Nombre,Fecha Registro\n"
      + customers.map(c => `${c.phone},${c.name},${new Date(c.firstSeen).toLocaleDateString('es-CO')}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `clientes_remarketing_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 bg-slate-50 overflow-hidden flex flex-col relative w-full h-full max-w-[1200px] mx-auto p-4 md:p-6 pb-24 md:pb-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl md:text-2xl font-semibold tracking-tight text-slate-800">Clientes de Remarketing</h1>
          <p className="text-slate-500 text-sm mt-1">Base de datos de números capturados automáticamente</p>
        </div>
        <button 
          onClick={downloadCSV}
          disabled={customers.length === 0}
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined">download</span>
          Exportar CSV
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center flex-1 h-64">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 h-64 text-slate-400">
            <span className="material-symbols-outlined text-6xl mb-2 opacity-50">group_off</span>
            <p>No hay clientes registrados aún.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs  font-bold">
                  <th className="p-4 rounded-tl-2xl">Teléfono</th>
                  <th className="p-4">Nombre</th>
                  <th className="p-4 rounded-tr-2xl">Fecha de Registro</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-semibold text-slate-700">{c.phone}</td>
                    <td className="p-4 text-slate-600">{c.name}</td>
                    <td className="p-4 text-slate-500 text-sm">{new Date(c.firstSeen).toLocaleString('es-CO')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Remarketing;
