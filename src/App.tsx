/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect } from 'react';
import SendMode from './components/SendMode';
import ReceiveMode from './components/ReceiveMode';
import { cn } from './utils/cn';
import { ScanLine, Send, Moon, Sun } from 'lucide-react';
import { AppMode } from './types';

export default function App() {
  const [mode, setMode] = useState<AppMode>('send');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true);
    }
  }, []);

  return (
    <div className={cn("min-h-screen bg-[var(--lego-bg)] text-[var(--lego-text)] overflow-hidden relative transition-colors duration-300", isDark ? "dark" : "")}>
      {/* Dark Mode Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={() => setIsDark(!isDark)}
          className="p-3 bg-[var(--lego-card)] border-4 border-[var(--lego-border)] shadow-[4px_4px_0px_var(--lego-border)] rounded-xl hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_var(--lego-border)] active:translate-y-1 active:shadow-none transition-all text-[var(--lego-text)]"
        >
          {isDark ? <Sun className="w-6 h-6" strokeWidth={2.5}/> : <Moon className="w-6 h-6" strokeWidth={2.5}/>}
        </button>
      </div>

      {/* Playful Lego Baseplate Background Mesh */}
      <div className="fixed inset-0 z-0 pointer-events-none transition-colors duration-300">
        <div 
          className="absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage: `
              radial-gradient(circle at 10px 10px, var(--lego-stud-dark) 2.5px, transparent 3px),
              radial-gradient(circle at 10px 10px, var(--lego-stud-light) 2px, transparent 2px)
            `,
            backgroundSize: '20px 20px',
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="w-full p-6 flex flex-col items-center">
          <div className="bg-[#FFD500] px-6 py-2 rounded-xl border-4 border-[var(--lego-border)] shadow-[4px_4px_0px_var(--lego-border)] mb-4 rotate-[-2deg] flex items-center gap-2 transition-colors duration-300">
            <ScanLine className="w-6 h-6 text-[#2B2B2B]" strokeWidth={3} />
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#2B2B2B] uppercase">
              QRMesh
            </h1>
          </div>
          <p className="text-[var(--lego-muted)] font-medium text-center transition-colors duration-300">
            Send images using only light. No internet needed!
          </p>
          
          {/* Mode Toggle */}
          <div className="mt-8 flex gap-4">
            <button
              onClick={() => setMode('send')}
              className={cn(
                "px-8 py-3 rounded-xl text-lg font-bold transition-all border-4 flex items-center gap-2 uppercase tracking-wide",
                mode === 'send' 
                  ? "bg-[#0057A6] border-[#003B73] text-white shadow-none translate-y-1" 
                  : "bg-[var(--lego-card)] border-[var(--lego-border)] text-[var(--lego-text)] shadow-[4px_4px_0px_var(--lego-border)] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_var(--lego-border)] active:translate-y-1 active:shadow-none"
              )}
            >
              <Send className="w-5 h-5" strokeWidth={2.5} />
              Transmit
            </button>
            <button
              onClick={() => setMode('receive')}
              className={cn(
                "px-8 py-3 rounded-xl text-lg font-bold transition-all border-4 flex items-center gap-2 uppercase tracking-wide",
                mode === 'receive' 
                  ? "bg-[#00A650] border-[#007036] text-white shadow-none translate-y-1" 
                  : "bg-[var(--lego-card)] border-[var(--lego-border)] text-[var(--lego-text)] shadow-[4px_4px_0px_var(--lego-border)] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_var(--lego-border)] active:translate-y-1 active:shadow-none"
              )}
            >
              <ScanLine className="w-5 h-5" strokeWidth={2.5} />
              Scan
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col items-center justify-start p-4 md:p-8">
          {mode === 'send' ? <SendMode /> : <ReceiveMode />}
        </main>
        
        {/* Footer */}
        <footer className="py-6 text-center text-sm font-bold text-[var(--lego-muted)] uppercase tracking-widest transition-colors duration-300">
          <p>No internet • No servers</p>
        </footer>
      </div>
    </div>
  );
}
