import { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { reassembleAndDecompress } from '../utils/dataUtils';
import { Camera, RefreshCw, CheckCircle2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { motion } from 'motion/react';

export default function ReceiveMode() {
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [chunks, setChunks] = useState<Record<number, string>>({});
  const [totalExpected, setTotalExpected] = useState<number>(0);
  const [dataType, setDataType] = useState<'image'|'audio'>('image');
  const [resultData, setResultData] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);

  // Stats
  const collectedCount = Object.keys(chunks).length;
  const progress = totalExpected > 0 ? (collectedCount / totalExpected) * 100 : 0;

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 720 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS
        videoRef.current.play();
        setHasCamera(true);
        setIsScanning(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setHasCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsScanning(false);
    }
  };

  useEffect(() => {
    // Check if fully received
    if (totalExpected > 0 && collectedCount === totalExpected && !resultData) {
      // Reassemble
      const sortedChunks = [];
      for (let i = 0; i < totalExpected; i++) {
        sortedChunks.push(chunks[i]);
      }
      try {
        const dataUrl = reassembleAndDecompress(sortedChunks, dataType);
        setResultData(dataUrl);
        stopCamera();
      } catch (err) {
        console.error("Failed to decode:", err);
      }
    }
  }, [chunks, totalExpected, collectedCount, resultData, dataType]);

  useEffect(() => {
    const tick = () => {
      if (isScanning && videoRef.current && canvasRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code && code.data) {
            // Parse chunk: index|total|type|base64
            const parts = code.data.split('|');
            if (parts.length >= 4) {
              const index = parseInt(parts[0], 10);
              const total = parseInt(parts[1], 10);
              const typeChar = parts[2];
              const data = code.data.substring(parts[0].length + parts[1].length + parts[2].length + 3); 
              
              if (!isNaN(index) && !isNaN(total)) {
                if (totalExpected === 0) {
                  setTotalExpected(total);
                  setDataType(typeChar === 'a' ? 'audio' : 'image');
                }
                setChunks(prev => {
                  if (prev[index]) return prev; // already have it
                  return { ...prev, [index]: data };
                });
              }
            } else if (parts.length >= 3) {
              // Backward compatibility for old format: index|total|base64
              const index = parseInt(parts[0], 10);
              const total = parseInt(parts[1], 10);
              const data = code.data.substring(parts[0].length + parts[1].length + 2);
              
              if (!isNaN(index) && !isNaN(total)) {
                if (totalExpected === 0) {
                  setTotalExpected(total);
                  setDataType('image');
                }
                setChunks(prev => {
                  if (prev[index]) return prev;
                  return { ...prev, [index]: data };
                });
              }
            }
          }
        }
      }
      requestRef.current = requestAnimationFrame(tick);
    };

    if (isScanning && !resultData) {
      requestRef.current = requestAnimationFrame(tick);
    }
    
    return () => {
      cancelAnimationFrame(requestRef.current);
    };
  }, [isScanning, totalExpected, resultData]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleReset = () => {
    setChunks({});
    setTotalExpected(0);
    setResultData(null);
    startCamera();
  };

  return (
    <div className="flex flex-col items-center justify-start w-full max-w-2xl mx-auto py-4">
      
      {!resultData ? (
        <div className="w-full relative flex flex-col items-center">
          
          {/* Camera Viewfinder */}
          <div className="relative w-full max-w-md aspect-square rounded-2xl overflow-hidden bg-[#2B2B2B] border-[12px] border-[#0057A6] shadow-[8px_8px_0px_var(--lego-border)] flex items-center justify-center transition-shadow duration-300">
            {hasCamera === false && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-[var(--lego-bg)]">
                <Camera className="w-16 h-16 text-[#D01012] mb-4" strokeWidth={2.5} />
                <p className="text-[#D01012] font-black uppercase text-xl">Camera Blocked</p>
                <p className="font-bold text-[var(--lego-muted)] mt-2">Please allow camera permissions.</p>
              </div>
            )}
            
            <video 
              ref={videoRef} 
              className={cn("w-full h-full object-cover", !isScanning && "hidden")}
              muted playsInline
            />
            
            {/* Hidden canvas for image processing */}
            <canvas ref={canvasRef} className="hidden" />

            {!isScanning && hasCamera !== false && (
              <div className="absolute inset-0 flex items-center justify-center bg-[var(--lego-bg)] z-10 transition-colors duration-300">
                <button
                  onClick={startCamera}
                  className="px-8 py-4 rounded-xl bg-[#00A650] border-4 border-[#007036] text-white font-black text-xl hover:-translate-y-1 shadow-[4px_4px_0px_#007036] hover:shadow-[6px_6px_0px_#007036] active:translate-y-1 active:shadow-none transition-all flex items-center gap-3 uppercase tracking-wide"
                >
                  <Camera className="w-8 h-8" strokeWidth={3} />
                  Start Scanner
                </button>
              </div>
            )}
          </div>

          {/* Progress Indicators */}
          {isScanning && (
            <div className="mt-8 w-full max-w-md bg-[var(--lego-card)] border-4 border-[var(--lego-border)] rounded-2xl p-6 shadow-[8px_8px_0px_var(--lego-border)] transition-colors duration-300">
              <div className="flex justify-between items-center mb-4">
                <span className="font-black text-[var(--lego-text)] uppercase">Building {dataType === 'audio' ? 'Audio' : 'Image'}</span>
                <span className="font-black text-[#0057A6]">
                  {totalExpected > 0 ? `${collectedCount} / ${totalExpected}` : 'WAITING...'}
                </span>
              </div>
              
              {/* Chunk visualizer grid (LEGO blocks style) */}
              <div className="w-full flex flex-wrap gap-1 p-2 bg-[var(--lego-bg)] border-2 border-[var(--lego-border)] rounded-xl min-h-[60px] content-start transition-colors duration-300">
                {totalExpected > 0 ? (
                  Array.from({ length: totalExpected }).map((_, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ scale: 0 }}
                      animate={{ scale: chunks[i] ? 1 : 0 }}
                      className="w-4 h-4 bg-[#FFD500] border-2 border-[#B29500] rounded-sm shadow-sm"
                    />
                  ))
                ) : (
                  <div className="w-full text-center text-sm font-bold text-[var(--lego-muted)] uppercase py-2">
                    Point camera at sender
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Reveal Animation State */
        <motion.div 
          className="w-full flex flex-col items-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, type: "spring", bounce: 0.5 }}
        >
          <div className="relative w-full max-w-md p-4 rounded-2xl bg-[var(--lego-card)] border-4 border-[var(--lego-border)] shadow-[10px_10px_0px_var(--lego-border)] mb-10 flex flex-col items-center transition-colors duration-300">
            {/* Stud Decoration Header */}
            <div className="absolute -top-3 left-4 right-4 flex justify-around">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="w-6 h-4 bg-[var(--lego-card)] border-4 border-[var(--lego-border)] border-b-0 rounded-t-md transition-colors duration-300" />
              ))}
            </div>

            <div className="relative rounded-xl overflow-hidden bg-[var(--lego-bg)] border-4 border-[var(--lego-border)] w-full p-2 mt-2 transition-colors duration-300">
              {dataType === 'audio' ? (
                <div className="flex flex-col items-center justify-center p-8 bg-[#FFD500] rounded-lg">
                  <audio src={resultData} controls autoPlay className="w-full max-w-xs outline-none" />
                </div>
              ) : (
                <img 
                  src={resultData} 
                  alt="Received data" 
                  className="w-full h-auto object-contain rounded-lg"
                />
              )}
            </div>
            
            {/* Success Badge */}
            <motion.div 
              className="absolute -bottom-6 bg-[#00A650] border-4 border-[#007036] text-white px-6 py-3 rounded-xl shadow-[4px_4px_0px_#007036] flex items-center gap-2 font-black uppercase tracking-wide text-lg"
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: -5 }}
              transition={{ delay: 0.4, type: 'spring', bounce: 0.6 }}
            >
              <CheckCircle2 className="w-6 h-6" strokeWidth={3} />
              Built!
            </motion.div>
          </div>

          <button
            onClick={handleReset}
            className="px-8 py-3 rounded-xl bg-[#0057A6] border-4 border-[#003B73] text-white shadow-[4px_4px_0px_#003B73] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#003B73] active:translate-y-1 active:shadow-none transition-all flex items-center gap-3 uppercase font-black tracking-wide"
          >
            <RefreshCw className="w-5 h-5" strokeWidth={3} />
            Receive Another
          </button>
        </motion.div>
      )}
      
    </div>
  );
}
