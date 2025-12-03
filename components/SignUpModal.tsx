import React, { useState } from 'react';
import { X, Mail, User, Lock, ArrowRight, Loader2, CheckCircle, Wifi } from 'lucide-react';

interface SignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SignUpModal: React.FC<SignUpModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [status, setStatus] = useState<'idle' | 'connecting' | 'sending' | 'success'>('idle');

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('connecting');

    // Simulate Realtime Connection
    setTimeout(() => {
      setStatus('sending');
      
      // Construct Email
      const subject = encodeURIComponent("New AIBRZE Account Request");
      const body = encodeURIComponent(
        `New Account Details:\n\nName: ${formData.name}\nEmail: ${formData.email}\nTimestamp: ${new Date().toLocaleString()}\n\nPlease verify and connect this user.`
      );
      
      // Trigger Mailto
      window.location.href = `mailto:logeshragul6@gmail.com?subject=${subject}&body=${body}`;

      setTimeout(() => {
        setStatus('success');
        setTimeout(() => {
          onClose();
          setStatus('idle');
          setFormData({ name: '', email: '', password: '' });
        }, 2000);
      }, 1000);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Wifi className="w-24 h-24" />
          </div>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-3xl font-black tracking-tight mb-2">Create Account</h2>
          <p className="text-indigo-100 font-medium">Connect with AIBRZE Realtime</p>
        </div>

        {/* Form */}
        <div className="p-8">
          {status === 'idle' ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:font-normal"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:font-normal"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:font-normal"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5 mt-4"
              >
                <span>Connect Realtime</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 space-y-6 text-center">
              <div className="relative">
                {status === 'success' ? (
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                ) : (
                  <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                  </div>
                )}
                {status === 'connecting' && (
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    CONNECTING
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">
                  {status === 'connecting' && 'Establishing Connection...'}
                  {status === 'sending' && 'Syncing Data...'}
                  {status === 'success' && 'Account Connected!'}
                </h3>
                <p className="text-slate-500 text-sm max-w-[200px] mx-auto">
                  {status === 'success' 
                    ? 'Your details have been sent for verification.' 
                    : 'Please wait while we connect to the realtime server.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignUpModal;
