
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../db';
import { Customer, Service, Job, JobItem, JobStatus, PaymentStatus } from '../types';
import { User, Fingerprint, Smartphone, IndianRupee, Plus, Trash2, Save, Loader2, CheckCircle2, FileText, Search, UserCheck, X, ArrowLeft, Printer, Download, Edit, Filter, Calendar, AlertCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const InvoicePage: React.FC = () => {
  const [view, setView] = useState<'LIST' | 'CREATE'>('LIST');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [receiptJob, setReceiptJob] = useState<Job | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [registrySearch, setRegistrySearch] = useState('');
  const [registryStatusFilter, setRegistryStatusFilter] = useState<'ALL' | PaymentStatus>('ALL');
  const [registryDateFilter, setRegistryDateFilter] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerSelected, setIsCustomerSelected] = useState(false);
  const [items, setItems] = useState<JobItem[]>([]);
  const [status, setStatus] = useState<JobStatus>('PENDING');
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState('');

  const [currentServiceId, setCurrentServiceId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [rate, setRate] = useState(0);
  const [discount, setDiscount] = useState(0);

  const fetchRegistry = async () => {
    try {
      const [cData, sData, jData] = await Promise.all([
        db.customers.all(), 
        db.services.all(),
        db.jobs.all()
      ]);
      setCustomers(cData);
      setServices(sData);
      setJobs(jData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistry();
  }, []);

  const selectedCustomer = useMemo(() => customers.find(c => c.id === customerId), [customerId, customers]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim() || isCustomerSelected) return [];
    return customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).slice(0, 5);
  }, [customerSearch, customers, isCustomerSelected]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const customer = customers.find(c => c.id === job.customerId);
      const customerName = customer?.name.toLowerCase() || '';
      const invoiceId = job.id.toLowerCase();
      const matchesSearch = customerName.includes(registrySearch.toLowerCase()) || invoiceId.includes(registrySearch.toLowerCase());
      const matchesStatus = registryStatusFilter === 'ALL' || job.paymentStatus === registryStatusFilter;
      const matchesDate = !registryDateFilter || job.createdAt.startsWith(registryDateFilter);
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [jobs, customers, registrySearch, registryStatusFilter, registryDateFilter]);

  const handleSelectCustomer = (id: string) => { setCustomerId(id); setIsCustomerSelected(true); setCustomerSearch(''); };
  const handleResetCustomer = () => { setCustomerId(''); setIsCustomerSelected(false); setCustomerSearch(''); };
  const handleServiceSelect = (id: string) => { const s = services.find(service => service.id === id); setCurrentServiceId(id); if (s) setRate(s.basePrice); };

  const currentSubtotal = useMemo(() => (quantity * rate) - discount, [quantity, rate, discount]);

  const addServiceToList = () => {
    if (!currentServiceId) return;
    const newItem: JobItem = { serviceId: currentServiceId, quantity, unitPrice: rate, discount, subtotal: currentSubtotal, status: status };
    setItems([...items, newItem]);
    setCurrentServiceId(''); setQuantity(1); setRate(0); setDiscount(0);
  };

  const removeItem = (idx: number) => { setItems(items.filter((_, i) => i !== idx)); };

  const totals = useMemo(() => {
    const gross = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const totalDiscount = items.reduce((sum, item) => sum + item.discount, 0);
    const netTotal = gross - totalDiscount;
    const pending = Math.max(0, netTotal - paidAmount);
    return { gross, totalDiscount, netTotal, pending };
  }, [items, paidAmount]);

  const handleCommitInvoice = async () => {
    if (!customerId || items.length === 0) {
      showToast("Select customer and items", 'error');
      return;
    }

    setIsSaving(true);
    try {
      const balance = totals.pending;
      const paymentStatus = balance === 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID';
      const existingJob = editingId ? jobs.find(j => j.id === editingId) : null;

      const jobData: Job = {
        id: editingId || ('job' + Date.now()),
        customerId, items, status, paymentStatus, discount: totals.totalDiscount, totalAmount: totals.netTotal, paidAmount, balance, notes,
        createdAt: existingJob ? existingJob.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.jobs.save(jobData);
      showToast(editingId ? "Ledger updated" : "Ledger sequence committed");
      fetchRegistry();
      resetForm();
      setView('LIST');
    } catch (err) {
      showToast("Commit failure", 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => { setEditingId(null); setCustomerId(''); setIsCustomerSelected(false); setItems([]); setPaidAmount(0); setNotes(''); setStatus('PENDING'); };
  const handleEdit = (job: Job) => { setEditingId(job.id); setCustomerId(job.customerId); setIsCustomerSelected(true); setItems(job.items); setStatus(job.status); setPaidAmount(job.paidAmount); setNotes(job.notes || ''); setView('CREATE'); };

  const handlePrint = (job: Job) => { setReceiptJob(job); setIsGeneratingPDF(false); setTimeout(() => { window.print(); setReceiptJob(null); }, 150); };

  const handleDownloadPDF = async (job: Job) => {
    setIsGeneratingPDF(true); setReceiptJob(job);
    setTimeout(async () => {
      const element = document.getElementById('receipt-container-invoice');
      if (element) {
        try {
          const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 200] });
          pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), (canvas.height * pdf.internal.pageSize.getWidth()) / canvas.width);
          pdf.save(`Receipt-${job.id.slice(-6)}.pdf`);
          showToast("Digital receipt generated");
        } catch (error) { console.error(error); }
      }
      setReceiptJob(null); setIsGeneratingPDF(false);
    }, 500);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Permanently delete this invoice record?")) return;
    setIsProcessing(true);
    try {
      await db.jobs.delete(id);
      showToast("Ledger entry permanently erased");
      fetchRegistry();
    } catch (err) {
      showToast("Erase failure", 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const styles = `.no-spinner::-webkit-outer-spin-button, .no-spinner::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; } .no-spinner { -moz-appearance: textfield; } .no-arrow { -webkit-appearance: none; -moz-appearance: none; appearance: none; } @media print { body * { visibility: hidden; } #receipt-container-invoice, #receipt-container-invoice * { visibility: visible; } #receipt-container-invoice { position: absolute; left: 0; top: 0; width: 80mm; } }`;

  if (isLoading) return <div className="h-full w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="animate-spin text-blue-500" size={40} /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <style>{styles}</style>
      {toast && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none p-4">
          <div className={`px-10 py-6 rounded-[25px] shadow-2xl animate-in zoom-in duration-300 flex flex-col items-center space-y-4 border-2 pointer-events-auto min-w-[320px] text-center ${
            toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-rose-500 text-white border-rose-400'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 size={48} /> : <AlertCircle size={48} />}
            <span className="font-black text-xs uppercase tracking-[0.3em] leading-relaxed">{toast.message}</span>
          </div>
        </div>
      )}
      {isProcessing && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"><div className="bg-white dark:bg-slate-950 p-10 rounded-[15px] shadow-2xl flex flex-col items-center space-y-4 border border-slate-100 dark:border-slate-800"><Loader2 className="animate-spin text-blue-600" size={48} /><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Processing Data...</p></div></div>}

      {view === 'LIST' ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div><h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Ledger Registry</h1><p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Transaction History</p></div>
            <button onClick={() => { resetForm(); setView('CREATE'); }} className="bg-slate-900 dark:bg-white text-white dark:text-black px-8 py-3 rounded-[15px] font-black text-xs uppercase tracking-[0.1em] hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white transition-all shadow-xl active:scale-95 flex items-center space-x-3"><Plus size={18} /><span>Create Invoice</span></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-slate-900 p-6 rounded-[15px] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Search Customer or ID..." value={registrySearch} onChange={(e) => setRegistrySearch(e.target.value)} className="w-full pl-12 pr-4 py-3 rounded-[15px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none focus:border-blue-500" /></div>
            <div className="relative"><Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><select value={registryStatusFilter} onChange={(e) => setRegistryStatusFilter(e.target.value as any)} className="w-full pl-12 pr-4 py-3 rounded-[15px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none focus:border-blue-500 no-arrow"><option value="ALL">All Payment Status</option><option value="PAID">Paid</option><option value="PARTIAL">Partial</option><option value="UNPAID">Unpaid</option></select></div>
            <div className="relative"><Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="date" value={registryDateFilter} onChange={(e) => setRegistryDateFilter(e.target.value)} className="w-full pl-12 pr-4 py-3 rounded-[15px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none focus:border-blue-500" />{registryDateFilter && <button onClick={() => setRegistryDateFilter('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14}/></button>}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-[15px] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800"><tr><th className="px-8 py-5">Invoice ID</th><th className="px-6 py-5">Customer</th><th className="px-6 py-5">Date</th><th className="px-6 py-5">Amount</th><th className="px-6 py-5">Status</th><th className="px-8 py-5 text-right">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">{filteredJobs.length === 0 ? (<tr><td colSpan={6} className="px-8 py-20 text-center text-sm font-bold text-slate-300 uppercase tracking-widest italic">{jobs.length === 0 ? "No invoices found." : "No records match criteria."}</td></tr>) : (filteredJobs.map((job) => (<tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"><td className="px-8 py-5"><span className="text-sm font-black text-slate-900 dark:text-slate-100">#{job.id.slice(-6).toUpperCase()}</span></td><td className="px-6 py-5"><div className="text-sm font-bold text-slate-700 dark:text-slate-300">{customers.find(c => c.id === job.customerId)?.name || 'Unknown'}</div></td><td className="px-6 py-5 text-sm font-bold text-slate-500">{new Date(job.createdAt).toLocaleDateString('en-IN')}</td><td className="px-6 py-5"><span className="text-sm font-black text-slate-900 dark:text-white">₹{job.totalAmount}</span></td><td className="px-6 py-5"><span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter border ${job.paymentStatus === 'PAID' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : job.paymentStatus === 'PARTIAL' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' : 'text-rose-500 bg-rose-500/10 border-rose-500/20'}`}>{job.paymentStatus}</span></td><td className="px-8 py-5 text-right space-x-2"><button onClick={() => handleEdit(job)} className="p-2 text-slate-400 hover:text-amber-500 transition-colors" title="Edit"><Edit size={16}/></button><button onClick={() => handlePrint(job)} className="p-2 text-slate-400 hover:text-blue-500 transition-colors" title="Print"><Printer size={16}/></button><button onClick={() => handleDownloadPDF(job)} className="p-2 text-slate-400 hover:text-emerald-500 transition-colors" title="Download PDF"><Download size={16}/></button><button onClick={() => handleDelete(job.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors" title="Delete"><Trash2 size={16}/></button></td></tr>)))}</tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-[15px] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
          <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center"><div className="flex items-center space-x-4"><button onClick={() => setView('LIST')} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-[15px] text-slate-500 transition-colors"><ArrowLeft size={20} /></button><div><h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{editingId ? 'Edit Invoice' : 'Invoice Terminal'}</h1><p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Unified Billing Workspace</p></div></div><FileText className="text-blue-500 opacity-20" size={48} /></div>
          <div className="p-8 space-y-10">
            {!isCustomerSelected ? (
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[15px] border border-slate-100 dark:border-slate-800 relative"><div className="max-w-xl mx-auto space-y-4"><label className="text-sm font-bold text-slate-400 uppercase tracking-widest block ml-1 text-center">Type Customer Name to Search</label><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-[15px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-semibold outline-none focus:border-blue-500 shadow-sm" placeholder="Search by name..." /></div>{filteredCustomers.length > 0 && (<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[15px] shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">{filteredCustomers.map(c => (<div key={c.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"><div className="flex items-center space-x-3"><User size={16} className="text-slate-400" /><span className="text-sm font-bold text-slate-700 dark:text-slate-200">{c.name}</span></div><button onClick={() => handleSelectCustomer(c.id)} className="bg-blue-600 text-white px-6 py-2 rounded-[15px] text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center space-x-2"><UserCheck size={14} /><span>Select</span></button></div>))}</div>)}</div></div>
            ) : (
              <div className="grid grid-cols-12 gap-8 items-center bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[15px] border border-blue-500/20 shadow-lg animate-in slide-in-from-top-4 duration-300"><div className="col-span-12 lg:col-span-4 space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest block ml-1">Active Customer</label><div className="flex items-center space-x-3 bg-white dark:bg-slate-900 px-5 py-3 rounded-[15px] border border-slate-200 dark:border-slate-700 shadow-sm min-h-[46px]"><User className="text-blue-500" size={18} /><span className="text-sm font-black text-slate-800 dark:text-white uppercase">{selectedCustomer?.name}</span><button onClick={handleResetCustomer} className="ml-auto p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"><X size={14} /></button></div></div><div className="col-span-12 lg:col-span-4 space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest block ml-1">Aadhaar Identity</label><div className="flex items-center space-x-3 bg-white dark:bg-slate-900 px-5 py-3 rounded-[15px] border border-slate-200 dark:border-slate-700 shadow-sm min-h-[46px]"><Fingerprint size={18} className="text-slate-400" /><span className="text-sm font-mono font-bold tracking-widest text-slate-700 dark:text-slate-300">{selectedCustomer?.aadhaarNumber ? selectedCustomer.aadhaarNumber.replace(/(\d{4})/g, '$1 ').trim() : '---- ---- ----'}</span></div></div><div className="col-span-12 lg:col-span-4 space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest block ml-1">Mobile Access</label><div className="flex items-center space-x-3 bg-white dark:bg-slate-900 px-5 py-3 rounded-[15px] border border-slate-200 dark:border-slate-700 shadow-sm min-h-[46px]"><Smartphone size={18} className="text-slate-400" /><span className="text-sm font-bold text-slate-700 dark:text-slate-300">{selectedCustomer?.phone || '+91 00000 00000'}</span></div></div></div>
            )}
            {isCustomerSelected && (
              <div className="space-y-10 animate-in fade-in duration-500">
                <div className="space-y-4"><h3 className="text-sm font-black text-slate-400 uppercase tracking-widest ml-1">Item Staging Area</h3><div className="grid grid-cols-12 gap-4 items-end bg-white dark:bg-slate-950 p-6 rounded-[15px] border border-blue-500/20 shadow-xl"><div className="col-span-12 lg:col-span-3 space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest block ml-1">Service Particulars</label><select value={currentServiceId} onChange={(e) => handleServiceSelect(e.target.value)} className="w-full px-4 py-3 rounded-[15px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold outline-none focus:border-blue-500 no-arrow"><option value="">Choose Domain...</option>{services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div className="col-span-6 lg:col-span-1 space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest block ml-1">Qty</label><input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full px-4 py-3 rounded-[15px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold outline-none focus:border-blue-500 no-spinner" /></div><div className="col-span-6 lg:col-span-2 space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest block ml-1">Unit Rate (₹)</label><input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} className="w-full px-4 py-3 rounded-[15px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold outline-none focus:border-blue-500 no-spinner" /></div><div className="col-span-6 lg:col-span-1 space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest block ml-1">Disc. (₹)</label><input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-full px-4 py-3 rounded-[15px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-rose-500 outline-none focus:border-rose-500 no-spinner" /></div><div className="col-span-6 lg:col-span-2 space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest block ml-1">Line Total</label><div className="w-full px-4 py-3 rounded-[15px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-black text-slate-900 dark:text-white min-h-[46px] flex items-center">₹{currentSubtotal}</div></div><div className="col-span-12 lg:col-span-2 space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest block ml-1">Workflow</label><select value={status} onChange={(e) => setStatus(e.target.value as JobStatus)} className="w-full px-4 py-3 rounded-[15px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold outline-none focus:border-blue-500 no-arrow"><option value="PENDING">Pending</option><option value="IN_PROGRESS">Processing</option><option value="COMPLETED">Completed</option></select></div><div className="col-span-12 lg:col-span-1"><button onClick={addServiceToList} className="w-full p-3 bg-blue-600 text-white rounded-[15px] hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center group active:scale-95" title="Add to Bill"><Plus size={24} className="group-hover:rotate-90 transition-transform" /></button></div></div></div>
                <div className="space-y-6"><div className="bg-white dark:bg-slate-950 rounded-[15px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm min-h-[200px]"><table className="w-full text-left"><thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800"><tr><th className="px-8 py-5">Particulars</th><th className="px-6 py-5 text-center">Unit Price</th><th className="px-6 py-5 text-center">Qty</th><th className="px-6 py-5 text-center">Discount</th><th className="px-6 py-5 text-right">Net Value</th><th className="px-8 py-5 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-50 dark:divide-slate-800">{items.length === 0 ? (<tr><td colSpan={6} className="px-8 py-20 text-center text-sm font-bold text-slate-300 uppercase tracking-widest italic">Bill is empty. Staging items above will populate this ledger.</td></tr>) : (items.map((item, idx) => (<tr key={idx} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"><td className="px-8 py-4"><div className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase">{services.find(s => s.id === item.serviceId)?.name || 'Unknown'}</div></td><td className="px-6 py-4 text-center text-sm font-bold text-slate-500">₹{item.unitPrice}</td><td className="px-6 py-4 text-center text-sm font-black text-slate-800 dark:text-white">{item.quantity}</td><td className="px-6 py-4 text-center text-sm font-black text-rose-500">₹{item.discount}</td><td className="px-6 py-4 text-right text-sm font-black text-slate-900 dark:text-white tracking-tighter">₹{item.subtotal}</td><td className="px-8 py-4 text-right"><button onClick={() => removeItem(idx)} className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button></td></tr>)))}</tbody></table></div><div className="flex justify-end pr-8"><div className="w-full max-w-xs space-y-2"><label className="text-sm font-bold text-emerald-600 uppercase tracking-widest block ml-1">Amount Paid (₹)</label><div className="relative"><IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600/50" size={20} /><input type="number" value={paidAmount} onChange={(e) => setPaidAmount(Number(e.target.value))} className="w-full pl-12 pr-6 py-4 rounded-[15px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xl font-black text-emerald-600 outline-none focus:border-emerald-500 shadow-sm no-spinner" placeholder="0" /></div></div></div></div>
              </div>
            )}
          </div>
          <div className="px-8 py-8 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row justify-between items-center gap-10">
            <div className="flex flex-wrap items-center gap-10">
              <div className="space-y-1"><span className="text-xs font-black text-slate-400 uppercase tracking-widest block ml-1">Gross Total Bill</span><div className="flex items-center text-2xl font-bold text-slate-400 tracking-tighter opacity-60">₹ {totals.gross}</div></div>
              <div className="space-y-1"><span className="text-xs font-black text-rose-500 uppercase tracking-widest block ml-1">Total Discount</span><div className="flex items-center text-2xl font-black text-rose-600 tracking-tighter">- ₹ {totals.totalDiscount}</div></div>
              <div className="space-y-1"><span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest block ml-1">Net To Be Paid</span><div className="flex items-center text-4xl font-black text-slate-900 dark:text-white tracking-tighter"><IndianRupee size={28} className="mr-1 opacity-20" /> {totals.netTotal}</div></div>
              <div className="flex items-center space-x-8 bg-white dark:bg-slate-950 px-8 py-4 rounded-[15px] border border-slate-200 dark:border-slate-700 shadow-inner"><div className="space-y-1"><span className="text-xs font-black text-rose-600 uppercase tracking-widest block ml-1">Pending Amount</span><div className={`text-2xl font-black tracking-tighter ${totals.pending > 0 ? 'text-rose-600' : 'text-emerald-500'}`}>₹ {totals.pending}</div></div></div>
            </div>
            <div className="flex items-center space-x-4 w-full xl:w-auto"><button onClick={() => { if(window.confirm("Abort current session? Data will be lost.")) setView('LIST'); }} className="flex-1 xl:flex-none px-6 py-2 font-bold text-slate-400 uppercase tracking-widest text-xs hover:text-slate-900 dark:hover:text-white transition-colors">Abort</button><button onClick={handleCommitInvoice} disabled={isSaving} className="flex-1 xl:flex-none bg-slate-900 dark:bg-white text-white dark:text-black px-8 py-2.5 rounded-[15px] font-bold text-xs uppercase tracking-[0.1em] hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white transition-all shadow-xl active:scale-95 flex items-center justify-center space-x-2">{isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}<span>Commit Ledger</span></button></div>
          </div>
        </div>
      )}

      {(receiptJob || isGeneratingPDF) && (
        <div className={`fixed inset-0 z-[100] bg-white pointer-events-none flex justify-center ${isGeneratingPDF ? 'opacity-100 overflow-visible' : 'opacity-0 print:opacity-100 print:relative print:z-auto print:block print:w-full'}`}>
          <div id="receipt-container-invoice" className="w-[80mm] p-6 bg-white text-black font-sans border border-gray-100 shadow-sm">
            <div className="text-center mb-6 space-y-1"><div className="inline-block bg-black text-white px-2 py-1 rounded font-black text-sm mb-1">RE</div><h2 className="text-lg font-black uppercase">Regal Jan Seva Kendra</h2><p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Innovation is our Motto</p></div>
            <div className="border-t border-b border-black border-dashed py-3 my-4 space-y-1"><div className="flex justify-between text-[8px] font-black uppercase"><span>ID: #{receiptJob?.id.slice(-6).toUpperCase()}</span><span>Date: {new Date(receiptJob?.createdAt || '').toLocaleDateString('en-IN')}</span></div></div>
            <div className="mb-4 space-y-0.5"><p className="text-[7px] font-black uppercase text-gray-400">Account Holder:</p><h3 className="text-xs font-black uppercase">{customers.find(c => c.id === receiptJob?.customerId)?.name || 'Walk-in'}</h3><p className="text-[8px] font-mono">{customers.find(c => c.id === receiptJob?.customerId)?.phone}</p></div>
            <table className="w-full text-left mb-4"><thead className="border-b border-black text-[7px] font-black uppercase"><tr><th className="py-1">Item</th><th className="py-1 text-center">Qty</th><th className="py-1 text-right">Amt</th></tr></thead><tbody>{receiptJob?.items.map((item, idx) => (<tr key={idx} className="text-[8px] border-b border-gray-50"><td className="py-1.5"><div className="font-bold uppercase">{services.find(s => s.id === item.serviceId)?.name || 'Custom'}</div></td><td className="py-1.5 text-center">{item.quantity}</td><td className="py-1.5 text-right font-bold">₹{item.subtotal}</td></tr>))}</tbody><tfoot><tr className="border-t border-black"><td colSpan={2} className="py-2 font-black text-[10px] uppercase">Net Total</td><td className="py-2 text-right font-black text-[10px]">₹{receiptJob?.totalAmount}</td></tr><tr className="text-[8px] font-bold text-gray-600"><td colSpan={2} className="uppercase">Cash Paid</td><td className="text-right">₹{receiptJob?.paidAmount}</td></tr><tr className="text-[8px] font-black text-red-600"><td colSpan={2} className="uppercase">Due Balance</td><td className="text-right">₹{receiptJob?.balance}</td></tr></tfoot></table>
            <div className="text-center mt-6 pt-4 border-t border-gray-100 border-dashed"><p className="text-[7px] text-gray-400 italic">Authorized CSC ERP Transaction.</p></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicePage;
