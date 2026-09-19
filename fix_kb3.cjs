const fs = require('fs');
let c = fs.readFileSync('src/components/KnowledgeBase.jsx', 'utf8');

const regexSocio = /<select \r?\n\s*value=\{p\.owner \|\| 'Fernando'\} [\s\S]*?<\/select>/;
c = c.replace(regexSocio, `{currentUser?.role === 'admin' ? (
                        <select 
                          value={p.owner || 'Fernando'} 
                          onChange={(e) => handleTransfer(p, e.target.value)}
                          className="text-xs font-semibold text-primary outline-none bg-primary/5 hover:bg-primary/10 px-2 py-0.5 rounded cursor-pointer transition-colors"
                        >
                          {['Fernando', 'Nicolás', 'Daniel'].filter(n => !users.find(u => u.username === n)).map(name => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                          {users.map(u => (
                            <option key={u.id} value={u.username}>{u.username}</option>
                          ))}
                        </select>
                        ) : (
                          <span className="text-xs font-semibold text-primary px-1">{p.owner || 'Fernando'}</span>
                        )}`);

fs.writeFileSync('src/components/KnowledgeBase.jsx', c);
