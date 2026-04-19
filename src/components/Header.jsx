import React from 'react';

const Header = () => {
  return (
    <header className="bg-white flex justify-between items-center w-full px-4 md:px-8 h-20 z-50 fixed top-0 font-headline tracking-tight border-b border-outline-variant">
      <div className="flex items-center gap-8">
        <span className="text-xl font-bold tracking-wider text-primary hidden md:block">Admin Vault</span>

        <div className="hidden md:flex items-center bg-secondary-bg px-4 py-2 rounded-lg gap-3">
          <span className="material-symbols-outlined text-on-surface-variant">search</span>
          <input 
            className="bg-transparent border-none focus:ring-0 text-sm text-on-surface w-64 px-0" 
            placeholder="Buscar cuentas..." 
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary">notifications</span>
        <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary">help</span>
        <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant">
          <img 
            alt="Administrator Avatar" 
            className="w-full h-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDkhfyqiMCHE-ifNl6WZsm5jJnBL4Y5b4gl2TozJW9AvAlOgRI4i9Mz60k2CmNlk3KrV2dYSREFgAmzSa3rGnQQV2dHSV6s3nTMw0U-oXRTXLcLtkOfLYzsDNgdCjixFrSrKRESvX9yKwINhNhJHv9qtK1071_A8rLZARSCdw-AT7jsspLio3yFsPBycn6nZgRNjq0fAyeWjYfXu68I-k5e0xNwQr-BKUaVNA9L56kVPQ_VuktY5rvxmVd0ooc4LnDNDzA7XKrxwutp"
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
