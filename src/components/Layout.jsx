import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

const Layout = ({ children, activeTab, onTabChange }) => {
  return (
    <div className="bg-background text-on-surface font-body h-screen flex flex-col overflow-hidden">
      <Header />
      <div className="flex h-full pt-20">
        <Sidebar activeTab={activeTab} onTabChange={onTabChange} />
        <main className="flex-grow flex overflow-hidden bg-white">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
