
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../db';
import { User, UserRole, Privilege } from '../types';
import { Shield, Plus, Edit, Trash2, X, Save, Lock, UserCheck, LayoutGrid, List, Loader2, Mail, Key, Fingerprint, Download, Upload } from 'lucide-react';

const AVAILABLE_PRIVILEGES: Privilege[] = [
  'MANAGE_USERS', 'VIEW_REPORTS', 'MANAGE_CUSTOMERS', 'MANAGE_SERVICES', 'MANAGE_JOBS', 'MANAGE_INVENTORY'
];

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [view, setView] = useState<'GRID' | 'TABLE'>('TABLE');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await db.users.all();
        setUsers(data);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const [formData, setFormData] = useState<Partial<User>>({
    username: '',
    email: '',
    password: '',
    role: 'STAFF',
    privileges: ['MANAGE_CUSTOMERS', 'MANAGE_JOBS']
  });

  const handleSave = async () => {
    if (editingUser) {
      const updatedUser = { ...editingUser, ...formData } as User;
      await db.users.save(updatedUser);
      setUsers(users.map(u => u.id === editingUser.id ? updatedUser : u));
    } else {
      const newUser: User = { ...formData, id: 'u' + Date.now() } as User;
      await db.users.save(newUser);
      setUsers([...users, newUser]);
    }
    closeModal();
  };

  const togglePrivilege = (p: Privilege) => {
    const current = formData.privileges || [];
    if (current.includes(p)) {
      setFormData({...formData, privileges: current.filter(x => x !== p)});
    } else {
      setFormData({...formData, privileges: [...current, p]});
    }
  };

  const openModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData(user);
    } else {
      setEditingUser(null);
      setFormData({ username: '', email: '', password: '', role: 'STAFF', privileges: ['MANAGE_CUSTOMERS', 'MANAGE_JOBS'] });
    }
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingUser(null); };

  const handleDelete = async (id: string) => {
    if (window.confirm('Revoke access and delete user profile?')) {
      await db.users.delete(id);
      setUsers(users.filter(u => u.id !== id));
    }
  };

  const handleBackup = async () => {
    setIsProcessing(true);
    try {
      await db.system.backup();
    } finally {
      setTimeout(() => setIsProcessing(false), 500);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (window.confirm('Restoring from Excel will overwrite current database. System will reload. Continue?')) {
        setIsProcessing(true);
        try {
          await db.system.restore(file);
          window.location.reload();
        } catch (err) {
          setIsProcessing(false);
          alert('Failed to restore database. Invalid Excel backup file.');
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isProcessing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-950 p-10 rounded-[15px] shadow-2xl flex flex-col items-center space-y-4 border border-slate-100 dark:border-slate-800">
            <Loader2 className="animate-spin text-blue-600" size={48} />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Full System Sync In Progress...</p>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center space-x-4 w-full md:w-auto">
          <div className="flex bg-white dark:bg-slate-900 p-1 rounded-[15px] border border-slate-200 dark:border-slate-800 shrink-0 shadow-sm">
            <button onClick={() => setView('GRID')} className={`p-2.5 rounded-[15px] transition-all ${view === 'GRID' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}><LayoutGrid size={20}/></button>
            <button onClick={() => setView('TABLE')} className={`p-2.5 rounded-[15px] transition-all ${view === 'TABLE' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><List size={20}/></button>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleBackup} 
              className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[15px] text-slate-400 hover:text-blue-600 hover:border-blue-500/50 transition-all flex items-center space-x-2 text-xs font-black uppercase tracking-widest shadow-sm"
              title="Backup Database (Excel)"
            >
              <Download size={18} />
              <span className="hidden sm:inline">Backup</span>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[15px] text-slate-400 hover:text-emerald-600 hover:border-emerald-500/50 transition-all flex items-center space-x-2 text-xs font-black uppercase tracking-widest shadow-sm"
              title="Restore Database (Excel)"
            >
              <Upload size={18} />
              <span className="hidden sm:inline">Restore</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleRestore} 
              className="hidden" 
              accept=".xlsx"
            />
          </div>
        </div>
        
        <button onClick={() => openModal()} className="bg-slate-900 dark:bg-white text-white dark:text-black px-8 py-3 rounded-[15px] font-black text-xs uppercase tracking-widest flex items-center space-x-3 hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white transition-all shadow-xl active:scale-95">
          <Shield size={18} />
          <span>Provision User</span>
        </button>
      </div>

      {view === 'GRID' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {users.map(user => (
            <div key={user.id} className="bg-white dark:bg-slate-900 p-8 rounded-[15px] border border-slate-100 dark:border-slate-800 shadow-xl relative overflow-hidden group hover:border-blue-500/50 transition-all">
              <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                <button onClick={() => openModal(user)} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-[15px] text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-all"><Edit size={16} /></button>
                {user.role !== 'ADMIN' && <button onClick={() => handleDelete(user.id)} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-[15px] text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 transition-all"><Trash2 size={16} /></button>}
              </div>
              
              <div className="flex items-center space-x-5 mb-8">
                <div className="w-16 h-16 rounded-[15px] bg-slate-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-2xl border border-slate-100 dark:border-slate-800 shadow-inner group-hover:scale-110 transition-transform uppercase">
                  {user.username[0]}
                </div>
                <div>
                  <h4 className="font-black text-lg text-slate-900 dark:text-slate-100 leading-none">{user.username}</h4>
                  <p className="text-[10px] text-slate-500 font-bold mt-1 lowercase truncate max-w-[150px]">{user.email || 'no email'}</p>
                  <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest mt-2 block border ${
                    user.role === 'ADMIN' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                  }`}>{user.role}</span>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Access Privileges</p>
                <div className="flex flex-wrap gap-2">
                  {user.privileges.map(p => (
                    <span key={p} className="text-[9px] bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-lg font-black uppercase tracking-widest border border-slate-100 dark:border-slate-800">{p.replace('MANAGE_', '').replace('VIEW_', '').replace('_', ' ')}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-[15px] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                <th className="px-10 py-6">Operational Identity</th>
                <th className="px-8 py-6">Email Address</th>
                <th className="px-8 py-6">Authority Role</th>
                <th className="px-8 py-6">Scope of Work</th>
                <th className="px-10 py-6 text-right">Security</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-10 py-6 font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest text-sm">{user.username}</td>
                  <td className="px-8 py-6 text-xs text-slate-400 lowercase">{user.email || '---'}</td>
                  <td className="px-8 py-6">
                    <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border ${user.role === 'ADMIN' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20'}`}>{user.role}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-wrap gap-1.5 max-w-xs">
                      {user.privileges.slice(0, 3).map(p => (
                        <span key={p} className="text-[8px] bg-slate-50 dark:bg-slate-950 text-slate-500 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800 uppercase font-black">{p.split('_')[1]}</span>
                      ))}
                      {user.privileges.length > 3 && <span className="text-[8px] text-slate-600 font-black">+ {user.privileges.length - 3}</span>}
                    </div>
                  </td>
                  <td className="px-10 py-6 text-right space-x-2">
                    <button onClick={() => openModal(user)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-[15px] text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-all"><Edit size={18} /></button>
                    {user.role !== 'ADMIN' && <button onClick={() => handleDelete(user.id)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-[15px] text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 transition-all"><Trash2 size={18} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-950 w-full max-w-4xl rounded-[15px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in duration-300">
            <div className="px-12 py-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">{editingUser ? 'Policy Update' : 'Access Provisioning'}</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">Credentials & Privileges</p>
              </div>
              <button onClick={closeModal} className="p-3.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-[15px] transition-all shadow-sm"><X size={20} /></button>
            </div>
            
            <div className="flex flex-col lg:flex-row max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="flex-1 p-12 space-y-8">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">System Username</label>
                  <div className="relative">
                    <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input type="text" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className="w-full pl-12 pr-6 py-4 rounded-[15px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-black outline-none focus:border-blue-500 transition-all shadow-sm" placeholder="Username" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Recovery Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full pl-12 pr-6 py-4 rounded-[15px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-black outline-none focus:border-blue-500 transition-all shadow-sm" placeholder="email@regal.com" />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Secure Password</label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full pl-12 pr-6 py-4 rounded-[15px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-black outline-none focus:border-blue-500 transition-all shadow-sm" placeholder="••••••••" />
                  </div>
                </div>
              </div>

              <div className="hidden lg:block w-px bg-slate-100 dark:bg-slate-800 my-8"></div>

              <div className="lg:w-[380px] p-12 bg-slate-50 dark:bg-slate-900/20 space-y-8">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Functional Role</label>
                  <div className="flex flex-col gap-3">
                    {(['ADMIN', 'MANAGER', 'STAFF'] as UserRole[]).map(role => (
                      <button 
                        key={role}
                        onClick={() => setFormData({...formData, role})}
                        className={`py-3.5 px-6 rounded-[15px] text-[10px] font-black uppercase tracking-widest border-2 transition-all flex items-center justify-between group ${
                          formData.role === role ? 'border-blue-600 bg-blue-600/10 text-blue-600 dark:text-blue-400' : 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <span>{role}</span>
                        {formData.role === role && <Shield size={14} />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Security Scopes</label>
                  <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                    {AVAILABLE_PRIVILEGES.map(p => (
                      <label key={p} className="flex items-center space-x-4 p-4 bg-white dark:bg-slate-900/50 rounded-[15px] border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                        <input 
                          type="checkbox" 
                          checked={formData.privileges?.includes(p)}
                          onChange={() => togglePrivilege(p)}
                          className="w-5 h-5 rounded bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">
                          {p.replace('MANAGE_', '').replace('VIEW_', '').replace('_', ' ')}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-12 py-10 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-6">
              <button onClick={closeModal} className="px-8 py-3.5 font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-[10px] hover:text-slate-900 dark:hover:text-white transition-colors">Cancel</button>
              <button onClick={handleSave} className="bg-slate-900 dark:bg-white text-white dark:text-black px-12 py-3.5 rounded-[15px] font-black text-xs uppercase tracking-widest hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white transition-all shadow-xl active:scale-95 flex items-center space-x-3">
                <Shield size={18} />
                <span>Save Policy</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
