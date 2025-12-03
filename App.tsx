import React, { useState } from 'react';
import Header from './components/Header';
import LiveSession from './components/LiveSession';
import DocumentReader from './components/DocumentReader';
import SignUpModal from './components/SignUpModal';
import { AppMode } from './types';
import { BrainCircuit } from 'lucide-react';

function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.DOCUMENT_READER);
  const [showSignUp, setShowSignUp] = useState(false);

  const renderContent = () => {
    switch (mode) {
      case AppMode.LIVE_CONVERSATION:
        return <LiveSession />;
      case AppMode.DOCUMENT_READER:
        return <DocumentReader />;
      default:
        return <DocumentReader />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-800 relative">
      <Header 
        currentMode={mode} 
        setMode={setMode} 
        onConnectClick={() => setShowSignUp(true)}
      />
      
      <main className="flex-1 w-full mx-auto sm:px-4 lg:px-8 pt-6">
        {renderContent()}
      </main>

      <footer className="bg-white border-t border-slate-200 py-10 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center space-y-4">
            {/* Footer Logo */}
            <div className="flex items-center space-x-2 opacity-90 grayscale hover:grayscale-0 transition-all duration-500">
                <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center shadow-md">
                   <BrainCircuit className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-black text-slate-900 tracking-tighter">
                    AIBRZE <span className="text-indigo-600">SPEAK</span>
                </span>
            </div>
            
            <div className="h-px w-12 bg-slate-200 my-2"></div>

            <div className="text-[11px] font-bold text-slate-400 tracking-[0.2em] uppercase">
                DEVELOPED BY LOGESHRAGUL 2025
            </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <SignUpModal isOpen={showSignUp} onClose={() => setShowSignUp(false)} />
    </div>
  );
}

export default App;
