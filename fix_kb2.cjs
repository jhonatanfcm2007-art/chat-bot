const fs = require('fs');
let c = fs.readFileSync('src/components/KnowledgeBase.jsx', 'utf8');

c = c.replace('<div className="relative flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">', "{currentUser?.role === 'admin' && (<div className=\"relative flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm\">");
c = c.replace(/<\/select>\r?\n\s*<\/div>\r?\n\s*<button/g, '</select>\n          </div>\n          )}\n          <button');

fs.writeFileSync('src/components/KnowledgeBase.jsx', c);
