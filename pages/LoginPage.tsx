
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Shield, Lock, User as UserIcon, AlertCircle, Globe, CheckCircle2, 
  Loader2, Sparkles, ArrowRight, Fingerprint, FileText, CreditCard, 
  Smartphone, Zap, ChevronRight, Activity, Cpu, Mail, ArrowLeft, Key, Cloud, CloudOff
} from 'lucide-react';
import { db } from '../db';
import { User } from '../types';

interface LoginPageProps {
  setCurrentUser: (user: User) => void;
}

const STORAGE_REMEMBER_KEY = 'regal_remembered_user';

const LoginPage: React.FC<LoginPageProps> = ({ setCurrentUser }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Recovery States
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<'EMAIL' | 'PASSWORD'>('EMAIL');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_REMEMBER_KEY);
    if (savedUser) {
      setUsername(savedUser);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const user = await db.auth.login(username, password);
      if (user) {
        if (rememberMe) {
          localStorage.setItem(STORAGE_REMEMBER_KEY, username);
        } else {
          localStorage.removeItem(STORAGE_REMEMBER_KEY);
        }
        db.auth.setSession(user);
        setCurrentUser(user);
        navigate('/dashboard');
      } else {
        setError('Invalid credentials, Try Again');
      }
    } catch (err) {
      setError('System connection failed. Retrying...');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoveryRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const allUsers = await db.users.all();
      const user = allUsers.find(u => u.email.toLowerCase() === recoveryEmail.toLowerCase());
      
      if (user) {
        setTargetUser(user);
        setTimeout(() => {
          setRecoveryStep('PASSWORD');
          setIsLoading(false);
        }, 1500);
      } else {
        setError('Email address not found in our records.');
        setIsLoading(false);
      }
    } catch (err) {
      setError('Recovery system offline.');
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser || !newPassword) return;
    
    setIsLoading(true);
    try {
      const updatedUser = { ...targetUser, password: newPassword };
      await db.users.save(updatedUser);
      setSuccessMsg('Security credentials updated successfully.');
      setTimeout(() => {
        resetRecoveryState();
        setShowRecovery(false);
      }, 2000);
    } catch (err) {
      setError('Failed to update credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetRecoveryState = () => {
    setRecoveryStep('EMAIL');
    setRecoveryEmail('');
    setNewPassword('');
    setTargetUser(null);
    setError('');
    setSuccessMsg('');
  };

  const isCloudActive = db.isCloudActive();

  return (
    <div className="flex-1 flex min-h-screen bg-white dark:bg-slate-950 transition-colors duration-500 overflow-hidden">
      {/* Left Side: Vector Animated Illustration & Services */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900">
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse delay-700"></div>
          
          <div className="absolute top-1/4 left-1/4 animate-bounce duration-[3000ms] text-blue-500/40">
            <Cpu size={120} strokeWidth={0.5} />
          </div>
          <div className="absolute bottom-1/4 right-1/4 animate-pulse duration-[4000ms] text-indigo-500/40">
            <Activity size={100} strokeWidth={0.5} />
          </div>
        </div>

        <div className="relative z-10 w-full flex flex-col justify-between p-16">
          <div className="flex items-center space-x-4 group">
            <div className="bg-blue-600 w-16 h-16 rounded-[15px] text-white shadow-2xl shadow-blue-500/50 group-hover:rotate-12 transition-transform duration-500 flex items-center justify-center font-black text-2xl tracking-tighter">
              RE
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Regal Jan Seva</span>
              <span className="text-[8px] font-black text-blue-300 uppercase tracking-[0.5em] mt-2">INNOVATION IS OUR MOTTO</span>
            </div>
          </div>
          
          <div className="space-y-12">
            <div className="space-y-4">
              <div className="inline-flex items-center space-x-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full backdrop-blur-md">
                <Sparkles size={14} className="text-blue-400" />
                <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest">Unified Service Hub</span>
              </div>
              <h1 className="text-5xl font-black text-white leading-tight tracking-tighter">
                Accelerating <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">Digital Empowerment.</span>
              </h1>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ServiceLink icon={<Fingerprint size={20} />} title="Aadhaar" desc="Enrollments & Updates" color="blue" />
              <ServiceLink icon={<FileText size={20} />} title="PAN & IT" desc="Fresh Cards & Filings" color="indigo" />
              <ServiceLink icon={<CreditCard size={20} />} title="Banking" desc="AePS & Money Transfers" color="emerald" />
              <ServiceLink icon={<Smartphone size={20} />} title="Utility" desc="Billings & Recharges" color="amber" />
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
             <div className="flex -space-x-3">
               {[1,2,3].map(i => (
                 <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?u=${i}`} alt="user" className="w-full h-full object-cover opacity-80" />
                 </div>
               ))}
             </div>
             <p className="text-xs font-bold text-slate-400">Trusted by <span className="text-white">5,000+</span> citizens monthly.</p>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16 relative">
        <div className="absolute inset-0 dark:hidden opacity-[0.03] pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="w-full max-w-md animate-in fade-in slide-in-from-right-8 duration-700 relative z-10">
          <div className="mb-12">
            <div className="lg:hidden flex items-center space-x-3 mb-8">
              <div className="bg-blue-600 w-12 h-12 rounded-[15px] text-white flex items-center justify-center font-black tracking-tighter">
                RE
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Regal Jan Seva</span>
                <span className="text-[6px] font-black text-blue-600 uppercase tracking-[0.5em] mt-1.5">INNOVATION IS OUR MOTTO</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-1 bg-blue-600 rounded-full"></div>
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Portal Access</span>
              </div>
              <div className={`flex items-center space-x-2 px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                isCloudActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
              }`}>
                {isCloudActive ? <Cloud size={10} /> : <CloudOff size={10} />}
                <span>{isCloudActive ? 'Supabase Connected' : 'Local Only'}</span>
              </div>
            </div>
            
            {!showRecovery ? (
              <>
                <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-3">Welcome Back.</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Verify your administrative identity to proceed.</p>
              </>
            ) : (
              <>
                <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-3">Recover Access.</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium">
                  {recoveryStep === 'EMAIL' ? 'Identify your account via registered email.' : 'Set a new secure access code.'}
                </p>
              </>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900/50 p-10 rounded-[15px] border border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
            {(error || successMsg) && (
              <div className={`mb-8 p-4 border rounded-[15px] flex items-center space-x-3 text-xs font-black uppercase tracking-widest animate-in slide-in-from-top-2 ${
                error ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/20 text-rose-600 dark:text-rose-400' 
                      : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20 text-emerald-600 dark:text-emerald-400'
              }`}>
                {error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                <span>{error || successMsg}</span>
              </div>
            )}

            {!showRecovery ? (
              <form onSubmit={handleLogin} className="space-y-8 animate-in fade-in duration-500">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-2">Username</label>
                  <div className="relative group">
                    <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <input 
                      type="text" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-14 pr-6 py-4 rounded-[15px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-black outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
                      placeholder="Enter identity"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-2">Access Code</label>
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-14 pr-6 py-4 rounded-[15px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-black outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between py-1">
                  <label className="flex items-center space-x-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="peer w-5 h-5 rounded-lg border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500/20 bg-white dark:bg-slate-950 appearance-none border-2 checked:bg-blue-600 checked:border-blue-600 transition-all" 
                      />
                      <CheckCircle2 size={12} className="absolute left-1 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Persist Session</span>
                  </label>
                  <button 
                    type="button" 
                    onClick={() => setShowRecovery(true)}
                    className="text-[11px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest transition-colors"
                  >
                    Recovery Assistance
                  </button>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-slate-900 dark:bg-white text-white dark:text-black py-5 rounded-[15px] font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white transition-all shadow-xl shadow-slate-200 dark:shadow-none active:scale-[0.98] flex items-center justify-center group"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      <span>Unlock Terminal</span>
                      <ArrowRight size={18} className="ml-3 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="animate-in slide-in-from-right-4 duration-500">
                {recoveryStep === 'EMAIL' ? (
                  <form onSubmit={handleRecoveryRequest} className="space-y-8">
                    <div className="space-y-3">
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-2">Administrative Email</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                        <input 
                          type="email" 
                          value={recoveryEmail}
                          onChange={(e) => setRecoveryEmail(e.target.value)}
                          className="w-full pl-14 pr-6 py-4 rounded-[15px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-black outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                          placeholder="admin@regal-erp.com"
                          required
                        />
                      </div>
                    </div>
                    <button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full bg-blue-600 text-white py-5 rounded-[15px] font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center group"
                    >
                      {isLoading ? <Loader2 className="animate-spin" size={20} /> : <span>Verify Identity</span>}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handlePasswordReset} className="space-y-8">
                    <div className="space-y-3">
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-2">New Access Code</label>
                      <div className="relative group">
                        <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                        <input 
                          type="password" 
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full pl-14 pr-6 py-4 rounded-[15px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-black outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                          placeholder="••••••••"
                          required
                        />
                      </div>
                    </div>
                    <button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full bg-emerald-600 text-white py-5 rounded-[15px] font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center group"
                    >
                      {isLoading ? <Loader2 className="animate-spin" size={20} /> : <span>Save Security Policy</span>}
                    </button>
                  </form>
                )}
                
                <button 
                  onClick={() => {
                    setShowRecovery(false);
                    resetRecoveryState();
                  }}
                  className="w-full mt-6 flex items-center justify-center space-x-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Return to Login</span>
                </button>
              </div>
            )}
          </div>
          
          <div className="mt-12 text-center">
            <Link to="/" className="inline-flex items-center space-x-2 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white font-black text-[10px] uppercase tracking-[0.2em] transition-colors bg-slate-50 dark:bg-slate-900/50 px-6 py-3 rounded-full border border-slate-100 dark:border-slate-800">
              <Globe size={14} /> 
              <span>Back to Public Terminal</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ServiceLinkProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: 'blue' | 'indigo' | 'emerald' | 'amber';
}

const ServiceLink: React.FC<ServiceLinkProps> = ({ icon, title, desc, color }) => {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  return (
    <div className={`p-5 rounded-[15px] border backdrop-blur-sm group hover:scale-[1.02] transition-all duration-300 ${colors[color]}`}>
      <div className="mb-4">{icon}</div>
      <h4 className="text-sm font-black text-white uppercase tracking-tight mb-1">{title}</h4>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">{desc}</p>
    </div>
  );
};

export default LoginPage;
