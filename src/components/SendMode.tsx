import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { compressAndChunkFile } from '../utils/dataUtils';
import { UploadCloud, X, RotateCcw, Zap, Music } from 'lucide-react';
import { cn } from '../utils/cn';
import { motion } from 'motion/react';

export default function SendMode() {
  const [file, setFile] = useState<File | null>(null);
  const [chunks, setChunks] = useState<string[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  
  const [prepProgress, setPrepProgress] = useState(0);
  const [prepStatus, setPrepStatus] = useState('');
  const [fps, setFps] = useState(3); // Slower default for reliability

  const frameRef = useRef<number>(0);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (file) {
      setPrepProgress(0);
      setPrepStatus('Initializing...');
      compressAndChunkFile(file, (p, s) => {
        setPrepProgress(p);
        setPrepStatus(s);
      }).then((c) => {
        setChunks(c);
        setCurrentChunkIndex(0);
        setIsTransmitting(false);
      });
    }
  }, [file]);

  useEffect(() => {
    if (!isTransmitting || chunks.length === 0) return;

    const intervalMs = 1000 / fps;

    const updateLoop = (timestamp: number) => {
      if (timestamp - lastUpdateRef.current > intervalMs) {
        setCurrentChunkIndex((prev) => (prev + 1) % chunks.length);
        lastUpdateRef.current = timestamp;
      }
      frameRef.current = requestAnimationFrame(updateLoop);
    };

    frameRef.current = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [isTransmitting, chunks.length, fps]);

  useEffect(() => {
    if (chunks.length > 0) {
      QRCode.toDataURL(chunks[currentChunkIndex], {
        errorCorrectionLevel: 'H', // High error correction for reliability
        margin: 2,
        width: 320,
        color: {
          dark: '#2B2B2B', 
          light: '#FFFFFF' 
        }
      }).then(url => setQrDataUrl(url));
    }
  }, [currentChunkIndex, chunks]);

  return (
    <div className="flex flex-col items-center justify-start w-full max-w-2xl mx-auto py-4">
      {!file ? (
        <div 
          className="w-full max-w-md aspect-square bg-[var(--lego-card)] rounded-2xl border-4 border-[var(--lego-border)] shadow-[8px_8px_0px_var(--lego-border)] flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:-translate-y-1 hover:shadow-[10px_10px_0px_var(--lego-border)] active:translate-y-2 active:shadow-none transition-all group"
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <input 
            id="file-upload" 
            type="file" 
            accept="image/*, audio/*" 
            className="hidden" 
            onChange={(e) => {
              const selectedFile = e.target.files?.[0];
              if (selectedFile) {
                if (selectedFile.type.startsWith('audio') && selectedFile.size > 1024 * 1024 * 5) {
                  alert("Audio file too large. Please keep it under 5MB for a reliable demo.");
                  return;
                }
                setFile(selectedFile);
              }
            }} 
          />
          <div className="bg-[#FFD500] p-6 rounded-full border-4 border-[var(--lego-border)] shadow-[4px_4px_0px_var(--lego-border)] mb-6 group-hover:rotate-12 transition-transform duration-300">
            <UploadCloud className="w-10 h-10 text-[#2B2B2B]" strokeWidth={2.5} />
          </div>
          <h3 className="text-2xl font-black text-[var(--lego-text)] mb-2 uppercase">Select File</h3>
          <p className="font-medium text-[var(--lego-muted)]">Pick a photo or short audio to beam across.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center w-full max-w-md">
          {/* LEGO Style Display Card */}
          <div className="relative w-full bg-[var(--lego-card)] rounded-2xl border-4 border-[var(--lego-border)] shadow-[8px_8px_0px_var(--lego-border)] p-4 flex flex-col items-center overflow-visible transition-colors duration-300">
            {/* Stud Decoration Header */}
            <div className="absolute -top-3 left-4 right-4 flex justify-around">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-6 h-4 bg-[var(--lego-card)] border-4 border-[var(--lego-border)] border-b-0 rounded-t-md transition-colors duration-300" />
              ))}
            </div>

            <div className="relative mt-4 bg-[var(--lego-bg)] rounded-xl border-4 border-[var(--lego-border)] flex items-center justify-center min-h-[320px] min-w-[320px] w-full aspect-square overflow-hidden shadow-inner transition-colors duration-300">
              {chunks.length > 0 ? (
                <img 
                  src={qrDataUrl} 
                  alt="QR Data" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full max-w-[240px] flex flex-col items-center text-[var(--lego-text)]">
                  <div className="w-12 h-12 border-8 border-slate-200 border-t-[#D01012] rounded-full animate-spin mb-6"></div>
                  <div className="font-black uppercase tracking-wide mb-3">{prepStatus}</div>
                  <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden border-2 border-[var(--lego-border)] shadow-inner">
                    <div 
                      className="h-full bg-[#00A650] transition-all duration-300 ease-out" 
                      style={{ width: `${prepProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Status indicator */}
            {chunks.length > 0 && (
              <div className="mt-4 w-full flex items-center justify-between bg-[var(--lego-bg)] border-2 border-[var(--lego-border)] p-2 rounded-lg transition-colors duration-300">
                <div className="flex items-center gap-2 font-bold text-[var(--lego-text)] px-2">
                  <span className={cn("w-3 h-3 rounded-full border-2 border-[var(--lego-border)]", isTransmitting ? "bg-[#D01012] animate-pulse" : "bg-slate-400")} />
                  {isTransmitting ? 'LIVE' : 'READY'}
                </div>
                <div className="font-black text-xl text-[#0057A6]">
                  {currentChunkIndex + 1} / {chunks.length}
                </div>
              </div>
            )}
          </div>

          {/* Speed Controls */}
          {chunks.length > 0 && (
             <div className="w-full mt-8 bg-[var(--lego-card)] border-4 border-[var(--lego-border)] rounded-xl p-4 shadow-[4px_4px_0px_var(--lego-border)] transition-colors duration-300">
                <div className="flex justify-between items-center mb-2">
                  <label className="font-black text-[var(--lego-text)] flex items-center gap-2 uppercase">
                     <Zap className="w-5 h-5 text-[#FFD500]" fill="#FFD500" strokeWidth={2} />
                     Speed
                  </label>
                  <span className="font-black text-[#0057A6]">{fps} FPS</span>
                </div>
                <input 
                  type="range" 
                  min="1" max="10" step="1" 
                  value={fps} 
                  onChange={(e) => setFps(parseInt(e.target.value))}
                  className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer outline-none border-2 border-[var(--lego-border)] accent-[#D01012]"
                />
                <p className="text-xs font-bold text-[var(--lego-muted)] mt-2 text-center uppercase">
                  Slower = Better Camera Reliability
                </p>
             </div>
          )}

          <div className="mt-8 flex flex-wrap justify-center gap-4 w-full">
            <button
              onClick={() => {
                if (!isTransmitting && currentChunkIndex !== 0) {
                  setCurrentChunkIndex(0);
                }
                setIsTransmitting(!isTransmitting);
              }}
              disabled={chunks.length === 0}
              className={cn(
                "px-8 py-3 rounded-xl text-lg font-bold transition-all border-4 flex items-center gap-2 uppercase tracking-wide flex-1 justify-center min-w-[200px]",
                isTransmitting 
                  ? "bg-[#D01012] border-[#8C0000] text-white shadow-none translate-y-1"
                  : "bg-[#00A650] border-[#007036] text-white shadow-[4px_4px_0px_#007036] hover:-translate-y-0.5 active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isTransmitting ? 'Stop' : 'Play'}
            </button>
            
            {chunks.length > 0 && (
              <button
                onClick={() => {
                  setCurrentChunkIndex(0);
                  setIsTransmitting(true);
                }}
                className="p-3 rounded-xl bg-[#FFD500] border-4 border-[#B29500] text-[#2B2B2B] shadow-[4px_4px_0px_#B29500] hover:-translate-y-0.5 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center"
                title="Restart Loop"
              >
                <RotateCcw className="w-6 h-6" strokeWidth={2.5} />
              </button>
            )}

            <button
              onClick={() => {
                setFile(null);
                setChunks([]);
                setIsTransmitting(false);
              }}
              className="p-3 rounded-xl bg-[var(--lego-card)] border-4 border-[var(--lego-border)] text-[var(--lego-text)] shadow-[4px_4px_0px_var(--lego-border)] hover:-translate-y-0.5 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center"
              title="Clear Image"
            >
              <X className="w-6 h-6" strokeWidth={3} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
