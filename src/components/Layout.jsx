import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import InstallPrompt from './InstallPrompt';
import NotificationPrompt from './NotificationPrompt';

const Layout = ({ children, activeTab, onTabChange, notifications, onNotificationClick, onClearNotifications, serverUrl, globalLine, setGlobalLine }) => {
  return (
    <div className="bg-background text-on-surface font-body h-screen flex flex-col overflow-hidden relative selection:bg-primary/20">
      <InstallPrompt />
      <NotificationPrompt serverUrl={serverUrl} />
      <Header 
        activeTab={activeTab} 
        onTabChange={onTabChange}
        notifications={notifications} 
        onNotificationClick={onNotificationClick} 
        onClearNotifications={onClearNotifications} 
        globalLine={globalLine}
        setGlobalLine={setGlobalLine}
      />
      <div className="flex h-full pt-16 pb-20 md:pb-0">
        <main className="flex-grow flex overflow-hidden">
          {children}
        </main>
      </div>
      <MobileNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
};

export default Layout;
