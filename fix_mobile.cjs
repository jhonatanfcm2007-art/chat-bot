const fs = require('fs');
let c = fs.readFileSync('src/components/MobileNav.jsx', 'utf8');

c = c.replace('const MobileNav = ({ activeTab, onTabChange }) => {', 'const MobileNav = ({ activeTab, onTabChange, currentUser }) => {');
c = c.replace(/  const menuItems = \[\s*\{ id: 'simulator', icon: 'chat' \},\s*\{ id: 'ai_assistant', icon: 'psychology' \},\s*\{ id: 'knowledge_base', icon: 'menu_book' \},\s*\];/g, `  const menuItems = [
    { id: 'simulator', icon: 'chat' },
    { id: 'knowledge_base', icon: 'menu_book' },
    ...(['admin', 'socio'].includes(currentUser?.role) ? [
      { id: 'ai_assistant', icon: 'psychology' }
    ] : []),
    ...(currentUser?.role === 'admin' ? [
      { id: 'users', icon: 'people' },
    ] : [])
  ];`);

fs.writeFileSync('src/components/MobileNav.jsx', c);
