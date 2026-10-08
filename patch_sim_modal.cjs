const fs = require('fs');
let code = fs.readFileSync('src/components/Simulator.jsx', 'utf8');

const modalUI = `
      {/* Modal de Diagnóstico */}
      {diagnosticResult && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative">
            <button onClick={() => setDiagnosticResult(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <span className="material-symbols-outlined">close</span>
            </button>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Diagnóstico de Sincronización</h3>
            <p className="text-xs text-slate-500 mb-4">Ejecutado el {diagnosticResult.date} (Solo Lectura)</p>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium text-slate-600">Pedidos Consultados (Dropi)</span>
                <span className="font-bold text-slate-800">{diagnosticResult.stats?.consultados || 0}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium text-slate-600">Guías Encontradas</span>
                <span className="font-bold text-emerald-600">{diagnosticResult.stats?.guiasEncontradas || 0}</span>
              </div>
              
              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Asociaciones (Match)</h4>
                <div className="flex justify-between text-sm mb-1"><span className="text-slate-500">Por Historial Previo:</span> <span className="font-semibold text-slate-700">{diagnosticResult.stats?.asociadosPrevios || 0}</span></div>
                <div className="flex justify-between text-sm mb-1"><span className="text-slate-500">Por Shopify Order ID:</span> <span className="font-semibold text-slate-700">{diagnosticResult.stats?.asociadosShopify || 0}</span></div>
                <div className="flex justify-between text-sm mb-1"><span className="text-slate-500">Por Teléfono Visible:</span> <span className="font-semibold text-slate-700">{diagnosticResult.stats?.asociadosTelefono || 0}</span></div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center p-2 bg-amber-50 rounded-lg border border-amber-100">
                  <span className="text-sm font-bold text-amber-700">Requieren Extracción de Detalles</span>
                  <span className="font-black text-amber-600">{diagnosticResult.stats?.requierenDetalleDropi || 0}</span>
                </div>
                <p className="text-[10px] text-amber-600/80 mt-1 px-1">Estos pedidos se encolan para que Playwright lea su detalle a un ritmo de 5 por ciclo de cron.</p>
                <div className="flex justify-between text-xs mt-2 px-1"><span className="text-slate-500">Tamaño de la Cola:</span> <span className="font-bold text-slate-700">{diagnosticResult.stats?.tamañoColaActual || 0}</span></div>
                <div className="flex justify-between text-xs mt-1 px-1"><span className="text-slate-500">Fallos Máximos (Ignorados):</span> <span className="font-bold text-red-500">{diagnosticResult.stats?.fallosAcumulados || 0}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
`;

code = code.replace(/    <\/div>\s*\);\s*};\s*export default Simulator;/m, modalUI + '\nexport default Simulator;');
fs.writeFileSync('src/components/Simulator.jsx', code);
