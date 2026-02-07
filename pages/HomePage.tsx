
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  CreditCard, Smartphone, CheckCircle, Clock, MapPin, 
  Phone, Globe, Fingerprint, FileText, ChevronRight,
  Shield, Home, Briefcase, Users, ChevronLeft
} from 'lucide-react';

const BANNER_SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&q=80&w=1200",
    title: "Empowering Digital India",
    subtitle: "Your Trusted Partner for all Government Digital Services.",
    cta: "Explore Services"
  },
  {
    image: "https://images.unsplash.com/photo-1601597111158-2fcee29a1ee1?auto=format&fit=crop&q=80&w=1200",
    title: "Instant Banking Services",
    subtitle: "AePS, Money Transfer, and Insurance at your doorstep.",
    cta: "Check Banking"
  },
  {
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=1200",
    title: "Government Certificates",
    subtitle: "Fastest processing for Income, Caste, and Domicile certificates.",
    cta: "Apply Now"
  }
];

const HomePage: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % BANNER_SLIDES.length);
  }, []);

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + BANNER_SLIDES.length) % BANNER_SLIDES.length);
  };

  useEffect(() => {
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Navbar */}
      <nav className="border-b border-gray-100 py-4 px-6 md:px-12 flex justify-between items-center bg-white sticky top-0 z-50 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 w-10 h-10 rounded-lg text-white flex items-center justify-center font-black tracking-tighter shadow-md shadow-blue-100">
            RE
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-slate-800 leading-none">Regal Jan Seva</span>
            <span className="text-[6px] font-black text-blue-600 uppercase tracking-[0.5em] mt-1.5">INNOVATION IS OUR MOTTO</span>
          </div>
        </div>
        <div className="hidden md:flex space-x-8 text-slate-600 font-medium">
          <a href="#services" className="hover:text-blue-600 transition-colors">Services</a>
          <a href="#about" className="hover:text-blue-600 transition-colors">About Us</a>
          <a href="#contact" className="hover:text-blue-600 transition-colors">Contact</a>
        </div>
        <div className="flex items-center space-x-4">
          <Link 
            to="/login" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-full font-semibold transition-all shadow-md shadow-blue-100 flex items-center"
          >
            Staff Login
          </Link>
        </div>
      </nav>

      {/* Hero Section with Swipe Banner */}
      <section className="relative overflow-hidden bg-slate-900 group">
        <div 
          className="flex transition-transform duration-700 ease-in-out h-[500px] md:h-[600px]"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {BANNER_SLIDES.map((slide, index) => (
            <div key={index} className="w-full shrink-0 relative">
              <img 
                src={slide.image} 
                alt={slide.title} 
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-700">
                  <h2 className="text-blue-400 font-bold tracking-widest uppercase text-sm mb-4">Common Service Centre (CSC)</h2>
                  <h1 className="text-4xl md:text-7xl font-extrabold text-white leading-tight mb-6">
                    {slide.title}
                  </h1>
                  <p className="text-lg md:text-xl text-slate-200 mb-8 max-w-2xl mx-auto">
                    {slide.subtitle}
                  </p>
                  <div className="flex justify-center gap-4">
                    <a href="#services" className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold shadow-xl hover:bg-blue-700 transition-all flex items-center">
                      {slide.cta} <ChevronRight size={20} className="ml-2" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Buttons */}
        <button 
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 border border-white/20"
          aria-label="Previous slide"
        >
          <ChevronLeft size={24} />
        </button>
        <button 
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 border border-white/20"
          aria-label="Next slide"
        >
          <ChevronRight size={24} />
        </button>

        {/* Slide Indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-3">
          {BANNER_SLIDES.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 transition-all rounded-full ${
                currentSlide === index ? 'w-8 bg-blue-500' : 'w-2 bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Features/Stats */}
      <section className="py-12 bg-white -mt-10 max-w-5xl mx-auto rounded-3xl shadow-xl z-10 px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="flex items-start space-x-4">
          <div className="bg-green-100 p-3 rounded-2xl text-green-600">
            <CheckCircle size={24} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800">Govt. Certified</h4>
            <p className="text-sm text-slate-500">Authorized CSC VLE partner serving since 2018.</p>
          </div>
        </div>
        <div className="flex items-start space-x-4 border-l border-gray-100 pl-4 md:pl-8">
          <div className="bg-blue-100 p-3 rounded-2xl text-blue-600">
            <Clock size={24} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800">Quick Turnaround</h4>
            <p className="text-sm text-slate-500">Fastest processing for Aadhaar, PAN & Passports.</p>
          </div>
        </div>
        <div className="flex items-start space-x-4 border-l border-gray-100 pl-4 md:pl-8">
          <div className="bg-purple-100 p-3 rounded-2xl text-purple-600">
            <Shield size={24} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800">Secure Process</h4>
            <p className="text-sm text-slate-500">Your data privacy and security is our top priority.</p>
          </div>
        </div>
      </section>

      {/* Services List */}
      <section id="services" className="py-24 px-6 md:px-12 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Our Premium Services</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">We provide a wide range of G2C (Government to Citizen) and B2C services efficiently.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <ServiceCard icon={<Fingerprint size={32} />} title="Aadhaar Services" desc="New Enrollment, Biometric update, and Address change." />
            <ServiceCard icon={<FileText size={32} />} title="PAN & IT" desc="New PAN application, Correction, and ITR Filing assistance." />
            <ServiceCard icon={<Smartphone size={32} />} title="Recharge & Bills" desc="Mobile, DTH, Electricity, Gas and Water bill payments." />
            <ServiceCard icon={<CreditCard size={32} />} title="Banking & Cash" desc="AePS (Cash Withdrawal), Mini Statement, and Balance Enquiry." />
            <ServiceCard icon={<Home size={32} />} title="e-District" desc="Caste, Income, Domicile and Birth/Death certificates." />
            <ServiceCard icon={<Briefcase size={32} />} title="Insurance" desc="Life, Vehicle, Health and General Insurance policies." />
            <ServiceCard icon={<Users size={32} />} title="Social Schemes" desc="PM Kisan, Shramik Card, and Old Age Pension registration." />
            <ServiceCard icon={<Globe size={32} />} title="Other Services" desc="Train Tickets, Voter ID, and Digital Signature certificates." />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-slate-900 text-slate-300 py-16 px-6 md:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <div className="flex items-center space-x-3 text-white mb-6">
              <div className="bg-blue-600 w-10 h-10 rounded text-white flex items-center justify-center font-black text-xs tracking-tighter">
                RE
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold leading-none">Regal Jan Seva</span>
                <span className="text-[6px] font-black text-blue-400 uppercase tracking-[0.5em] mt-1.5">INNOVATION IS OUR MOTTO</span>
              </div>
            </div>
            <p className="mb-6">Empowering digital India through localized service centers. Providing reliability and efficiency since 2018.</p>
            <div className="flex space-x-4">
              <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-blue-600 cursor-pointer transition-colors"><Phone size={18} /></div>
              <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-blue-600 cursor-pointer transition-colors"><Globe size={18} /></div>
              <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-blue-600 cursor-pointer transition-colors"><MapPin size={18} /></div>
            </div>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Contact Details</h4>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <MapPin className="text-blue-500 shrink-0" size={20} />
                <span>Shop No. 12, Main Market Road, Near Tehsil Office, Regal Chowk, India</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="text-blue-500 shrink-0" size={20} />
                <span>+91 98765 43210</span>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="text-blue-500 shrink-0" size={20} />
                <span>Mon - Sat: 09:00 AM - 08:00 PM</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Staff Access</h4>
            <p className="mb-6">Authorized personnel can access the ERP dashboard below.</p>
            <Link to="/login" className="bg-blue-600 text-white px-6 py-3 rounded-lg block text-center font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/40">
              Access ERP Dashboard
            </Link>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-slate-800 mt-16 pt-8 text-center text-sm text-slate-500">
          &copy; 2024 Regal Jan Seva Kendra. All Rights Reserved. CSC Authorized VLE.
        </div>
      </footer>
    </div>
  );
};

const ServiceCard: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => (
  <div className="bg-white p-8 rounded-3xl border border-gray-100 hover:border-blue-100 hover:shadow-2xl hover:shadow-blue-500/5 transition-all group cursor-pointer">
    <div className="bg-blue-50 text-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
      {icon}
    </div>
    <h4 className="text-xl font-bold text-slate-800 mb-3">{title}</h4>
    <p className="text-slate-500 leading-relaxed">{desc}</p>
  </div>
);

export default HomePage;
