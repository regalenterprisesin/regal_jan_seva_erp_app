
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../db';
import { Customer } from '../types';
import { Search, Plus, Edit, Trash2, X, Save, UserPlus, Phone, CreditCard, MapPin, LayoutGrid, List, Fingerprint, Loader2, Upload, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const CustomerManagement: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'LIST' | 'GRID'>('LIST');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCustomers = async () => {
    try {
      const data = await db.customers.all();
      setCustomers(data);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    // Real-time synchronization for multi-user environments
    const unsub = db.customers.subscribe(fetchCustomers);
    return () => unsub();
  }, []);

  const [formData, setFormData] = useState<Omit<Customer, 'id' | 'createdAt'>>({
    name: '',
    phone: '',
    aadhaarNumber: '',
    address: ''
  });

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm) ||
    (c.aadhaarNumber && c.aadhaarNumber.includes(searchTerm))
  );

  const handleSave = async () => {
    if (!formData.name) {
      alert("Name is required.");
      return;
    }

    if (formData.aadhaarNumber && formData.aadhaarNumber.length > 0 && formData.aadhaarNumber.length !== 12) {
      alert("Aadhaar Number must be exactly 12 digits.");
      return;
    }

    const tempId = editingCustomer ? editingCustomer.id : 'c' + Date.now();
    const customerData: Customer = {
      ...formData,
      id: tempId,
      createdAt: editingCustomer ? editingCustomer.createdAt : new Date().toISOString()
    };

    // INSTANT UI REFLECTION (Optimistic Update)
    if (editingCustomer) {
      setCustomers(prev => prev.map(c => c.id === tempId ? customerData : c));
    } else {
      setCustomers(prev => [customerData, ...prev]);
    }

    closeModal();

    try {
      await db.customers.save(customerData);
    } catch (error) {
      console.error("Save failed, rolling back:", error);
      fetchCustomers(); // Re-sync if DB write fails
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this customer record?')) return;

    // INSTANT UI REFLECTION (Optimistic Update)
    const originalCustomers = [...customers];
    setCustomers(prev => prev.filter(c => c.id !== id));

    try {
      await db.customers.delete(id);
    } catch (error) {
      console.error("Delete failed, rolling back:", error);
      setCustomers(originalCustomers); // Rollback on error
      alert("Failed to delete record. System re-syncing.");
    }
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        const importedItems: Customer[] = jsonData.map((row: any) => ({
          id: row.id || ('c' + Date.now() + Math.random().toString(36).substr(2, 5)),
          name: row.name || row.Name || row['Customer Name'] || 'Unknown',
          phone: String(row.phone || row.Phone || row['Phone Number'] || ''),
          aadhaarNumber: String(row.aadhaarNumber || row.Aadhaar || row['Aadhaar Number'] || '').replace(/\s/g, ''),
          address: row.address || row.Address || '',
          createdAt: row.createdAt || new Date().toISOString()
        }));

        for (const item of importedItems) {
          if (item.name && item.name !== 'Unknown') {
            await db.customers.save(item);
          }
        }
        await fetchCustomers(); // Refresh full list after batch import
        alert(`Successfully synchronized imported data.`);
      } catch (err) {
        console.error(err);
        alert('Failed to import data. Please check Excel format.');
      } finally {
        setIsProcessing(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExportExcel = () => {
    try {
      if (customers.length === 0) return;
      setIsProcessing(true);
      const worksheet = XLSX.utils.json_to_sheet(customers);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
      XLSX.writeFile(workbook, `Regal_Customers_${new Date().toISOString().split('T')[0]}.xlsx`);
    } finally {
      setTimeout(() => setIsProcessing(false), 500);
    }
  };

  const openModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({ 
        name: customer.name, 
        phone: customer.phone, 
        aadhaarNumber: customer.aadhaarNumber, 
        address: customer.address 
      });
    } else {
      setEditingCustomer(null);
      setFormData({ name: '', phone: '', aadhaarNumber: '', address: '' });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
  };

  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); 
    if (value.length <= 12) {
      setFormData({ ...formData, aadhaarNumber: value });
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-950 p-10 rounded-[15px] shadow-2xl flex flex-col items-center space-y-4 border border-slate-100 dark:border-slate-800">
            <Loader2 className="animate-spin text-blue-600" size={48} />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Synchronizing Database...</p>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center space-x-4 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-3 text-slate-400 dark:text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Search directory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-[15px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:border-blue-500 transition-all shadow-sm"
            />
          </div>
          <div className="flex bg-white dark:bg-slate-900 p-1 rounded-[15px] border border-slate-200 dark:border-slate-800 shrink-0 shadow-sm">
            <button onClick={() => setView('LIST')} className={`p-2.5 rounded-[15px] transition-all ${view === 'LIST' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}><List size={20}/></button>
            <button onClick={() => setView('GRID')} className={`p-2.5 rounded-[15px] transition-all ${view === 'GRID' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}><LayoutGrid size={20}/></button>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <input type="file" ref={fileInputRef} onChange={handleImportExcel} className="hidden" accept=".xlsx, .xls, .csv" />
          <button onClick={() => fileInputRef.current?.click()} className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-6 py-3 rounded-[15px] font-black text-xs uppercase tracking-widest flex items-center space-x-2 hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-slate-200 dark:border-slate-700"><Upload size={18} /><span className="hidden sm:inline">Import</span></button>
          <button onClick={handleExportExcel} className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-6 py-3 rounded-[15px] font-black text-xs uppercase tracking-widest flex items-center space-x-2 hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-slate-200 dark:border-slate-700"><Download size={18} /><span className="hidden sm:inline">Export</span></button>
          <button onClick={() => openModal()} className="bg-slate-900 dark:bg-white text-white dark:text-black px-8 py-3 rounded-[15px] font-black text-xs uppercase tracking-widest flex items-center space-x-2 hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white transition-all shadow-xl"><Plus size={18} /><span>Add Client</span></button>
        </div>
      </div>

      {view === 'LIST' ? (
        <div className="bg-white dark:bg-slate-900 rounded-[15px] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Profile</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Phone</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Aadhaar</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Registered</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCustomers.map(customer => (
                <tr key={customer.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="font-black text-sm text-slate-900 dark:text-slate-100">{customer.name}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[200px]">{customer.address || 'No Address'}</div>
                  </td>
                  <td className="px-6 py-5 text-sm font-bold text-slate-600 dark:text-slate-400">{customer.phone}</td>
                  <td className="px-6 py-5 font-mono text-base tracking-widest text-blue-600 dark:text-blue-400">{customer.aadhaarNumber ? customer.aadhaarNumber.replace(/(\d{4})/g, '$1 ').trim() : 'NOT SET'}</td>
                  <td className="px-6 py-5 text-base font-bold text-slate-400 dark:text-slate-600">{new Date(customer.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="px-8 py-5 text-right space-x-2">
                    <button onClick={() => openModal(customer)} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-[15px] text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-all"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(customer.id)} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-[15px] text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 transition-all"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map(customer => (
            <div key={customer.id} className="bg-white dark:bg-slate-900 p-8 rounded-[15px] border border-slate-100 dark:border-slate-800 shadow-xl hover:border-blue-500/50 transition-all group relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 rounded-[15px] bg-slate-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-xl border border-slate-100 dark:border-slate-800 shadow-inner group-hover:scale-110 transition-transform">{customer.name[0]}</div>
                <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openModal(customer)} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-[15px] text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-100 dark:border-slate-800"><Edit size={16}/></button>
                  <button onClick={() => handleDelete(customer.id)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-[15px] text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-100 dark:border-slate-800"><Trash2 size={16}/></button>
                </div>
              </div>
              <h3 className="font-black text-lg text-slate-900 dark:text-slate-100 mb-4">{customer.name}</h3>
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-xs font-bold text-slate-500"><Phone size={14} className="mr-3 text-blue-600 dark:text-blue-400"/> {customer.phone}</div>
                <div className="flex items-center text-xs font-bold text-slate-500 tracking-widest font-mono"><Fingerprint size={14} className="mr-3 text-blue-600 dark:text-blue-400"/> {customer.aadhaarNumber ? customer.aadhaarNumber.replace(/(\d{4})/g, '$1 ').trim() : 'NO AADHAAR'}</div>
                <div className="flex items-center text-xs font-bold text-slate-500"><MapPin size={14} className="mr-3 text-blue-600 dark:text-blue-400"/> <span className="truncate">{customer.address || 'No Address Provided'}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-950 w-full max-w-lg rounded-[15px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in duration-300">
            <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">{editingCustomer ? 'Update Profile' : 'New Client'}</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">Personal & Security Data</p>
              </div>
              <button onClick={closeModal} className="p-3 bg-white dark:bg-slate-800 rounded-[15px] text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm"><X size={20} /></button>
            </div>
            <div className="p-10 space-y-6">
              <div>
                <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2.5">Legal Full Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-4 rounded-[15px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:border-blue-500 transition-all" placeholder="Enter name" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2.5">Contact Number *</label>
                  <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-5 py-4 rounded-[15px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:border-blue-500 transition-all" placeholder="+91" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2.5">Aadhaar (12-Digit)</label>
                  <input type="text" value={formData.aadhaarNumber.replace(/(\d{4})/g, '$1 ').trim()} onChange={handleAadhaarChange} className="w-full px-5 py-4 rounded-[15px] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-blue-700 dark:text-blue-400 font-mono tracking-widest outline-none focus:border-blue-500 transition-all" placeholder="0000 0000 0000" />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2.5">Residential Address</label>
                <textarea value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full px-5 py-4 rounded-[15px] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-medium outline-none focus:border-blue-500 min-h-[120px] resize-none" placeholder="Enter complete postal address..." />
              </div>
            </div>
            <div className="px-10 py-8 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-4">
              <button onClick={closeModal} className="px-6 py-3 font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-[10px] hover:text-slate-900 dark:hover:text-white transition-colors">Cancel</button>
              <button onClick={handleSave} className="bg-slate-900 dark:bg-white text-white dark:text-black px-10 py-3 rounded-[15px] font-black text-xs uppercase tracking-widest hover:bg-blue-600 dark:hover:bg-blue-500 transition-all shadow-xl flex items-center space-x-2"><Save size={18} /><span>Save Record</span></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;
