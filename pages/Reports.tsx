
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { 
  FileText, Download, Filter, IndianRupee, Clock, AlertCircle, 
  Calendar, CheckCircle2, Package, Search, Loader2, ChevronRight, Users
} from 'lucide-react';
import { Job, Customer, Service } from '../types';

const Reports: React.FC = () => {
  const [reportType, setReportType] = useState<'PENDING_JOBS' | 'PENDING_PAYMENTS' | 'CUSTOMERS' | 'SERVICES'>('PENDING_JOBS');
  const [dateFilter, setDateFilter] = useState('');
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const getFilteredData = () => {
    let filtered = [];
    switch(reportType) {
      case 'PENDING_JOBS':
        filtered = jobs.filter(j => j.status !== 'COMPLETED');
        break;
      case 'PENDING_PAYMENTS':
        filtered = jobs.filter(j => j.balance > 0);
        break;
      case 'CUSTOMERS':
        filtered = customers;
        break;
      case 'SERVICES':
        filtered = services;
        break;
      default:
        filtered = [];
    }

    if (dateFilter) {
      filtered = (filtered as any[]).filter(item => {
        const date = item.createdAt || item.updatedAt || item.lastUpdated;
        return date && date.startsWith(dateFilter);
      });
    }
    return filtered;
  };

  const data = getFilteredData();

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Report Type Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <ReportTab 
          active={reportType === 'PENDING_JOBS'} 
          onClick={() => setReportType('PENDING_JOBS')} 
          label="Pending Jobs" 
          icon={<Clock size={24}/>} 
          color="blue"
          count={jobs.filter(j => j.status !== 'COMPLETED').length}
        />
        <ReportTab 
          active={reportType === 'PENDING_PAYMENTS'} 
          onClick={() => setReportType('PENDING_PAYMENTS')} 
          label="Credit Registry" 
          icon={<IndianRupee size={24}/>} 
          color="rose"
          count={jobs.filter(j => j.balance > 0).length}
        />
        <ReportTab 
          active={reportType === 'CUSTOMERS'} 
          onClick={() => setReportType('CUSTOMERS')} 
          label="Client Directory" 
          icon={<Users size={24}/>} 
          color="emerald"
          count={customers.length}
        />
        <ReportTab 
          active={reportType === 'SERVICES'} 
          onClick={() => setReportType('SERVICES')} 
          label="Service Catalog" 
          icon={<Package size={24}/>} 
          color="indigo"
          count={services.length}
        />
      </div>

      {/* Report Content Container */}
      <div className="bg-white dark:bg-slate-900 rounded-[15px] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Filter Header */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-50 dark:bg-slate-950/50">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center uppercase tracking-tight">
              <FileText size={20} className="mr-3 text-blue-500" /> 
              {reportType.replace('_', ' ')}
            </h3>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Audit Log & Performance Data</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="date" 
                value={dateFilter} 
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-[15px] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:border-blue-500 transition-all text-xs"
              />
            </div>
            <button className="bg-slate-900 dark:bg-white text-white dark:text-black px-6 py-3 rounded-[15px] font-black text-xs uppercase tracking-widest flex items-center space-x-2 hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white transition-all shadow-xl whitespace-nowrap">
              <Download size={16} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
          {data.length === 0 ? (
            <div className="p-24 text-center">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-[15px] flex items-center justify-center mx-auto mb-6 text-slate-300 dark:text-slate-700">
                <Search size={32} />
              </div>
              <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">No matching records found</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 max-w-sm mx-auto">Try adjusting your filters or date range</p>
            </div>
          ) : (
            <>
              {reportType === 'PENDING_JOBS' && (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-950/50 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] sticky top-0 z-10 backdrop-blur-md">
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <th className="px-10 py-6">Job Specification</th>
                      <th className="px-8 py-6">Customer</th>
                      <th className="px-8 py-6">Status</th>
                      <th className="px-10 py-6 text-right">Initiation Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(data as Job[]).map((j) => (
                      <tr key={j.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                        <td className="px-10 py-6">
                          <div className="font-black text-slate-900 dark:text-slate-100 text-sm">
                            {j.items.length === 1 
                              ? (services.find(s => s.id === j.items[0].serviceId)?.name || 'Custom')
                              : `${j.items.length} Services Bundle`}
                          </div>
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Workflow: #{j.id.slice(-6).toUpperCase()}</div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="font-bold text-slate-600 dark:text-slate-400">{customers.find(c => c.id === j.customerId)?.name || 'Walk-in'}</div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            j.status === 'PENDING' ? 'bg-amber-50 dark:bg-amber-900/10 text-amber-600 border-amber-100 dark:border-amber-900/20' : 'bg-blue-50 dark:bg-blue-900/10 text-blue-600 border-blue-100 dark:border-blue-900/20'
                          }`}>
                            {j.status}
                          </span>
                        </td>
                        <td className="px-10 py-6 text-right text-xs font-bold text-slate-500 dark:text-slate-500 uppercase">
                          {new Date(j.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {reportType === 'PENDING_PAYMENTS' && (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-950/50 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] sticky top-0 z-10 backdrop-blur-md">
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <th className="px-10 py-6">Account Holder</th>
                      <th className="px-8 py-6">Total Billing</th>
                      <th className="px-8 py-6">Clearing Amount</th>
                      <th className="px-10 py-6 text-right">Credit Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(data as Job[]).map((j) => (
                      <tr key={j.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-10 py-6">
                          <div className="font-black text-slate-900 dark:text-slate-100">{customers.find(c => c.id === j.customerId)?.name || 'Unknown'}</div>
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Job ID: #{j.id.slice(-4)}</div>
                        </td>
                        <td className="px-8 py-6 font-black text-slate-600 dark:text-slate-400">₹{j.totalAmount.toLocaleString()}</td>
                        <td className="px-8 py-6 font-black text-emerald-600">₹{j.paidAmount.toLocaleString()}</td>
                        <td className="px-10 py-6 text-right font-black text-rose-600 text-lg tracking-tighter">₹{j.balance.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {(reportType === 'CUSTOMERS' || reportType === 'SERVICES') && (
                <div className="p-20 text-center">
                  <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-[15px] flex items-center justify-center mx-auto mb-6 text-blue-500/20">
                    <CheckCircle2 size={32} />
                  </div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">{reportType === 'CUSTOMERS' ? 'Client Master Data Ready' : 'Service Schema Verified'}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 max-w-sm mx-auto leading-relaxed">
                    A total of {data.length} records are queued. For data integrity, please use the Export feature for full offline analysis.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

interface ReportTabProps {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  color: 'blue' | 'rose' | 'emerald' | 'indigo';
  count: number;
}

const ReportTab: React.FC<ReportTabProps> = ({ active, onClick, label, icon, color, count }) => {
  const colors = {
    blue: active ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:border-blue-100 dark:hover:border-blue-900',
    rose: active ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-600' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:border-rose-100 dark:hover:border-rose-900',
    emerald: active ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:border-emerald-100 dark:hover:border-emerald-900',
    indigo: active ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:border-indigo-100 dark:hover:border-indigo-900',
  };

  const iconBg = {
    blue: active ? 'bg-blue-500 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400',
    rose: active ? 'bg-rose-500 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400',
    emerald: active ? 'bg-emerald-500 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400',
    indigo: active ? 'bg-indigo-500 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400',
  };

  return (
    <button 
      onClick={onClick}
      className={`p-8 rounded-[15px] border-2 transition-all flex flex-col items-center justify-center space-y-4 group relative overflow-hidden shadow-sm ${colors[color]}`}
    >
      <div className={`p-4 rounded-[15px] transition-all duration-500 ${iconBg[color]} ${active ? 'scale-110 shadow-lg' : 'group-hover:scale-110'}`}>
        {icon}
      </div>
      <div className="text-center">
        <span className={`text-[10px] font-black uppercase tracking-[0.2em] block mb-1 ${active ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{label}</span>
        <span className={`text-xl font-black tracking-tighter ${active ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{count} Records</span>
      </div>
      {active && (
        <div className="absolute top-0 right-0 p-4">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></div>
        </div>
      )}
    </button>
  );
};

export default Reports;
