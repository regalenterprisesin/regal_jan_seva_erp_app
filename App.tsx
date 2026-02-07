
import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, UserCircle, Briefcase, Settings as SettingsIcon, 
  BarChart3, Package, LogOut, Menu, X, Search, Plus, Trash2, Edit, Save, 
  ChevronRight, Home, Shield, Loader2, ChevronLeft, Bell, Sun, Moon, AlertTriangle, Clock,
  CheckCircle2, FileText, Calendar
} from 'lucide-react';
import { db } from './db';
import { User, Privilege, Job } from './types';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import CustomerManagement from './pages/CustomerManagement';
import ServiceManagement from './pages/ServiceManagement';
import JobManagement from './pages/JobManagement';
import InventoryManagement from './pages/InventoryManagement';
import UserManagement from './pages/UserManagement';
import Reports from './pages/Reports';
import InvoicePage from './pages/InvoicePage';
import SettingsPage from './pages/SettingsPage';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [overdueJobs, setOverdueJobs] = useState<Job[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  const today = new Date().toLocaleDateString('en-IN', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });

  useEffect(() => {
    const initialize = async () => {
      try {
        await db.init();
        const user = await db.auth.getSession();
        setCurrentUser(user);
        if (user) fetchNotifications();
      } catch (e) {
        console.error("Failed to initialize system", e);
      } finally {
        setIsInitializing(false);
      }
    };
    initialize();
  }, []);

  useEffect(() => {
    if (currentUser) fetchNotifications();
  }, [location.pathname, currentUser]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    const allJobs = await db.jobs.all();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const overdue = allJobs.filter(j => 
      j.status !== 'COMPLETED' && 
      new Date(j.createdAt) < threeDaysAgo
    );
    setOverdueJobs(overdue);
  };

  const handleLogout = () => {
    db.auth.setSession(null);
    setCurrentUser(null);
    navigate('/');
  };

  const hasPrivilege = (privilege: Privilege) => {
    return currentUser?.privileges.includes(privilege);
  };

  const isPublicPath = ['/', '/login'].includes(location.pathname);

  if (isInitializing) {
    return (
      <div className={`h-screen w-screen flex flex-col items-center justify-center ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <Loader2 className="animate-spin mb-4 text-blue-600" size={48} />
        <p className="text-xl font-bold tracking-widest uppercase animate-pulse">Initializing ERP System...</p>
      </div>
    );
  }

  if (!currentUser && !isPublicPath) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {!isPublicPath && currentUser && (
        <div className="flex h-screen overflow-hidden">
          {/* Sliding Sidebar */}
          <aside 
            className={`bg-slate-900 text-white flex flex-col shrink-0 transition-all duration-300 ease-in-out z-30 shadow-2xl ${
              isSidebarOpen ? 'w-72 opacity-100' : 'w-0 opacity-0 -translate-x-full overflow-hidden'
            }`}
          >
            <div className="p-6 border-b border-slate-800 flex items-center justify-start whitespace-nowrap">
              <div className="bg-blue-600 w-10 h-10 rounded-[15px] text-white shrink-0 shadow-lg shadow-blue-900/40 flex items-center justify-center font-black text-lg tracking-tighter">
                RE
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-bold tracking-tight leading-none text-white uppercase">Regal Jan Seva</h1>
                <p className="text-[6px] text-blue-400 uppercase font-black tracking-[0.5em] mt-1.5 opacity-90">INNOVATION IS OUR MOTTO</p>
              </div>
            </div>
            
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-hide">
              <SidebarItem to="/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" active={location.pathname === '/dashboard'} />
              <div className="my-4 border-t border-slate-800/50 mx-4" />
              
              {hasPrivilege('MANAGE_CUSTOMERS') && (
                <SidebarItem to="/customers" icon={<Users size={20} />} label="Customers" active={location.pathname === '/customers'} />
              )}
              {hasPrivilege('MANAGE_SERVICES') && (
                <SidebarItem to="/services" icon={<SettingsIcon size={20} />} label="Services" active={location.pathname === '/services'} />
              )}
              
              <SidebarItem to="/invoices" icon={<FileText size={20} />} label="Invoices" active={location.pathname === '/invoices'} />
              
              {hasPrivilege('MANAGE_JOBS') && (
                <SidebarItem to="/jobs" icon={<Briefcase size={20} />} label="Job Workflow" active={location.pathname === '/jobs'} />
              )}
              {hasPrivilege('MANAGE_INVENTORY') && (
                <SidebarItem to="/inventory" icon={<Package size={20} />} label="Inventory" active={location.pathname === '/inventory'} />
              )}
              {hasPrivilege('VIEW_REPORTS') && (
                <SidebarItem to="/reports" icon={<BarChart3 size={20} />} label="Reports" active={location.pathname === '/reports'} />
              )}
              {hasPrivilege('MANAGE_USERS') && (
                <SidebarItem to="/users" icon={<Shield size={20} />} label="User Access" active={location.pathname === '/users'} />
              )}
              <SidebarItem to="/settings" icon={<SettingsIcon size={20} />} label="Settings" active={location.pathname === '/settings'} />
            </nav>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col overflow-hidden relative">
            <header className={`h-20 border-b flex items-center justify-between px-6 shrink-0 transition-all backdrop-blur-md sticky top-0 z-20 ${
              isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-100 shadow-sm'
            }`}>
              <div className="flex items-center space-x-6">
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2.5 rounded-[15px] bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-90"
                >
                  <Menu size={24} />
                </button>

                <div className="flex flex-col">
                  <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
                    {location.pathname.split('/').pop()?.replace('-', ' ') || 'DASHBOARD'}
                  </h2>
                  <div className="h-1 w-8 bg-blue-600 rounded-full mt-1"></div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="hidden lg:flex items-center bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-[15px] border border-transparent focus-within:border-blue-500 transition-all w-48 shadow-inner">
                  <Search size={16} className="text-slate-400 mr-2" />
                  <input 
                    type="text" 
                    placeholder="Search..." 
                    className="bg-transparent border-none outline-none text-xs w-full dark:text-white"
                  />
                </div>

                <div className="flex items-center space-x-1">
                  <button 
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="p-2 rounded-[15px] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  >
                    {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                  </button>
                  
                  <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-[15px] bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 shadow-sm">
                    <Calendar size={14} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{today}</span>
                  </div>

                  <div className="relative" ref={notificationRef}>
                    <button 
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="p-2 rounded-[15px] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all relative"
                    >
                      <Bell size={18} />
                      {overdueJobs.length > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-red-600 text-white text-[8px] flex items-center justify-center font-black rounded-full border-2 border-white dark:border-slate-800 animate-pulse">
                          {overdueJobs.length}
                        </span>
                      )}
                    </button>

                    {showNotifications && (
                      <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 rounded-[15px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in zoom-in duration-200">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                          <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">Alerts</h3>
                          {overdueJobs.length > 0 && <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">Overdue</span>}
                        </div>
                        <div className="max-h-[400px] overflow-y-auto">
                          {overdueJobs.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">
                              <CheckCircle2 size={32} className="mx-auto mb-3 text-green-500 opacity-20" />
                              <p className="text-xs font-bold uppercase tracking-wide">All jobs are on track!</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                              {overdueJobs.map(job => (
                                <Link 
                                  key={job.id} 
                                  to="/jobs" 
                                  onClick={() => setShowNotifications(false)}
                                  className="p-4 flex items-start space-x-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                                >
                                  <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-2 rounded-[15px] group-hover:scale-110 transition-transform">
                                    <AlertTriangle size={18} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">Job #{job.id.slice(-6)}</p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1">Pending for {Math.floor((Date.now() - new Date(job.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days</p>
                                  </div>
                                  <ChevronRight size={14} className="text-slate-300 mt-1" />
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="h-8 w-px bg-slate-100 dark:bg-slate-800 mx-2"></div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-[15px] border border-slate-100 dark:border-slate-800">
                    <div className="w-8 h-8 rounded-[15px] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold shadow-sm text-white text-xs">
                      {currentUser.username[0].toUpperCase()}
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-xs font-bold text-slate-800 dark:text-white leading-tight">{currentUser.username}</p>
                      <p className="text-[8px] text-blue-500 font-black uppercase tracking-wider">{currentUser.role}</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-2.5 rounded-[15px] bg-red-50 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white transition-all active:scale-90 border border-red-100"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 scroll-smooth bg-slate-50 dark:bg-slate-950">
              <div className="max-w-7xl mx-auto">
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/invoices" element={<InvoicePage />} />
                  <Route path="/customers" element={<CustomerManagement />} />
                  <Route path="/services" element={<ServiceManagement />} />
                  <Route path="/jobs" element={<JobManagement />} />
                  <Route path="/inventory" element={<InventoryManagement />} />
                  <Route path="/users" element={<UserManagement />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* Public Views */}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage setCurrentUser={setCurrentUser} />} />
      </Routes>
    </div>
  );
};

interface SidebarItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ to, icon, label, active }) => (
  <Link 
    to={to} 
    className={`flex items-center px-4 py-3.5 rounded-[15px] transition-all duration-300 group whitespace-nowrap ${
      active 
        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-900/40 translate-x-1' 
        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
    } space-x-4`}
  >
    <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
      {icon}
    </div>
    <span className={`font-bold text-sm tracking-wide transition-opacity duration-300`}>
      {label}
    </span>
  </Link>
);

export default App;
