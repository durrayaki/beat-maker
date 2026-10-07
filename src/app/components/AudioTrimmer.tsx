"use client";

import { useState, useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import { X, Scissors, Loader2 } from 'lucide-react';

export default function AudioTrimmer({ 
  songUrl, 
  songName, 
  onClose, 
  onSave 
}: { 
  songUrl: string, 
  songName: string, 
  onClose: () => void, 
  onSave: () => void 
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null);
  const [region, setRegion] = useState<{start: number, end: number} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newName, setNewName] = useState(`trimmed_${songName}`);

  useEffect(() => {
    if (!(window as any).FFmpegWASM) {
      const script = document.createElement('script');
      script.src = '/ffmpeg/ffmpeg.js';
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#a855f7',
      progressColor: '#d946ef',
      url: songUrl,
      height: 100,
    });

    const regions = ws.registerPlugin(RegionsPlugin.create());

    ws.on('decode', () => {
      regions.addRegion({
        start: 0,
        end: Math.min(ws.getDuration(), 10),
        color: 'rgba(217, 70, 239, 0.3)',
      });
    });

    regions.on('region-updated', (r) => {
      setRegion({ start: r.start, end: r.end });
    });
    
    regions.on('region-created', (r) => {
      setRegion({ start: r.start, end: r.end });
    });

    setWavesurfer(ws);

    return () => {
      ws.destroy();
    };
  }, [songUrl]);

  const handleTrim = async () => {
    if (!region) return;
    setIsProcessing(true);
    try {
      const FFmpeg = (window as any).FFmpegWASM?.FFmpeg;
      
      if (!FFmpeg) {
        throw new Error("FFmpeg engine is still loading. Please wait a second and try again.");
      }

      // Custom fetchFile implementation to avoid buggy @ffmpeg/util UMD
      const fetchAudioFile = async (url: string) => {
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        return new Uint8Array(buf);
      };

      const ffmpeg = new FFmpeg();
      await ffmpeg.load({
         coreURL: "/ffmpeg/ffmpeg-core.js",
         wasmURL: "/ffmpeg/ffmpeg-core.wasm"
      });
      
      const fileName = songUrl.split('/').pop() || 'temp.mp3';
      await ffmpeg.writeFile(fileName, await fetchAudioFile(songUrl));
      
      const outName = `trimmed_${Date.now()}_${fileName}`;
      await ffmpeg.exec([
        '-i', fileName,
        '-ss', region.start.toString(),
        '-to', region.end.toString(),
        '-c', 'copy',
        outName
      ]);
      
      const fileData = await ffmpeg.readFile(outName);
      const data = new Uint8Array(fileData as ArrayBuffer);
      
      const blob = new Blob([data], { type: 'audio/mpeg' });
      const formData = new FormData();
      formData.append('file', blob, newName.endsWith('.mp3') || newName.endsWith('.wav') ? newName : newName + '.mp3');
      
      await fetch('/api/upload', { method: 'POST', body: formData });
      onSave();
      onClose();
    } catch (e: any) {
      console.error(e);
      alert(`Error trimming: ${e.message || e}`);
    }
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-800 p-6 rounded-2xl w-full max-w-2xl shadow-2xl border border-neutral-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold font-mono">Trim Audio</h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-700 rounded-full"><X size={20}/></button>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm text-neutral-400 mb-1">Save as:</label>
          <input 
            type="text" 
            value={newName} 
            onChange={(e) => setNewName(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white"
          />
        </div>

        <div className="bg-neutral-900 rounded-xl p-4 mb-6 border border-neutral-700">
          <div ref={containerRef} />
        </div>

        <div className="flex justify-between items-center">
          <button 
            onClick={() => wavesurfer?.playPause()}
            className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg font-semibold"
          >
            Play / Pause Selected
          </button>
          <button 
            onClick={handleTrim}
            disabled={isProcessing}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 rounded-lg font-bold disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Scissors size={20} />}
            {isProcessing ? 'Processing...' : 'Trim & Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
