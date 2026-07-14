import React, { useState, useRef } from 'react';

const DropiUploadModal = ({ onClose, serverUrl, onConfirmResults }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target.result);
      reader.readAsDataURL(selected);
    }
  };

  const handleUpload = async () => {
    if (!preview) return;
    setIsProcessing(true);
    try {
      const response = await fetch(`${serverUrl}/api/extract-dropi-tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: preview })
      });
      const data = await response.json();
      if (data.success) {
        if (data.data.length === 0) {
            alert('No se detectaron guías en esta imagen.');
        } else {
            if (onConfirmResults) {
                onConfirmResults(data.data);
            }
            alert(`¡Éxito! Se detectaron y procesaron ${data.data.length} guías automáticamente.`);
            onClose();
        }
      } else {
        alert('Error extrayendo datos: ' + data.error);
      }
    } catch (err) {
      alert('Error de conexión con el servidor.');
    }
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">Carga Automática de Guías Dropi</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
            <div className="flex flex-col items-center gap-6">
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
              />
              {!preview ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-48 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-4xl mb-2 text-indigo-400">add_photo_alternate</span>
                  <p className="font-medium">Haz click para subir la captura de Dropi</p>
                  <p className="text-xs mt-2 opacity-70">La Inteligencia Artificial extraerá nombres, teléfonos y guías.</p>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center gap-4">
                  <img src={preview} alt="Preview" className="max-h-64 object-contain rounded-lg border border-slate-200 shadow-sm" />
                  <button 
                    onClick={() => { setFile(null); setPreview(''); }}
                    className="text-sm text-red-500 font-medium hover:underline"
                  >
                    Elegir otra imagen
                  </button>
                </div>
              )}
              
              <button 
                onClick={handleUpload}
                disabled={!preview || isProcessing}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${!preview || isProcessing ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700 hover:shadow-lg'}`}
              >
                {isProcessing ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">refresh</span>
                    Analizando y Enviando Guías...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">send</span>
                    Procesar y Enviar Automáticamente
                  </>
                )}
              </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default DropiUploadModal;
