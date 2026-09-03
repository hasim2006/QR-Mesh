import * as pako from 'pako';

// Encode array buffer to base64
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Decode base64 to array buffer
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

// Max payload size for a reasonable QR code density that can be scanned quickly by a phone
export const CHUNK_SIZE = 60; 

function encode8BitWAV(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length);
  const view = new DataView(buffer);
  
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // 1 channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true); // ByteRate
  view.setUint16(32, 1, true); // BlockAlign
  view.setUint16(34, 8, true); // BitsPerSample
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length, true);

  // Write 8-bit samples (0-255, center 128)
  for (let i = 0; i < samples.length; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    let val = Math.round((s + 1) * 127.5);
    view.setUint8(44 + i, val);
  }
  return buffer;
}

export async function compressAndChunkFile(
  file: File,
  onProgress?: (progress: number, status: string) => void
): Promise<string[]> {
  const wait = () => new Promise(r => setTimeout(r, 30));

  let bytes: Uint8Array;
  let typeFlag = 'i';

  if (file.type.startsWith('audio')) {
    typeFlag = 'a';
    onProgress?.(10, "Loading Audio...");
    await wait();

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    onProgress?.(30, "Decoding Audio...");
    await wait();
    
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    
    onProgress?.(50, "Compressing (8kHz Mono)...");
    await wait();
    
    const TARGET_SAMPLE_RATE = 8000;
    const offlineCtx = new OfflineAudioContext(1, Math.ceil(audioBuffer.duration * TARGET_SAMPLE_RATE), TARGET_SAMPLE_RATE);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);
    const renderedBuffer = await offlineCtx.startRendering();
    
    onProgress?.(70, "Encoding WAV...");
    await wait();
    const wavBuffer = encode8BitWAV(renderedBuffer.getChannelData(0), TARGET_SAMPLE_RATE);
    bytes = new Uint8Array(wavBuffer);
  } else {
    onProgress?.(10, "Loading Image...");
    await wait();

    // Downscale image
    const img = new Image();
    const url = URL.createObjectURL(file);
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });

    onProgress?.(30, "Resizing & Formatting...");
    await wait();

    const canvas = document.createElement('canvas');
    // Aggressive downscale for QR capacity limits
    const MAX_WIDTH = 150; 
    const MAX_HEIGHT = 150;
    let width = img.width;
    let height = img.height;

    if (width > height) {
      if (width > MAX_WIDTH) {
        height *= MAX_WIDTH / width;
        width = MAX_WIDTH;
      }
    } else {
      if (height > MAX_HEIGHT) {
        width *= MAX_HEIGHT / height;
        height = MAX_HEIGHT;
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, width, height);
    
    onProgress?.(50, "Extracting Bytes...");
    await wait();

    // Output as highly compressed JPEG
    const dataUrl = canvas.toDataURL('image/jpeg', 0.2);
    // Extract base64 part
    const base64Data = dataUrl.split(',')[1];
    
    // Convert base64 to binary string then to Uint8Array
    const binStr = window.atob(base64Data);
    bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
  }

  onProgress?.(80, "Compressing Data...");
  await wait();

  // Compress using pako
  const compressed = pako.deflate(bytes);
  
  onProgress?.(90, "Generating Chunks...");
  await wait();

  // Convert to base64
  const compressedBase64 = arrayBufferToBase64(compressed.buffer);

  // Chunking
  const chunks: string[] = [];
  const totalChunks = Math.ceil(compressedBase64.length / CHUNK_SIZE);
  
  for (let i = 0; i < totalChunks; i++) {
    const chunkData = compressedBase64.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    chunks.push(`${i}|${totalChunks}|${typeFlag}|${chunkData}`);
  }

  onProgress?.(100, "Ready to Transmit");
  await wait();

  return chunks;
}

export function reassembleAndDecompress(chunksData: string[], dataType: 'image' | 'audio'): string {
  // join chunks
  const compressedBase64 = chunksData.join('');
  const compressedBuffer = base64ToArrayBuffer(compressedBase64);
  const decompressed = pako.inflate(new Uint8Array(compressedBuffer));
  
  // Convert decompressed Uint8Array back to binary string
  let binaryString = '';
  for (let i = 0; i < decompressed.length; i++) {
    binaryString += String.fromCharCode(decompressed[i]);
  }
  
  const base64 = window.btoa(binaryString);
  const mime = dataType === 'audio' ? 'audio/wav' : 'image/jpeg';
  return `data:${mime};base64,${base64}`;
}
