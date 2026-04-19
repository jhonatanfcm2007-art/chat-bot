import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import InstallPrompt from './InstallPrompt';

const Layout = ({ children, activeTab, onTabChange }) => {
  return (
    <div className="bg-background text-on-surface font-body h-screen flex flex-col overflow-hidden relative">
      <InstallPrompt />
      <Header />
      <div className="flex h-full pt-20 pb-20 md:pb-0">
        <Sidebar activeTab={activeTab} onTabChange={onTabChange} />
        <main className="flex-grow flex overflow-hidden bg-white">
          {children}
        </main>
      </div>
      <MobileNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
};

export default Layout;
