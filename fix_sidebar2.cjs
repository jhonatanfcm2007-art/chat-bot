const fs = require('fs');
let c = fs.readFileSync('src/components/Sidebar.jsx', 'utf8');

c = c.replace(/    const navItems = \[\s*\{ id: 'simulator', icon: 'chat', label: 'Chats' \},\s*\.\.\.\(\['admin', 'socio'\]\.includes\(currentUser\?\.role\) \? \[\s*\{ id: 'ai_assistant', icon: 'psychology', label: 'Entrenar IA' \},\s*\{ id: 'knowledge_base', icon: 'menu_book', label: 'Conocimiento' \},\s*\] : \[\]\),/g, `    const navItems = [
      { id: 'simulator', icon: 'chat', label: 'Chats' },
      { id: 'knowledge_base', icon: 'menu_book', label: 'Conocimiento' },
      ...(currentUser?.role === 'admin' ? [{ id: 'ai_assistant', icon: 'psychology', label: 'Entrenar IA' }] : []),`);

fs.writeFileSync('src/components/Sidebar.jsx', c);
