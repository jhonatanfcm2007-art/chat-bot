const fs = require('fs');
let code = fs.readFileSync('src/components/AIAssistant.jsx', 'utf8');

code = code.replace(
  "const [welcomeImageEnabled, setWelcomeImageEnabled] = useState(false);",
  "const [welcomeImageEnabled, setWelcomeImageEnabled] = useState(false);\n  const [metaPixelId, setMetaPixelId] = useState('');\n  const [metaCapiToken, setMetaCapiToken] = useState('');"
);

code = code.replace(
  "welcomeImageUrl: ''",
  "welcomeImageUrl: '',\n      metaPixelId: '',\n      metaCapiToken: ''"
);

code = code.replace(
  "setWelcomeImageUrl(lineSettings.welcomeImageUrl || '');",
  "setWelcomeImageUrl(lineSettings.welcomeImageUrl || '');\n      setMetaPixelId(lineSettings.metaPixelId || '');\n      setMetaCapiToken(lineSettings.metaCapiToken || '');"
);

code = code.replace(
  "welcomeImageUrl,",
  "welcomeImageUrl,\n        metaPixelId,\n        metaCapiToken,"
);

// Inject UI at the bottom of AIAssistant before the last div
const uiHtml = `
          {/* Integración Meta Ads */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <span className="material-symbols-outlined">ads_click</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">API de Conversiones (Meta Pixel)</h3>
                <p className="text-sm text-slate-500">Configura el Pixel de Facebook exclusivo para esta línea.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">ID del Pixel</label>
                <input
                  type="text"
                  value={metaPixelId}
                  onChange={e => setMetaPixelId(e.target.value)}
                  placeholder="Ej: 123456789012345"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Token de Acceso CAPI</label>
                <input
                  type="password"
                  value={metaCapiToken}
                  onChange={e => setMetaCapiToken(e.target.value)}
                  placeholder="EAAI..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm"
                />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4">
              Al configurar estos datos, el CRM enviará automáticamente el evento <strong>Purchase</strong> a Facebook cada vez que el bot confirme un pedido, mejorando drásticamente la calidad de tus anuncios.
            </p>
          </div>
`;

// Insert the UI before the Save Button wrapper.
// The save button wrapper looks like: <div className="flex justify-end pt-4">
code = code.replace('<div className="flex justify-end pt-4">', uiHtml + '\n          <div className="flex justify-end pt-4">');

fs.writeFileSync('src/components/AIAssistant.jsx', code);
console.log('Patched AIAssistant.jsx with Meta Pixel settings!');
