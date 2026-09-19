const fs = require('fs');
let content = fs.readFileSync('src/components/KnowledgeBase.jsx', 'utf8');

// 1. Add currentUser to props
content = content.replace('const KnowledgeBase = ({ serverUrl }) => {', 'const KnowledgeBase = ({ serverUrl, currentUser }) => {');

// 2. Set default ownerFilter
content = content.replace("const [ownerFilter, setOwnerFilter] = useState('Todos');", "const [ownerFilter, setOwnerFilter] = useState(currentUser?.role === 'admin' ? 'Todos' : (currentUser?.username || 'Todos'));");

// 3. Set default owner in openNewModal
content = content.replace(/setEditingProduct\(\{ name: '', owner: 'Fernando',/g, "setEditingProduct({ name: '', owner: currentUser?.role === 'admin' ? 'Fernando' : (currentUser?.username || 'Fernando'),");

content = content.replace(/setEditingStore\(\{ owner: 'Fernando'/g, "setEditingStore({ owner: currentUser?.role === 'admin' ? 'Fernando' : (currentUser?.username || 'Fernando')");

fs.writeFileSync('src/components/KnowledgeBase.jsx', content);
