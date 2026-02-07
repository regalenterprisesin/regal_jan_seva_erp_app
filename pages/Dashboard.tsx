import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Briefcase, IndianRupee, Activity, AlertTriangle, TrendingUp, 
  Loader2, ArrowUpRight, ArrowDownRight, Zap, Clock, Package, 
  PlusCircle, UserPlus, Settings, FileText, ChevronRight, PieChart as PieChartIcon
} from 'lucide-react';
import { db } from '../db';
import { Job, Customer, InventoryItem, Service } from '../types';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';

const Dashboard: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const [jobsData, customersData, inventoryData, servicesData] = await Promise.all([
        db.jobs.all(),
        db.customers.all(),
        db.inventory.all(),
        db.services.all()
      ]);
      setJobs(jobsData);
      setCustomers(customersData);
      setInventory(inventoryData);
      setServices(servicesData);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const stats = useMemo(() => {
    const pendingJobs = jobs.filter(j => j.status !== 'COMPLETED').length;
    const totalRevenue = jobs.reduce((sum, j) => sum + (j.paidAmount || 0), 0);
    const totalBalance = jobs.reduce((sum, j) => sum + (j.balance || 0), 0);
    const lowStockCount = inventory.filter(item => item.quantity <= item.minStock).length;

    return { pendingJobs, totalRevenue, totalBalance, lowStockCount };
  }, [jobs, inventory]);

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    jobs.forEach(job => {
      job.items.forEach(item => {
        const service = services.find(s => s.id === item.serviceId);
        const cat = service?.category || 'Other';
        counts[cat] = (counts[cat] || 0) + (item.unitPrice * item.quantity);
      });
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [jobs, services]);

  const COLORS = ['#2563eb', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#64748b'];

  const revenueTrendData = [
    { name: 'Mon', amount: 4200 }, { name: 'Tue', amount: 3100 }, { name: 'Wed', amount: 5800 },
    { name: 'Thu', amount: 2900 }, { name: 'Fri', amount: 7200 }, { name: 'Sat', amount: 4800 }, { name: 'Sun', amount: 3900 },
  ];

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
            {greeting}, Admin <span className="text-blue-600">👋</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">
            Here's what's happening at <span className="font-bold text-slate-700 dark:text-slate-200 uppercase">Regal Jan Seva</span> today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">System Online</span>
          </div>
          <button 
            onClick={() => navigate('/jobs')}
            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-2xl font-bold transition-all shadow-xl shadow-slate-200 dark:shadow-none hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <Zap size={18} /> New Billing
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-600 via-blue-700 to-indigo-900 p-8 md:p-12 text-white shadow-2xl shadow-blue-500/20">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20">
              <TrendingUp size={14} className="text-blue-300" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Weekly Growth: +12.5%</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight">
              Centralized Control, <br />
              <span className="text-blue-300">Seamless Success.</span>
            </h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-2">Total Paid</p>
              <h4 className="text-3xl font-black">₹{stats.totalRevenue.toLocaleString()}</h4>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-2">Open Credit</p>
              <h4 className="text-3xl font-black text-red-300">₹{stats.totalBalance.toLocaleString()}</h4>
            </div>
            <div className="col-span-2 bg-white/5 p-6 rounded-3xl border border-white/5 flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-all" onClick={() => navigate('/reports')}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold">Comprehensive Reports</p>
                  <p className="text-[10px] text-blue-200 uppercase tracking-widest">Analyze Business Health</p>
                </div>
              </div>
              <ChevronRight className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<Users size={24} />} label="Customers" value={customers.length.toString()} trend="+8 new" positive={true} color="blue" />
        <StatCard icon={<Briefcase size={24} />} label="Active Invoices" value={stats.pendingJobs.toString()} trend="Active" positive={true} color="amber" />
        <StatCard icon={<Package size={24} />} label="Low Stock" value={stats.lowStockCount.toString()} trend={stats.lowStockCount > 0 ? "Urgent" : "Optimal"} positive={stats.lowStockCount === 0} color={stats.lowStockCount > 0 ? "red" : "green"} />
        <StatCard icon={<IndianRupee size={24} />} label="Collection" value={`₹${stats.totalRevenue.toLocaleString()}`} trend="+₹1.2k" positive={true} color="emerald" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ShortcutButton onClick={() => navigate('/customers')} icon={<UserPlus size={20} />} label="New Customer" color="bg-blue-600" />
        <ShortcutButton onClick={() => navigate('/jobs')} icon={<PlusCircle size={20} />} label="New Invoice" color="bg-indigo-600" />
        <ShortcutButton onClick={() => navigate('/inventory')} icon={<Package size={20} />} label="Restock" color="bg-emerald-600" />
        <ShortcutButton onClick={() => navigate('/reports')} icon={<FileText size={20} />} label="Audit Log" color="bg-slate-700 dark:bg-slate-800" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="font-black text-slate-800 dark:text-white flex items-center text-lg uppercase tracking-tight">
                <TrendingUp size={20} className="mr-3 text-blue-600" /> Revenue Stream
              </h3>
              <p className="text-xs font-bold text-slate-400 mt-1">Transaction volume trend</p>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrendData}>
                <defs>
                  <linearGradient id="colorTrend" x1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} dx={-10} />
                <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '16px'}} />
                <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorTrend)" animationDuration={1500} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="font-black text-slate-800 dark:text-white flex items-center text-lg uppercase tracking-tight">
              <PieChartIcon size={20} className="mr-3 text-indigo-600" /> Revenue Split
            </h3>
            <p className="text-xs font-bold text-slate-400 mt-1">By category</p>
          </div>
          <div className="flex-1 min-h-[300px]">
            {categoryData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center">
                <PieChartIcon size={48} className="opacity-10 mb-2" />
                <p className="text-xs font-black uppercase">No data</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} innerRadius={60} outerRadius={90} paddingAngle={8} cornerRadius={4} dataKey="value">
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px'}} />
                  <Legend verticalAlign="bottom" iconType="circle" formatter={(value) => <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-slate-800 dark:text-white text-lg uppercase tracking-tight">Recent Activity</h3>
            <button onClick={() => navigate('/jobs')} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">View All</button>
          </div>
          <div className="space-y-6">
            {jobs.length === 0 ? (
              <div className="text-center py-12 text-slate-400">No active operations</div>
            ) : (
              jobs.slice(-5).reverse().map(job => (
                <div key={job.id} onClick={() => navigate('/jobs')} className="flex items-center justify-between group cursor-pointer p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                      job.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 
                      job.status === 'PENDING' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      <Briefcase size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                        {job.items.length === 1 ? (services.find(s => s.id === job.items[0].serviceId)?.name || 'Custom') : `${job.items.length} Services Bundle`}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">#{job.id.slice(-4)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900 dark:text-white">₹{job.totalAmount}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-slate-800 dark:text-white text-lg uppercase tracking-tight">Stock Warnings</h3>
            {stats.lowStockCount > 0 && <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{stats.lowStockCount} Items</span>}
          </div>
          <div className="space-y-4">
            {inventory.filter(i => i.quantity <= i.minStock).length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Package size={40} className="mx-auto mb-3 opacity-10" />
                <p className="text-xs font-black uppercase tracking-widest">Inventory Fully Stocked</p>
              </div>
            ) : (
              inventory.filter(i => i.quantity <= i.minStock).map(item => (
                <div key={item.id} className="p-4 bg-red-50/50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-xl flex items-center justify-center">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100">{item.name}</p>
                      <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-0.5">Only {item.quantity} {item.unit} left</p>
                    </div>
                  </div>
                  <button onClick={() => navigate('/inventory')} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-xl transition-all"><PlusCircle size={20} /></button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; trend: string; positive: boolean; color: string }> = ({ icon, label, value, trend, positive, color }) => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all group">
      <div className="flex justify-between items-start mb-6">
        <div className={`${colorMap[color]} w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner`}>
          {icon}
        </div>
        <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${positive ? 'text-green-600 bg-green-50 dark:bg-green-900/10' : 'text-red-600 bg-red-50 dark:bg-red-900/10'}`}>
          {trend}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">{label}</p>
        <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</h3>
      </div>
    </div>
  );
};

const ShortcutButton: React.FC<{ onClick: () => void; icon: React.ReactNode; label: string; color: string }> = ({ onClick, icon, label, color }) => (
  <button onClick={onClick} className="flex flex-col items-center justify-center gap-3 p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group active:scale-95">
    <div className={`${color} text-white p-3 rounded-2xl shadow-lg group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-[0.2em]">{label}</span>
  </button>
);

export default Dashboard;