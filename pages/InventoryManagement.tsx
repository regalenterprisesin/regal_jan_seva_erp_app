
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { InventoryItem } from '../types';
import { Plus, Search, Package, Edit, Trash2, AlertCircle, Save, X, List, LayoutGrid, Loader2 } from 'lucide-react';

const InventoryManagement: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'TABLE' | 'GRID'>('TABLE');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const data = await db.inventory.all();
        setItems(data);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInventory();
  }, []);

  const [formData, setFormData] = useState<Omit<InventoryItem, 'id' | 'lastUpdated'>>({
    name: '',
    quantity: 0,
    unit: 'Units',
    minStock: 5,
    category: ''
  });

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleSave = async () => {
    const data = { ...formData, lastUpdated: new Date().toISOString() };
    if (editingItem) {
      const updatedItem = { ...editingItem, ...data };
      await db.inventory.save(updatedItem);
      setItems(items.map(i => i.id === editingItem.id ? updatedItem : i));
    } else {
      const newItem: InventoryItem = { ...data, id: 'inv' + Date.now() } as InventoryItem;
      await db.inventory.save(newItem);
      setItems([...items, newItem]);
    }
    closeModal();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete stock item from inventory?')) {
      await db.inventory.delete(id);
      setItems(items.filter(i => i.id !== id));
    }
  };

  const openModal = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({ name: item.name, quantity: item.quantity, unit: item.unit, minStock: item.minStock, category: item.category });
    } else {
      setEditingItem(null);
      setFormData({ name: '', quantity: 0, unit: 'Units', minStock: 5, category: '' });
    }
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingItem(null); };

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="animate-spin text-emerald-500" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center space-x-4 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-3 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Query warehouse..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-12 pr-4 py-3 rounded-[15px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:border-emerald-500 transition-all shadow-sm" 
            />
          </div>
          <div className="flex bg-white dark:bg-slate-900 p-1 rounded-[15px] border border-slate-200 dark:border-slate-800 shrink-0 shadow-sm">
            <button onClick={() => setView('TABLE')} className={`p-2.5 rounded-[15px] transition-all ${view === 'TABLE' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}><List size={20}/></button>
            <button onClick={() => setView('GRID')} className={`p-2.5 rounded-[15px] transition-all ${view === 'GRID' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}><LayoutGrid size={20}/></button>
          </div>
        </div>
        <button onClick={() => openModal()} className="bg-slate-900 dark:bg-white text-white dark:text-black px-8 py-3 rounded-[15px] font-black text-xs uppercase tracking-widest flex items-center space-x-2 hover:bg-emerald-600 hover:text-white transition-all shadow-xl active:scale-95">
          <Plus size={18} />
          <span>Restock Assets</span>
        </button>
      </div>

      {view === 'TABLE' ? (
        <div className="bg-white dark:bg-slate-900 rounded-[15px] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                <th className="px-10 py-6">Asset Specification</th>
                <th className="px-8 py-6">Volume</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6">Classification</th>
                <th className="px-10 py-6 text-right">Ledger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-10 py-6 font-black text-slate-900 dark:text-slate-100">{item.name}</td>
                  <td className="px-8 py-6 text-sm font-bold text-slate-600 dark:text-slate-300">{item.quantity} {item.unit}</td>
                  <td className="px-8 py-6">
                    {item.quantity <= item.minStock ? (
                      <span className="flex items-center text-rose-400 text-[9px] font-black uppercase tracking-widest px-3 py-1 bg-rose-400/10 border border-rose-400/20 rounded-full w-fit"><AlertCircle size={14} className="mr-1.5" /> Depleted</span>
                    ) : (
                      <span className="text-emerald-400 text-[9px] font-black uppercase tracking-widest px-3 py-1 bg-emerald-400/10 border border-emerald-400/20 rounded-full w-fit">Optimal</span>
                    )}
                  </td>
                  <td className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.category || 'GENERAL'}</td>
                  <td className="px-10 py-6 text-right space-x-2">
                    <button onClick={() => openModal(item)} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-[15px] text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-all"><Edit size={18} /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-[15px] text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 transition-all"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {filteredItems.map(item => (
            <div key={item.id} className="bg-white dark:bg-slate-900 p-8 rounded-[15px] border border-slate-100 dark:border-slate-800 shadow-xl hover:border-emerald-500/50 transition-all group overflow-hidden relative">
              <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-[15px] border ${item.quantity <= item.minStock ? 'bg-rose-400/10 text-rose-400 border-rose-400/20' : 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'} shadow-inner group-hover:scale-110 transition-transform`}>
                  <Package size={24}/>
                </div>
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openModal(item)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-[15px] text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-all"><Edit size={16}/></button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-[15px] text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 transition-all"><Trash2 size={16}/></button>
                </div>
              </div>
              <h4 className="font-black text-lg text-slate-900 dark:text-slate-100 mb-1">{item.name}</h4>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">{item.category || 'UNCATEGORIZED'}</p>
              <div className="space-y-4">
                <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                  <span className="text-slate-500">Stockpile</span>
                  <span className={item.quantity <= item.minStock ? 'text-rose-400' : 'text-emerald-400'}>{item.quantity} {item.unit}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
                  <div 
                    className={`h-full transition-all duration-1000 ${item.quantity <= item.minStock ? 'bg-rose-500' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`}
                    style={{ width: `${Math.min((item.quantity / (item.minStock * 4)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-950 w-full max-w-lg rounded-[15px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in duration-300">
            <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">{editingItem ? 'Refine Asset' : 'Stock Intake'}</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">Inventory Control Logic</p>
              </div>
              <button onClick={closeModal} className="p-3.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-[15px] transition-all shadow-sm"><X size={20} /></button>
            </div>
            <div className="p-10 space-y-6">
              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2.5">Item Nomenclature *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-4 rounded-[15px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-black outline-none focus:border-emerald-500 transition-all shadow-sm" placeholder="e.g. A4 Laser Paper" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2.5">Volume Count</label>
                  <input type="number" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: Number(e.target.value)})} className="w-full px-5 py-4 rounded-[15px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-black outline-none focus:border-emerald-500 transition-all shadow-sm" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2.5">Unit Metric</label>
                  <input type="text" value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})} className="w-full px-5 py-4 rounded-[15px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:border-emerald-500 transition-all shadow-sm" placeholder="Reams, Packs..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2.5">Threshold Alert</label>
                  <input type="number" value={formData.minStock} onChange={(e) => setFormData({...formData, minStock: Number(e.target.value)})} className="w-full px-5 py-4 rounded-[15px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-black outline-none focus:border-emerald-500 transition-all shadow-sm" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2.5">Department</label>
                  <input type="text" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-5 py-4 rounded-[15px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:border-emerald-500 transition-all shadow-sm" placeholder="Stationary, Tech..." />
                </div>
              </div>
            </div>
            <div className="px-10 py-8 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-4">
              <button onClick={closeModal} className="px-6 py-3 font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-[10px] hover:text-slate-900 dark:hover:text-white transition-colors">Abort</button>
              <button onClick={handleSave} className="bg-slate-900 dark:bg-white text-white dark:text-black px-10 py-3 rounded-[15px] font-black text-xs uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-xl active:scale-95 flex items-center space-x-3">
                <Save size={18} />
                <span>Save Asset</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;
