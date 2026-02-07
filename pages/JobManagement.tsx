
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../db';
import { Job, Customer, Service, JobStatus, JobItem } from '../types';
import { 
  Plus, X, Save, User, IndianRupee, Loader2, Printer, Download, 
  Trash2, Edit, ArrowUpDown, PlusCircle, Smartphone, Fingerprint,
  ChevronDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

type SortField = 'customerName' | 'customerAadhaar' | 'serviceName' | 'date' | 'status';
type SortDirection = 'ASC' | 'DESC' | null;

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

const JobManagement: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  const [view, setView] = useState<'LIST' | 'BOARD'>('LIST');
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [receiptJob, setReceiptJob] = useState<Job | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'date', direction: 'DESC' });

  // Staged Item Form State
  const [currentItem, setCurrentItem] = useState<JobItem>({
    serviceId: '',
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    subtotal: 0,
    status: 'PENDING'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [jobsData, customersData, servicesData] = await Promise.all([
          db.jobs.all(),
          db.customers.all(),
          db.services.all()
        ]);
        setJobs(jobsData);
        setCustomers(customersData);
        setServices(servicesData);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const flattenedTasks = useMemo(() => {
    return jobs.flatMap(job => 
      job.items.map((item, index) => {
        const customer = customers.find(c => c.id === job.customerId);
        const service = services.find(s => s.id === item.serviceId);
        return {
          id: `${job.id}-${index}`,
          jobId: job.id,
          itemIndex: index,
          customerName: customer?.name || 'Unknown',
          customerPhone: customer?.phone || '',
          customerAadhaar: customer?.aadhaarNumber || '',
          serviceName: service?.name || 'Unknown Service',
          date: job.createdAt,
          status: item.status || 'PENDING',
          originalJob: job
        };
      })
    );
  }, [jobs, customers, services]);

  const sortedTasks = useMemo(() => {
    if (!sortConfig.direction) return flattenedTasks;
    
    return [...flattenedTasks].sort((a, b) => {
      const aValue = String(a[sortConfig.field]).toLowerCase();
      const bValue = String(b[sortConfig.field]).toLowerCase();
      
      if (aValue < bValue) return sortConfig.direction === 'ASC' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'ASC' ? 1 : -1;
      return 0;
    });
  }, [flattenedTasks, sortConfig]);

  const [formData, setFormData] = useState<Partial<Job>>({
    customerId: '',
    items: [],
    status: 'PENDING',
    paymentStatus: 'UNPAID',
    discount: 0,
    totalAmount: 0,
    paidAmount: 0,
    notes: ''
  });

  const totals = useMemo(() => {
    const grossTotal = (formData.items || []).reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const totalDiscount = (formData.items || []).reduce((sum, item) => sum + item.discount, 0);
    const netTotal = grossTotal - totalDiscount;
    const pendingAmount = Math.max(0, netTotal - (formData.paidAmount || 0));
    return { grossTotal, totalDiscount, netTotal, pendingAmount };
  }, [formData.items, formData.paidAmount]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, totalAmount: totals.netTotal }));
  }, [totals.netTotal]);

  useEffect(() => {
    const sub = (currentItem.quantity * currentItem.unitPrice) - currentItem.discount;
    setCurrentItem(prev => ({ ...prev, subtotal: Math.max(0, sub) }));
  }, [currentItem.quantity, currentItem.unitPrice, currentItem.discount]);

  const getCustomer = (id: string) => customers.find(c => c.id === id);
  const getService = (id: string) => services.find(s => s.id === id);

  const handleAddStagedItem = () => {
    if (!currentItem.serviceId) {
      alert("Please select a service first.");
      return;
    }
    const newItems = [...(formData.items || []), { ...currentItem }];
    setFormData({ ...formData, items: newItems });
    setCurrentItem({ serviceId: '', quantity: 1, unitPrice: 0, discount: 0, subtotal: 0, status: 'PENDING' });
  };

  const removeStagedItem = (index: number) => {
    const newItems = (formData.items || []).filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleServiceSelect = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    setCurrentItem({
      ...currentItem,
      serviceId,
      unitPrice: service?.basePrice || 0
    });
  };

  const handleSave = async () => {
    if (!formData.customerId || !formData.items || formData.items.length === 0) {
      alert("Please select a customer and add at least one service.");
      return;
    }

    const balance = totals.pendingAmount;
    const paymentStatus = balance === 0 ? 'PAID' : (formData.paidAmount || 0) > 0 ? 'PARTIAL' : 'UNPAID';

    const jobData = {
      ...formData,
      paymentStatus,
      balance,
      updatedAt: new Date().toISOString()
    } as Job;

    if (editingJob) {
      const updatedJob = { ...editingJob, ...jobData };
      await db.jobs.save(updatedJob);
      setJobs(jobs.map(j => j.id === editingJob.id ? updatedJob : j));
    } else {
      const newJob: Job = { ...jobData, id: 'job' + Date.now(), createdAt: new Date().toISOString() };
      await db.jobs.save(newJob);
      setJobs([...jobs, newJob]);
    }
    closeModal();
  };

  const handleItemStatusUpdate = async (job: Job, itemIndex: number, newStatus: JobStatus) => {
    const newItems = [...job.items];
    newItems[itemIndex] = { ...newItems[itemIndex], status: newStatus };
    const updatedJob = { ...job, items: newItems, updatedAt: new Date().toISOString() };
    await db.jobs.save(updatedJob);
    setJobs(jobs.map(j => j.id === job.id ? updatedJob : j));
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Permanently delete this record?')) {
      await db.jobs.delete(id);
      setJobs(jobs.filter(j => j.id !== id));
      if (editingJob?.id === id) closeModal();
    }
  };

  const openModal = (job?: Job) => {
    if (job) {
      setEditingJob(job);
      setFormData(job);
    } else {
      setEditingJob(null);
      setFormData({
        customerId: '',
        items: [],
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        discount: 0,
        totalAmount: 0,
        paidAmount: 0,
        notes: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingJob(null);
    setCurrentItem({ serviceId: '', quantity: 1, unitPrice: 0, discount: 0, subtotal: 0, status: 'PENDING' });
  };

  const toggleSort = (field: SortField) => {
    setSortConfig(current => {
      if (current.field === field) {
        if (current.direction === 'ASC') return { field, direction: 'DESC' };
        if (current.direction === 'DESC') return { field, direction: null };
        return { field, direction: 'ASC' };
      }
      return { field, direction: 'ASC' };
    });
  };

  const handlePrint = (job: Job) => {
    setReceiptJob(job);
    setIsGeneratingPDF(false);
    setTimeout(() => {
      window.print();
      setReceiptJob(null);
    }, 150);
  };

  const handleDownloadPDF = async (job: Job) => {
    setIsGeneratingPDF(true);
    setReceiptJob(job);
    setTimeout(async () => {
      const element = document.getElementById('receipt-container');
      if (element) {
        try {
          const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 200] });
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const imgProps = pdf.getImageProperties(imgData);
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`Regal-Receipt-${job.id.slice(-6)}.pdf`);
        } catch (error) { console.error("PDF generation failed", error); }
      }
      setReceiptJob(null);
      setIsGeneratingPDF(false);
    }, 500);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortConfig.field !== field) return <ArrowUpDown size={12} className="ml-1 text-slate-400 opacity-20" />;
    if (sortConfig.direction === 'ASC') return <ArrowUp size={12} className="ml-1 text-blue-600" />;
    if (sortConfig.direction === 'DESC') return <ArrowDown size={12} className="ml-1 text-blue-600" />;
    return <ArrowUpDown size={12} className="ml-1 text-slate-400" />;
  };

  const inputClass = "w-full px-4 py-3 rounded-[15px] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs font-bold outline-none focus:border-blue-500 appearance-none text-slate-900 dark:text-white";
  const selectClass = "w-full px-4 py-3 rounded-[15px] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs font-bold outline-none focus:border-blue-500 appearance-none bg-none text-slate-900 dark:text-white";

  const currentCustomer = getCustomer(formData.customerId || '');

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center print:hidden">
        <div className="flex bg-white dark:bg-slate-900 p-1 rounded-[15px] border border-slate-100 dark:border-slate-800 shadow-sm">
          <button onClick={() => setView('LIST')} className={`px-6 py-2 rounded-[15px] text-xs font-black uppercase tracking-widest transition-all ${view === 'LIST' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>Workflow List</button>
          <button onClick={() => setView('BOARD')} className={`px-6 py-2 rounded-[15px] text-xs font-black uppercase tracking-widest transition-all ${view === 'BOARD' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>Board View</button>
        </div>
      </div>

      {view === 'LIST' ? (
        <div className="bg-white dark:bg-slate-900 rounded-[15px] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden print:hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                <th 
                  className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => toggleSort('customerName')}
                >
                  <div className="flex items-center">Customer <SortIcon field="customerName" /></div>
                </th>
                <th 
                  className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => toggleSort('customerAadhaar')}
                >
                  <div className="flex items-center">Aadhaar Number <SortIcon field="customerAadhaar" /></div>
                </th>
                <th 
                  className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => toggleSort('serviceName')}
                >
                  <div className="flex items-center">Service <SortIcon field="serviceName" /></div>
                </th>
                <th 
                  className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => toggleSort('date')}
                >
                  <div className="flex items-center">Date Generated <SortIcon field="date" /></div>
                </th>
                <th 
                  className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => toggleSort('status')}
                >
                  <div className="flex items-center">Status <SortIcon field="status" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {sortedTasks.map(task => (
                <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-[10px] font-black text-blue-600 dark:text-blue-400 shrink-0">
                        {task.customerName[0]}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900 dark:text-white">{task.customerName}</span>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500">{task.customerPhone}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 font-black tracking-widest uppercase">
                      {task.customerAadhaar ? task.customerAadhaar.replace(/(\d{4})/g, '$1 ').trim() : 'NO AADHAAR'}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="font-black text-slate-900 dark:text-white truncate max-w-xs">{task.serviceName}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: #{task.jobId.slice(-6).toUpperCase()}</div>
                  </td>
                  <td className="px-6 py-5 text-sm font-bold text-slate-500 dark:text-slate-500">
                    {new Date(task.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center space-x-2">
                      <select 
                        value={task.status}
                        onChange={(e) => handleItemStatusUpdate(task.originalJob, task.itemIndex, e.target.value as JobStatus)}
                        className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-[15px] border outline-none bg-transparent cursor-pointer transition-all ${
                          task.status === 'COMPLETED' ? 'text-emerald-600 border-emerald-500/20 bg-emerald-500/5' :
                          task.status === 'PENDING' ? 'text-amber-600 border-amber-500/20 bg-amber-500/5' :
                          task.status === 'CANCELLED' ? 'text-rose-600 border-rose-500/20 bg-rose-500/5' :
                          'text-blue-600 border-blue-500/20 bg-blue-500/5'
                        }`}
                      >
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 print:hidden">
          {(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as JobStatus[]).map(status => (
            <div key={status} className="bg-white dark:bg-slate-900 p-6 rounded-[15px] border border-slate-100 dark:border-slate-800 min-h-[500px] shadow-sm">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center justify-between px-2">
                {status.replace('_', ' ')}
                <span className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full text-[9px] border border-slate-100 dark:border-slate-700">{flattenedTasks.filter(t => t.status === status).length}</span>
              </h4>
              <div className="space-y-4">
                {flattenedTasks.filter(t => t.status === status).map(task => (
                  <div key={task.id} onClick={() => openModal(task.originalJob)} className="bg-slate-50 dark:bg-slate-950 p-5 rounded-[15px] border border-transparent cursor-pointer hover:border-blue-500/50 hover:bg-white dark:hover:bg-slate-800 transition-all group relative shadow-sm">
                    <p className="text-xs font-black text-slate-900 dark:text-white mb-1">{task.serviceName}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{task.customerName}</p>
                    <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-800">
                       <span className="text-[10px] font-black text-slate-400">ID: #{task.jobId.slice(-4)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md print:hidden">
          <div className="bg-white dark:bg-slate-950 w-full max-w-[98vw] rounded-[15px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in duration-300">
            <div className="px-10 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Billing Center Terminal</h3>
                <p className="text-[9px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em]">High-Efficiency Multi-Service Entry</p>
              </div>
              <button onClick={closeModal} className="p-2.5 bg-white dark:bg-slate-800 rounded-[15px] text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm"><X size={20} /></button>
            </div>
            <div className="p-8 flex flex-col space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[15px] border border-slate-100 dark:border-slate-800 grid grid-cols-12 gap-8 items-center">
                <div className="col-span-4 space-y-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Customer Search</label>
                  <div className="flex items-center space-x-3">
                    <User size={18} className="text-blue-500" />
                    <select value={formData.customerId} onChange={(e) => setFormData({...formData, customerId: e.target.value})} className={selectClass}>
                      <option value="">Choose Account Holder</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="col-span-4 space-y-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Aadhaar Identity</label>
                  <div className="flex items-center space-x-3 bg-white dark:bg-slate-900 px-5 py-3.5 rounded-[15px] border border-slate-100 dark:border-slate-800 shadow-sm min-h-[52px]">
                    <Fingerprint size={18} className="text-slate-400" />
                    <span className="text-xs font-mono font-black tracking-widest text-slate-700 dark:text-slate-300">{currentCustomer?.aadhaarNumber ? currentCustomer.aadhaarNumber.replace(/(\d{4})/g, '$1 ').trim() : '0000 0000 0000'}</span>
                  </div>
                </div>
                <div className="col-span-4 space-y-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile Access</label>
                  <div className="flex items-center space-x-3 bg-white dark:bg-slate-900 px-5 py-3.5 rounded-[15px] border border-slate-100 dark:border-slate-800 shadow-sm min-h-[52px]">
                    <Smartphone size={18} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{currentCustomer?.phone || '+91 00000 00000'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3 ml-2 text-blue-600"><PlusCircle size={14} /><h4 className="text-[9px] font-black uppercase tracking-widest">Service Staging Area</h4></div>
                <div className="bg-white dark:bg-slate-950 p-6 rounded-[15px] border border-blue-50 dark:border-blue-900/30 shadow-xl grid grid-cols-12 gap-4 items-end">
                  <div className="col-span-3"><label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Particulars</label><select value={currentItem.serviceId} onChange={(e) => handleServiceSelect(e.target.value)} className={selectClass}><option value="">Select Service Catalog</option>{services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                  <div className="col-span-1"><label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Quantity</label><input type="number" min="1" value={currentItem.quantity} onChange={(e) => setCurrentItem({...currentItem, quantity: Number(e.target.value)})} className={inputClass} /></div>
                  <div className="col-span-2"><label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Unit Rate (₹)</label><input type="number" value={currentItem.unitPrice} onChange={(e) => setCurrentItem({...currentItem, unitPrice: Number(e.target.value)})} className={inputClass} /></div>
                  <div className="col-span-1"><label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Disc. (₹)</label><input type="number" value={currentItem.discount} onChange={(e) => setCurrentItem({...currentItem, discount: Number(e.target.value)})} className={`${inputClass} text-rose-500`} /></div>
                  <div className="col-span-2"><label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Net Line Total</label><div className="w-full px-4 py-3 rounded-[15px] bg-slate-50 dark:bg-slate-900 text-xs font-black text-slate-900 dark:text-white border border-slate-100 dark:border-slate-800">₹{currentItem.subtotal}</div></div>
                  <div className="col-span-2"><label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Workflow Stage</label><select value={currentItem.status} onChange={(e) => setCurrentItem({...currentItem, status: e.target.value as JobStatus})} className={selectClass}><option value="PENDING">Pending</option><option value="IN_PROGRESS">In Progress</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></select></div>
                  <div className="col-span-1"><button onClick={handleAddStagedItem} className="w-full p-3 bg-blue-600 text-white rounded-[15px] hover:bg-blue-700 transition-all shadow-lg active:scale-95 flex items-center justify-center" title="Push to Bill"><Plus size={22} /></button></div>
                </div>
              </div>

              <div className="flex-1 bg-white dark:bg-slate-950 rounded-[15px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm min-h-[200px] overflow-y-auto">
                <table className="w-full text-left"><thead className="bg-slate-50 dark:bg-slate-900/80 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10"><tr><th className="px-8 py-4">Bill Item Specification</th><th className="px-6 py-4 text-center">Unit Price</th><th className="px-6 py-4 text-center">Qty</th><th className="px-6 py-4 text-center">Discount</th><th className="px-6 py-4 text-right">Net Value</th><th className="px-8 py-4 text-right">Action</th></tr></thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">{(formData.items || []).length === 0 ? (<tr><td colSpan={6} className="px-8 py-12 text-center text-xs font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest italic">No operational data queued</td></tr>) : (formData.items?.map((item, idx) => (<tr key={idx} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800 transition-colors"><td className="px-8 py-4"><div className="text-xs font-black text-slate-800 dark:text-white uppercase">{getService(item.serviceId)?.name || 'Custom'}</div></td><td className="px-6 py-4 text-center text-xs font-bold text-slate-500">₹{item.unitPrice}</td><td className="px-6 py-4 text-center text-xs font-black text-slate-800 dark:text-white">{item.quantity}</td><td className="px-6 py-4 text-center text-xs font-black text-rose-400">₹{item.discount}</td><td className="px-6 py-4 text-right text-xs font-black text-slate-900 dark:text-white tracking-tighter">₹{item.subtotal}</td><td className="px-8 py-4 text-right"><button onClick={() => removeStagedItem(idx)} className="p-1.5 text-slate-300 dark:text-slate-700 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button></td></tr>)))}</tbody>
                </table>
              </div>
            </div>

            <div className="px-10 py-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex items-center space-x-12">
                <div className="flex flex-col"><span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Gross Total Bill</span><div className="flex items-center text-3xl font-black text-slate-900 dark:text-white tracking-tighter opacity-40"><IndianRupee size={20} className="mr-1" /> {totals.grossTotal}</div></div>
                <div className="flex flex-col"><span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mb-0.5">Total Discount</span><div className="flex items-center text-3xl font-black text-rose-600 tracking-tighter">- ₹{totals.totalDiscount}</div></div>
                <div className="flex flex-col"><span className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] mb-0.5">Net Amount to be Paid</span><div className="flex items-center text-4xl font-black text-slate-900 dark:text-white tracking-tighter"><IndianRupee size={24} className="mr-1 opacity-20" /> {totals.netTotal}</div></div>
                <div className="flex items-center space-x-8 bg-white dark:bg-slate-950 px-8 py-3 rounded-[15px] border border-slate-100 dark:border-slate-800 shadow-inner">
                   <div className="flex flex-col"><label className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1">Cash Received (₹)</label><input type="number" value={formData.paidAmount} onChange={(e) => setFormData({...formData, paidAmount: Number(e.target.value)})} className="w-28 bg-transparent text-xl font-black text-emerald-600 outline-none appearance-none" placeholder="0" /></div>
                   <div className="w-px h-8 bg-slate-100 dark:bg-slate-800"></div>
                   <div className="flex flex-col"><span className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Pending Balance</span><span className={`text-xl font-black tracking-tighter ${ totals.pendingAmount > 0 ? 'text-rose-600' : 'text-emerald-500' }`}>₹{totals.pendingAmount}</span></div>
                </div>
              </div>
              <div className="flex space-x-4 w-full md:w-auto"><button onClick={closeModal} className="px-6 py-3.5 font-black text-slate-400 uppercase tracking-widest text-[9px] hover:text-slate-900 dark:hover:text-white transition-colors">Discard</button><button onClick={handleSave} className="bg-slate-900 dark:bg-white text-white dark:text-black px-10 py-3.5 rounded-[15px] font-black text-xs uppercase tracking-widest hover:bg-blue-600 dark:hover:bg-blue-500 transition-all shadow-xl flex items-center justify-center space-x-2"><Save size={18} /><span>Sync & Commit</span></button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobManagement;
