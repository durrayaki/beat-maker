"use client";

import { useState, useEffect } from 'react';
import { Play, Pause, Upload, Plus, X, GripHorizontal, Scissors, Edit2, Check, LayoutGrid, List as ListIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AudioTrimmer from './AudioTrimmer';

type Song = {
  name: string;
  url: string;
};

type Tile = {
  id: string;
  songUrl: string | null;
  songName: string | null;
  color: string;
};

const COLORS = ['bg-pink-500', 'bg-purple-500', 'bg-indigo-500', 'bg-blue-500', 'bg-teal-500', 'bg-emerald-500', 'bg-orange-500', 'bg-red-500'];

const formatTime = (time: number) => {
  if (isNaN(time)) return "0:00";
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

function SortableTile({ 
  tile, onPlay, onDelete, isPlaying, viewMode, currentTime, duration 
}: { 
  tile: Tile, onPlay: (url: string) => void, onDelete: () => void, isPlaying: boolean, viewMode: 'grid' | 'list', currentTime: number, duration: number 
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: tile.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (viewMode === 'list') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`w-full h-16 rounded-xl flex items-center px-4 text-white shadow-lg transition-transform ${tile.color} ${isPlaying ? 'ring-4 ring-white animate-pulse' : ''}`}
      >
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-2 mr-2 bg-black/20 rounded hover:bg-black/40">
          <GripHorizontal size={16} />
        </div>
        
        <button 
          onClick={() => tile.songUrl && onPlay(tile.songUrl)}
          className="p-3 bg-black/20 hover:bg-black/40 rounded-full mr-4 transition-colors"
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>

        <div className="flex-1 truncate font-bold text-lg">
          {tile.songName || "Empty Tile"}
        </div>

        {isPlaying && (
          <div className="font-mono font-semibold mx-4 bg-black/30 px-3 py-1 rounded">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        )}

        <button onClick={onDelete} className="p-2 ml-4 bg-black/20 rounded hover:bg-red-500/80 transition-colors">
          <X size={18} />
        </button>
      </div>
    );
  }

  // Grid view
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative w-full aspect-square rounded-xl flex flex-col items-center text-white shadow-lg transition-transform ${tile.color} ${isPlaying ? 'ring-4 ring-white animate-pulse' : ''}`}
    >
      <div className="w-full flex justify-between items-center p-2 opacity-50 hover:opacity-100 transition-opacity">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1.5 bg-black/30 rounded hover:bg-black/50">
          <GripHorizontal size={14} />
        </div>
        <button onClick={onDelete} className="p-1.5 bg-black/30 rounded hover:bg-red-500/80 transition-colors">
          <X size={14} />
        </button>
      </div>

      <div 
        className="flex-1 w-full flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 rounded-b-xl px-2 pb-2"
        onClick={() => tile.songUrl && onPlay(tile.songUrl)}
      >
        {tile.songName ? (
          <>
            {isPlaying ? <Pause className="w-8 h-8 mb-2 opacity-90" /> : <Play className="w-8 h-8 mb-2 opacity-90" />}
            <span className="text-xs font-bold text-center truncate w-full pointer-events-none">{tile.songName}</span>
            {isPlaying && (
              <span className="text-[10px] font-mono mt-1 opacity-80">{formatTime(currentTime)}</span>
            )}
          </>
        ) : (
          <span className="text-xs font-bold opacity-50 pointer-events-none mb-4">Empty</span>
        )}
      </div>
    </div>
  );
}

export default function DJApp() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [tiles, setTiles] = useState<Tile[]>([]);
  
  // Audio state
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // UI state
  const [trimmerSong, setTrimmerSong] = useState<Song | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Rename state
  const [renamingUrl, setRenamingUrl] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");

  const fetchSongs = () => fetch('/api/songs').then(r => r.json()).then(data => setSongs(data.songs || []));
  
  useEffect(() => {
    fetchSongs();
    fetch('/api/config').then(r => r.json()).then(data => setTiles(data.tiles || []));
  }, []);

  const saveConfig = async (newTiles: Tile[]) => {
    setTiles(newTiles);
    await fetch('/api/config', { method: 'POST', body: JSON.stringify({ tiles: newTiles }) });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = tiles.findIndex((t) => t.id === active.id);
      const newIndex = tiles.findIndex((t) => t.id === over.id);
      saveConfig(arrayMove(tiles, oldIndex, newIndex));
    }
  };

  const playSong = (url: string) => {
    if (audio) {
      audio.pause();
      if (playingUrl === url) {
        setPlayingUrl(null);
        setAudio(null);
        return;
      }
      audio.currentTime = 0;
      audio.onended = null;
      audio.ontimeupdate = null;
      audio.onloadedmetadata = null;
    }
    
    const newAudio = new Audio(url);
    newAudio.play();
    setAudio(newAudio);
    setPlayingUrl(url);
    
    newAudio.onloadedmetadata = () => setDuration(newAudio.duration);
    newAudio.ontimeupdate = () => setCurrentTime(newAudio.currentTime);
    newAudio.onended = () => {
      setPlayingUrl(null);
      setCurrentTime(0);
    };
  };

  const addTile = () => {
    const newTile: Tile = {
      id: `tile-${Date.now()}`,
      songUrl: null,
      songName: null,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    };
    saveConfig([...tiles, newTile]);
  };

  const deleteTile = (id: string) => saveConfig(tiles.filter(t => t.id !== id));
  const assignSongToTile = (tileId: string, song: Song) => saveConfig(tiles.map(t => t.id === tileId ? { ...t, songUrl: song.url, songName: song.name } : t));

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    if (res.ok) fetchSongs();
  };

  const submitRename = async (song: Song) => {
    if (!renameInput.trim() || renameInput === song.name) {
      setRenamingUrl(null);
      return;
    }
    
    const res = await fetch('/api/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName: song.name, newName: renameInput })
    });
    
    if (res.ok) {
      const data = await res.json();
      // Update tiles config to point to new url
      const updatedTiles = tiles.map(t => t.songUrl === song.url ? { ...t, songUrl: data.newUrl, songName: data.newName } : t);
      await saveConfig(updatedTiles);
      await fetchSongs();
    } else {
      alert("Failed to rename file.");
    }
    setRenamingUrl(null);
  };

  return (
    <div className="h-screen bg-neutral-900 text-white flex overflow-hidden">
      {trimmerSong && (
        <AudioTrimmer songUrl={trimmerSong.url} songName={trimmerSong.name} onClose={() => setTrimmerSong(null)} onSave={fetchSongs} />
      )}

      {/* Sidebar - Library */}
      <div className={`${isLibraryOpen ? 'w-80' : 'w-16'} transition-all duration-300 bg-neutral-800 flex flex-col shadow-2xl relative z-10 border-r border-neutral-700`}>
        <div className="p-4 flex justify-between items-center border-b border-neutral-700">
          {isLibraryOpen && <h2 className="text-xl font-bold font-mono">Library</h2>}
          <button onClick={() => setIsLibraryOpen(!isLibraryOpen)} className="p-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg mx-auto">
            {isLibraryOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
        
        {isLibraryOpen && (
          <div className="p-4 flex flex-col h-full overflow-hidden">
            <label className="flex items-center justify-center gap-2 bg-neutral-700 hover:bg-neutral-600 p-3 rounded-lg cursor-pointer transition-colors mb-4 shrink-0">
              <Upload size={18} />
              <span className="text-sm font-semibold">Upload Audio</span>
              <input type="file" className="hidden" accept="audio/*" onChange={handleUpload} />
            </label>

            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
              {songs.map((song) => (
                <div key={song.url} className="bg-neutral-700 p-3 rounded-lg flex flex-col gap-2 group">
                  <div className="flex items-center justify-between">
                    {renamingUrl === song.url ? (
                      <div className="flex items-center w-full gap-2">
                        <input 
                          type="text" 
                          value={renameInput} 
                          onChange={(e) => setRenameInput(e.target.value)}
                          className="w-full bg-neutral-800 text-sm px-2 py-1 rounded text-white"
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && submitRename(song)}
                        />
                        <button onClick={() => submitRename(song)} className="text-green-400 hover:text-green-300"><Check size={16}/></button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm truncate font-semibold w-32" title={song.name}>{song.name}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => playSong(song.url)} className="p-1 hover:bg-neutral-600 rounded text-neutral-300">
                            {playingUrl === song.url ? <Pause size={14} /> : <Play size={14} />}
                          </button>
                          <button onClick={() => { setRenamingUrl(song.url); setRenameInput(song.name); }} className="p-1 hover:bg-neutral-600 rounded text-neutral-300" title="Rename">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => setTrimmerSong(song)} className="p-1 hover:bg-neutral-600 rounded text-neutral-300" title="Trim Audio">
                            <Scissors size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  {renamingUrl !== song.url && (
                    <select 
                      className="bg-neutral-800 text-xs p-1.5 rounded w-full border border-neutral-600 outline-none"
                      onChange={(e) => assignSongToTile(e.target.value, song)}
                      value=""
                    >
                      <option value="" disabled>Assign to Tile...</option>
                      {tiles.map((t, i) => <option key={t.id} value={t.id}>Tile {i+1} {t.songName ? `(${t.songName})` : ''}</option>)}
                    </select>
                  )}
                </div>
              ))}
              {songs.length === 0 && <div className="text-center text-neutral-500 text-sm mt-4">No songs uploaded</div>}
            </div>
          </div>
        )}
      </div>

      {/* Main Area - Tiles */}
      <div className="flex-1 flex flex-col p-8 overflow-y-auto h-full">
        <div className="flex justify-between items-center mb-8 bg-neutral-800/50 p-4 rounded-2xl sticky top-0 z-10 backdrop-blur-md border border-neutral-700/50">
          <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500">
            DJ BEAT TILES
          </h1>
          
          <div className="flex items-center gap-4">
            <div className="flex bg-neutral-800 rounded-lg p-1 border border-neutral-700">
              <button 
                onClick={() => setViewMode('grid')} 
                className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'}`}
                title="Grid View"
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('list')} 
                className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'}`}
                title="List View"
              >
                <ListIcon size={18} />
              </button>
            </div>

            <button onClick={addTile} className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-full font-bold hover:scale-105 transition-transform shadow-lg">
              <Plus size={18} /> Add Tile
            </button>
          </div>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tiles} strategy={viewMode === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}>
            <div className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6" : "flex flex-col gap-4 max-w-4xl mx-auto w-full"}>
              {tiles.map((tile) => (
                <SortableTile 
                  key={tile.id} 
                  tile={tile} 
                  onPlay={playSong}
                  onDelete={() => deleteTile(tile.id)}
                  isPlaying={playingUrl === tile.songUrl} 
                  viewMode={viewMode}
                  currentTime={playingUrl === tile.songUrl ? currentTime : 0}
                  duration={playingUrl === tile.songUrl ? duration : 0}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
