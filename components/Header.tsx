import React from 'react';
import { AppMode } from '../types';
import { BookOpen, Mic, BrainCircuit, UserPlus } from 'lucide-react';

interface HeaderProps {
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
  onConnectClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentMode, setMode, onConnectClick }) => {
  const navItems = [
    { mode: AppMode.DOCUMENT_READER, label: 'Read & Translate', icon: BookOpen },
    { mode: AppMode.LIVE_CONVERSATION, label: 'Live Speak', icon: Mic },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div 
            className="flex items-center space-x-3 cursor-pointer group" 
            onClick={() => setMode(AppMode.DOCUMENT_READER)}
          >
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300 transform group-hover:scale-105 group-hover:rotate-3">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black text-slate-900 tracking-tighter leading-none">
                AIBRZE <span className="text-indigo-600">SPEAK</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1 group-hover:text-indigo-500 transition-colors">
                Intelligent Voice
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <nav className="hidden md:flex items-center space-x-1 bg-slate-100/80 p-1.5 rounded-xl">
              {navItems.map((item) => {
                const isActive = currentMode === item.mode;
                const Icon = item.icon;
                return (
                  <button
                    key={item.mode}
                    onClick={() => setMode(item.mode)}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${
                      isActive
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-200/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mr-2 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <button 
              onClick={onConnectClick}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-md hover:shadow-lg"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Connect Account</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
