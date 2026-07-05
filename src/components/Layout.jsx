import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import InstallPrompt from './InstallPrompt';
import NotificationPrompt from './NotificationPrompt';

const Layout = ({ children, activeTab, onTabChange, notifications, onNotificationClick, onClearNotifications, serverUrl, globalLine, setGlobalLine }) => {
  return (
    <div className="bg-background text-on-surface font-body h-screen flex overflow-hidden relative selection:bg-primary/20">
      <InstallPrompt />
      <NotificationPrompt serverUrl={serverUrl} />

      {/* Desktop Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        globalLine={globalLine}
        setGlobalLine={setGlobalLine}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col md:ml-16 min-w-0">
        <Header
          activeTab={activeTab}
          onTabChange={onTabChange}
          notifications={notifications}
          onNotificationClick={onNotificationClick}
          onClearNotifications={onClearNotifications}
          globalLine={globalLine}
          setGlobalLine={setGlobalLine}
        />
        <main className="flex-1 flex overflow-hidden pt-14 pb-16 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
};

export default Layout;
