import React, { useState, useRef, useEffect } from 'react';

const ChatInput = ({ onSend, isBlocked }) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Cleanup preview on unmount
    return () => {
      if (filePreview && !filePreview.startsWith('data:')) {
        URL.revokeObjectURL(filePreview);
      }
    };
  }, [filePreview]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('El archivo es demasiado grande. Máximo 5MB.');
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFilePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = () => {
    if (!inputValue.trim() && !filePreview) return;
    onSend(inputValue, selectedFile, filePreview);
    setInputValue('');
    clearFile();
    const textarea = document.querySelector('textarea');
    if (textarea) textarea.style.height = 'auto';
  };

  if (isBlocked) {
    return (
      <footer className="p-4 bg-white border-t border-outline-variant">
        <div className="flex items-center justify-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg border border-red-100 text-xs font-medium">
          <span className="material-symbols-outlined text-sm">block</span>
          Contacto bloqueado
        </div>
      </footer>
    );
  }

  return (
    <footer className="p-4 bg-white border-t border-outline-variant relative z-20">
      <div className="flex flex-col gap-2">
        {filePreview && (
          <div className="relative inline-block w-24 h-24 bg-slate-100 rounded-lg border border-slate-200 p-1">
            <img src={filePreview} alt="Preview" className="w-full h-full object-cover rounded-md" />
            <button 
              onClick={clearFile}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:bg-red-600"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          </div>
        )}

        <div className="flex items-end gap-3">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 flex-shrink-0 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-full flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">attach_file</span>
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
          
          <div className="flex-grow flex items-center bg-white border border-slate-200 rounded-lg px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
            <textarea 
                className="w-full bg-transparent border-none text-sm text-slate-700 focus:ring-0 focus:outline-none placeholder:text-slate-400 resize-none min-h-[20px] max-h-[120px] py-0 m-0 leading-relaxed custom-scrollbar flex items-center" 
                rows={1}
                placeholder={filePreview ? "Añadir un comentario..." : "Escribe un mensaje..."} 
                value={inputValue}
                onChange={(e) => {
                    setInputValue(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = (e.target.scrollHeight) + 'px';
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                        e.target.style.height = 'auto';
                    }
                }}
              />
          </div>
          
          <button 
            onClick={handleSend}
            className="w-10 h-10 bg-primary text-white rounded-lg flex items-center justify-center hover:bg-primary-hover active:scale-[0.98] transition-all shadow-sm flex-shrink-0"
          >
            <span className="material-symbols-outlined text-xl">send</span>
          </button>
        </div>
      </div>
    </footer>
  );
};

export default ChatInput;
