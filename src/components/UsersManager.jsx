import React, { useState, useEffect } from 'react';

const UsersManager = ({ serverUrl, currentUser }) => {
  const [users, setUsers] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ id: '', username: '', password: '', role: 'agent', assignedLines: [] });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${serverUrl}/api/users`);
      const data = await res.json();
      setUsers(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    const newUsers = isEditing ? users.map(u => u.id === formData.id ? formData : u) : [...users, { ...formData, id: 'user_' + Date.now() }];
    try {
      await fetch(`${serverUrl}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUsers)
      });
      setUsers(newUsers);
      setFormData({ id: '', username: '', password: '', role: 'agent', assignedLines: [] });
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleEdit = (user) => {
    setFormData(user);
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (id === 'admin') return;
    const newUsers = users.filter(u => u.id !== id);
    try {
      await fetch(`${serverUrl}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUsers)
      });
      setUsers(newUsers);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleLine = (line) => {
    setFormData(prev => ({
      ...prev,
      assignedLines: prev.assignedLines.includes(line) ? prev.assignedLines.filter(l => l !== line) : [...prev.assignedLines, line]
    }));
  };

  if (currentUser?.role !== 'admin') return <div className="p-8 text-center text-slate-500">Acceso denegado</div>;

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-slate-800">Gestión de Usuarios</h1>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold mb-4">{isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
              <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <input type="text" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" placeholder="Dejar en blanco para no cambiar" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
              <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                <option value="agent">Agente (Solo Chats)</option>
                <option value="socio">Socio (Chats + Conocimiento)</option>
                <option value="admin">Administrador (Total)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Líneas Asignadas (Socios y Agentes)</label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map(line => (
                  <button key={line} onClick={() => toggleLine(line)} className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${formData.assignedLines?.includes(line) ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    Línea {line}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            {isEditing && <button onClick={() => { setIsEditing(false); setFormData({ id: '', username: '', password: '', role: 'agent', assignedLines: [] }); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Cancelar</button>}
            <button onClick={handleSave} disabled={!formData.username || (!formData.password && !isEditing)} className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Usuario</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Rol</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Líneas</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-800">{u.username}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'socio' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {u.role === 'admin' ? 'Admin' : u.role === 'socio' ? 'Socio' : 'Agente'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {u.role === 'admin' ? <span className="text-slate-400 text-sm">Todas</span> : (
                      <div className="flex gap-1">
                        {u.assignedLines?.map(l => <span key={l} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">L{l}</span>)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleEdit(u)} className="text-primary hover:text-primary/80 font-medium text-sm mr-4">Editar</button>
                    {u.id !== 'admin' && <button onClick={() => handleDelete(u.id)} className="text-red-500 hover:text-red-600 font-medium text-sm">Eliminar</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UsersManager;
