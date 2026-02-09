
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../db';
import { Service } from '../types';
import { Search, Plus, Edit, Trash2, X, Save, Settings, IndianRupee, LayoutGrid, List, Loader2, Filter, Download, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

const SERVICE_CATEGORIES = [
  'UIDAI (Aadhaar)', 'UTI/IT (PAN/ITR)', 'Banking (AePS/DMT)', 'G2C (Certificates)',
  'Bill Payments', 'Insurance', 'Travel (IRCTC/Bus)', 'Education',
  'Health', 'Agriculture', 'Voter/Election', 'Other'
];

const ServiceManagement: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [view, setView] = useState<'GRID' | 'LIST'>('LIST');
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchServices = async () => {
    try {
      const data = await db.services.all();
      setServices(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const [formData, setFormData] = useState<Omit<Service, 'id'>>({
    name: '',
    description: '',
    basePrice: 0,
    category: SERVICE_CATEGORIES[0]
  });

  const filteredServices = services.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         s.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSave = async () => {
    if (!formData.name) {
      showToast("Service name is mandatory", 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (editingService) {
        const updatedService = { ...editingService, ...formData };
        await db.services.save(updatedService);
        showToast("Service specifications updated");
      } else {
        const newService: Service = { ...formData, id: 's' + Date.now() };
        await db.services.save(newService);
        showToast("New service mapped to catalog");
      }
      fetchServices();
      closeModal();
    } catch (err) {
      showToast("Failed to commit changes", 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportExcel = () => {
    try {
      if (services.length === 0) return;
      setIsProcessing(true);
      const worksheet = XLSX.utils.json_to_sheet(services);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Services");
      XLSX.writeFile(workbook, `Regal_Services_Catalog_${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast("Catalog exported to Excel");
    } catch (err) {
      showToast("Export failed", 'error');
    } finally {
      setTimeout(() => setIsProcessing(false), 500);
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

        const importedItems: Service[] = jsonData.map((row: any) => ({
          id: row.id || ('s' + Date.now() + Math.random().toString(36).substr(2, 5)),
          name: row.name || row.Name || row['Service Name'] || 'New Service',
          description: row.description || row.Description || row.details || '',
          basePrice: Number(row.basePrice || row.Price || row['Base Price'] || 0),
          category: row.category || row.Category || SERVICE_CATEGORIES[0]
        }));

        for (const item of importedItems) {
          if (item.name) await db.services.save(item);
        }
        await fetchServices();
        showToast("Service catalog synchronized from Excel");
      } catch (err) {
        showToast("Import error. Verify structure.", 'error');
      } finally {
        setIsProcessing(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Erase this service from the catalog?')) return;
    
    setIsProcessing(true);
    try {
      await db.services.delete(id);
      showToast("Service removed from terminal");
      fetchServices();
    } catch (err) {
      showToast("Removal failed", 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const openModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({ 
        name: service.name, 
        description: service.description, 
        basePrice: service.basePrice, 
        category: service.category || SERVICE_CATEGORIES[0]
      });
    } else {
      setEditingService(null);
      setFormData({ name: '', description: '', basePrice: 0, category: SERVICE_CATEGORIES[0] });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingService(null);
  };

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="animate-spin text-indigo-500" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
      {toast && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-[15px] shadow-2xl animate-in slide-in-from-top-4 duration-300 flex items-center space-x-3 border ${
          toast.type === 'success' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-rose-500 text-white border-rose-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="font-black text-[10px] uppercase tracking-[0.2em]">{toast.message}</span>
        </div>
      )}

      {isProcessing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-950 p-10 rounded-[15px] shadow-2xl flex flex-col items-center space-y-4 border border-slate-100 dark:border-slate-800">
            <Loader2 className="animate-spin text-indigo-600" size={48} />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Processing Catalog Update...</p>
          </div>
        </div>
      )}

      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-3 text-slate-400 dark:text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Search catalog..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-[15px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:border-indigo-500 transition-all shadow-sm"
            />
          </div>
          
          <div className="relative w-full md:w-64">
            <Filter className="absolute left-4 top-3 text-slate-400 dark:text-slate-500" size={18} />
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-[15px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold outline-none appearance-none cursor-pointer focus:border-indigo-500 transition-all shadow-sm"
            >
              <option value="All" className="bg-white dark:bg-slate-950">All Domains</option>
              {SERVICE_CATEGORIES.map(cat => (
                <option key={cat} value={cat} className="bg-white dark:bg-slate-950">{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex bg-white dark:bg-slate-900 p-1 rounded-[15px] border border-slate-200 dark:border-slate-800 shrink-0 shadow-sm">
            <button onClick={() => setView('GRID')} className={`p-2.5 rounded-[15px] transition-all ${view === 'GRID' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}><LayoutGrid size={20}/></button>
            <button onClick={() => setView('LIST')} className={`p-2.5 rounded-[15px] transition-all ${view === 'LIST' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}><List size={20}/></button>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <input type="file" ref={fileInputRef} onChange={handleImportExcel} className="hidden" accept=".xlsx, .xls, .csv" />
          <button onClick={() => fileInputRef.current?.click()} className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-6 py-3.5 rounded-[15px] font-black text-xs uppercase tracking-widest flex items-center space-x-2 hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-slate-200 dark:border-slate-700"><Upload size={18} /><span className="hidden sm:inline">Import</span></button>
          <button onClick={handleExportExcel} className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-6 py-3.5 rounded-[15px] font-black text-xs uppercase tracking-widest flex items-center space-x-2 hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-slate-200 dark:border-slate-700"><Download size={18} /><span className="hidden sm:inline">Export</span></button>
          <button onClick={() => openModal()} className="bg-slate-900 dark:bg-white text-white dark:text-black px-10 py-3.5 rounded-[15px] font-black text-xs uppercase tracking-widest flex items-center space-x-3 hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white transition-all shadow-xl active:scale-95"><Plus size={18} /><span>Add Service</span></button>
        </div>
      </div>

      {filteredServices.length === 0 ? (
        <div className="bg-white dark:bg-slate-900/50 rounded-[15px] border border-dashed border-slate-200 dark:border-slate-800 p-24 text-center">
          <Settings size={64} className="mx-auto text-slate-300 dark:text-slate-800 mb-6" />
          <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">No Services Mapped</h3>
        </div>
      ) : (
        view === 'GRID' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
            {filteredServices.map(service => (
              <div key={service.id} className="bg-white dark:bg-slate-900 p-8 rounded-[15px] border border-slate-100 dark:border-slate-800 shadow-xl hover:border-indigo-500/50 hover:-translate-y-1 transition-all group flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <span className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border border-indigo-500/20">{service.category}</span>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openModal(service)} className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-[15px] border border-slate-200 dark:border-slate-700 transition-all"><Edit size={16} /></button>
                      <button onClick={() => handleDelete(service.id)} className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-[15px] border border-slate-200 dark:border-slate-700 transition-all"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <h4 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-3 leading-tight tracking-tight">{service.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-500 font-bold leading-relaxed mb-8 line-clamp-3 uppercase tracking-widest">{service.description}</p>
                </div>
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Pricing</span>
                  <div className="flex items-center text-xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">
                    <IndianRupee size={16} className="mr-0.5 opacity-50" /> {service.basePrice.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-[15px] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  <th className="px-10 py-6">Domain Overview</th>
                  <th className="px-8 py-6">Sector</th>
                  <th className="px-8 py-6">Market Price</th>
                  <th className="px-10 py-6 text-right">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredServices.map(service => (
                  <tr key={service.id} className="hover:bg-slate-50 dark:hover:bg-indigo-500/5 transition-colors group">
                    <td className="px-10 py-6">
                      <div className="font-black text-slate-900 dark:text-slate-100 text-lg tracking-tight">{service.name}</div>
                      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate max-w-md">{service.description}</div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-indigo-500/20">{service.category}</span>
                    </td>
                    <td className="px-8 py-6 font-black text-slate-900 dark:text-slate-100 text-lg tracking-tighter">₹{service.basePrice.toLocaleString()}</td>
                    <td className="px-10 py-6 text-right space-x-2">
                      <button onClick={() => openModal(service)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-[15px] border border-slate-200 dark:border-slate-700 transition-all"><Edit size={18} /></button>
                      <button onClick={() => handleDelete(service.id)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-[15px] border border-slate-200 dark:border-slate-700 transition-all"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-950 w-full max-w-lg rounded-[15px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in duration-300">
            <div className="px-12 py-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">{editingService ? 'Refine Catalog' : 'Catalog Expansion'}</h3>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] mt-1">Service Logic & Billing</p>
              </div>
              <button onClick={closeModal} className="p-3.5 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-[15px] transition-all shadow-sm"><X size={20} /></button>
            </div>
            <div className="p-12 space-y-8">
              <div>
                <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">Service Designation *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-6 py-4 rounded-[15px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-black outline-none focus:border-indigo-500 transition-all" placeholder="e.g. Bio-Metric Verification" />
              </div>
              
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">Service Sector *</label>
                  <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-6 py-4 rounded-[15px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-black outline-none focus:border-indigo-500 transition-all cursor-pointer">
                    {SERVICE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat} className="bg-white dark:bg-slate-950">{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">Floor Price (₹)</label>
                  <div className="relative">
                    <IndianRupee size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input type="number" value={formData.basePrice} onChange={(e) => setFormData({...formData, basePrice: Number(e.target.value)})} className="w-full pl-12 pr-6 py-4 rounded-[15px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 font-black outline-none focus:border-indigo-500 transition-all" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">Functional Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-6 py-4 rounded-[15px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-100 font-medium outline-none focus:border-indigo-500 min-h-[140px] leading-relaxed resize-none" placeholder="Detailed workflow description..." />
              </div>
            </div>
            <div className="px-12 py-10 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-6">
              <button onClick={closeModal} className="px-8 py-3.5 font-black text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-widest hover:text-slate-900 dark:hover:text-white transition-colors">Discard</button>
              <button onClick={handleSave} disabled={isSaving} className="bg-slate-900 dark:bg-white text-white dark:text-black px-12 py-3.5 rounded-[15px] font-black text-xs uppercase tracking-widest hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white transition-all shadow-2xl active:scale-95 flex items-center space-x-3">
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                <span>{editingService ? 'Refine Entry' : 'Save Entry'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceManagement;
