
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { CompanySettings } from '../types';
import { 
  Building2, Phone, MapPin, User, Mail, Globe, Save, 
  Loader2, CheckCircle2, ShieldCheck, Briefcase
} from 'lucide-react';

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<CompanySettings>({
    companyName: '',
    mobileNumber: '',
    address: '',
    ownerName: '',
    email: '',
    website: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await db.settings.get();
        setSettings(data);
      } catch (err) {
        console.error("Failed to load settings", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await db.settings.save(settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert("Failed to save company settings.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  const inputClass = "w-full pl-12 pr-6 py-4 rounded-[15px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all";
  const labelClass = "block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2.5 ml-2";

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Company Identity</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-2">Manage Official Business Records</p>
        </div>
        <ShieldCheck className="text-blue-500 opacity-20" size={64} />
      </div>

      {success && (
        <div className="bg-emerald-500 text-white p-4 rounded-[15px] flex items-center justify-center space-x-3 shadow-lg animate-in zoom-in duration-300">
          <CheckCircle2 size={24} />
          <span className="font-bold">Successfully Profile Updated</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900/50 rounded-[15px] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden backdrop-blur-sm">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center space-x-4">
          <div className="bg-blue-600 p-3 rounded-[15px] text-white shadow-lg shadow-blue-500/30">
            <Building2 size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Organization Profile</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">These details will appear on invoices and reports</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className={labelClass}>Company Registered Name</label>
              <div className="relative group">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input 
                  type="text" 
                  value={settings.companyName}
                  onChange={(e) => setSettings({...settings, companyName: e.target.value})}
                  className={inputClass}
                  placeholder="e.g. Regal Jan Seva Kendra"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className={labelClass}>Official Owner Name</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input 
                  type="text" 
                  value={settings.ownerName}
                  onChange={(e) => setSettings({...settings, ownerName: e.target.value})}
                  className={inputClass}
                  placeholder="Legal representative name"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className={labelClass}>Business Contact Number</label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input 
                  type="text" 
                  value={settings.mobileNumber}
                  onChange={(e) => setSettings({...settings, mobileNumber: e.target.value})}
                  className={inputClass}
                  placeholder="+91 00000 00000"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className={labelClass}>Corporate Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input 
                  type="email" 
                  value={settings.email}
                  onChange={(e) => setSettings({...settings, email: e.target.value})}
                  className={inputClass}
                  placeholder="contact@regal.com"
                  required
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className={labelClass}>Digital Web Presence (URL)</label>
              <div className="relative group">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input 
                  type="text" 
                  value={settings.website}
                  onChange={(e) => setSettings({...settings, website: e.target.value})}
                  className={inputClass}
                  placeholder="www.regal-jsk.com"
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className={labelClass}>Registered Business Address</label>
              <div className="relative group">
                <MapPin className="absolute left-4 top-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                <textarea 
                  value={settings.address}
                  onChange={(e) => setSettings({...settings, address: e.target.value})}
                  className={`${inputClass} min-h-[120px] pt-4 resize-none`}
                  placeholder="Full postal address with pincode..."
                  required
                />
              </div>
            </div>
          </div>

          <div className="pt-6 flex justify-end">
            <button 
              type="submit"
              disabled={isSaving}
              className="bg-slate-900 dark:bg-white text-white dark:text-black px-12 py-4 rounded-[15px] font-black text-sm uppercase tracking-[0.2em] hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white transition-all shadow-xl active:scale-95 flex items-center space-x-3"
            >
              {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              <span>Commit Settings</span>
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-blue-50 dark:bg-blue-900/10 p-8 rounded-[15px] border border-blue-100 dark:border-blue-900/30">
          <div className="flex items-center space-x-3 mb-4 text-blue-600 dark:text-blue-400">
            <Briefcase size={20} />
            <h4 className="font-black uppercase text-xs tracking-widest">Business Tip</h4>
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
            Ensure your email and mobile number are always up-to-date. These contact details are used in automatic SMS/Email reminders for pending customer jobs and collection alerts.
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900/30 p-8 rounded-[15px] border border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3 mb-4 text-slate-600 dark:text-slate-400">
            <ShieldCheck size={20} />
            <h4 className="font-black uppercase text-xs tracking-widest">Data Integrity</h4>
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-500 leading-relaxed">
            All configuration data is stored locally within this terminal. For security, please use the system backup feature in User Management to maintain offline copies of your settings.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
