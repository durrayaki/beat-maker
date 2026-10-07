"use client";

import { useState, useEffect } from 'react';
import { Play, Pause, Upload, Plus, Music, X, GripHorizontal, Scissors, Trash2, Edit2 } from 'lucide-react';
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

function SortableTile({ 
  tile, 
  onPlay, 
  onDelete, 
  isPlaying 
}: { 
  tile: Tile, 
  onPlay: (url: string) => void, 
  onDelete: () => void, 
  isPlaying: boolean 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: tile.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative w-32 h-32 rounded-xl flex flex-col items-center text-white shadow-lg transition-transform ${tile.color} ${isPlaying ? 'ring-4 ring-white animate-pulse' : ''}`}
    >
      {/* Top Bar: Drag Handle and Delete */}
      <div className="w-full flex justify-between items-center p-2 opacity-50 hover:opacity-100 transition-opacity">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 bg-black/30 rounded hover:bg-black/50">
          <GripHorizontal size={14} />
        </div>
        <button onClick={onDelete} className="p-1 bg-black/30 rounded hover:bg-red-500/80 transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Main Play Area */}
      <div 
        className="flex-1 w-full flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 rounded-b-xl"
        onClick={() => tile.songUrl && onPlay(tile.songUrl)}
      >
        {tile.songName ? (
          <>
            {isPlaying ? <Pause className="w-8 h-8 mb-2 opacity-90" /> : <Play className="w-8 h-8 mb-2 opacity-90" />}
            <span className="text-xs font-bold text-center px-2 truncate w-full pointer-events-none">{tile.songName}</span>
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
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  
  const [trimmerSong, setTrimmerSong] = useState<Song | null>(null);

  const fetchSongs = () => fetch('/api/songs').then(r => r.json()).then(data => setSongs(data.songs || []));
  
  useEffect(() => {
    fetchSongs();
    fetch('/api/config').then(r => r.json()).then(data => setTiles(data.tiles || []));
  }, []);

  const saveConfig = async (newTiles: Tile[]) => {
    setTiles(newTiles);
    await fetch('/api/config', {
      method: 'POST',
      body: JSON.stringify({ tiles: newTiles }),
    });
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
    }
    const newAudio = new Audio(url);
    newAudio.play();
    setAudio(newAudio);
    setPlayingUrl(url);
    newAudio.onended = () => setPlayingUrl(null);
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

  const deleteTile = (id: string) => {
    saveConfig(tiles.filter(t => t.id !== id));
  };

  const assignSongToTile = (tileId: string, song: Song) => {
    const newTiles = tiles.map(t => t.id === tileId ? { ...t, songUrl: song.url, songName: song.name } : t);
    saveConfig(newTiles);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    if (res.ok) {
      fetchSongs();
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-8 flex">
      {trimmerSong && (
        <AudioTrimmer 
          songUrl={trimmerSong.url} 
          songName={trimmerSong.name} 
          onClose={() => setTrimmerSong(null)} 
          onSave={fetchSongs} 
        />
      )}

      {/* Sidebar - Library */}
      <div className="w-80 bg-neutral-800 rounded-2xl p-4 flex flex-col gap-4 mr-8 shadow-xl">
        <h2 className="text-xl font-bold font-mono">Library</h2>
        
        <label className="flex items-center justify-center gap-2 bg-neutral-700 hover:bg-neutral-600 p-3 rounded-lg cursor-pointer transition-colors">
          <Upload size={18} />
          <span className="text-sm font-semibold">Upload Audio</span>
          <input type="file" className="hidden" accept="audio/*" onChange={handleUpload} />
        </label>

        <div className="flex-1 overflow-y-auto flex flex-col gap-2">
          {songs.map((song) => (
            <div key={song.url} className="bg-neutral-700 p-3 rounded-lg flex flex-col gap-2 group">
              <div className="flex items-center justify-between">
                <span className="text-sm truncate font-semibold w-32" title={song.name}>{song.name}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => playSong(song.url)} className="p-1 hover:bg-neutral-600 rounded text-neutral-300">
                    {playingUrl === song.url ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <button onClick={() => setTrimmerSong(song)} className="p-1 hover:bg-neutral-600 rounded text-neutral-300" title="Trim Audio">
                    <Scissors size={14} />
                  </button>
                </div>
              </div>
              <select 
                className="bg-neutral-800 text-xs p-1.5 rounded w-full border border-neutral-600"
                onChange={(e) => assignSongToTile(e.target.value, song)}
                defaultValue=""
              >
                <option value="" disabled>Assign to Tile...</option>
                {tiles.map((t, i) => <option key={t.id} value={t.id}>Tile {i+1} {t.songName ? `(${t.songName})` : ''}</option>)}
              </select>
            </div>
          ))}
          {songs.length === 0 && (
            <div className="text-center text-neutral-500 text-sm mt-4">No songs uploaded yet</div>
          )}
        </div>
      </div>

      {/* Main Area - Tiles */}
      <div className="flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500">
            DJ BEAT TILES
          </h1>
          <button onClick={addTile} className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-bold hover:scale-105 transition-transform shadow-lg">
            <Plus size={20} /> Add Tile
          </button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tiles} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {tiles.map((tile) => (
                <SortableTile 
                  key={tile.id} 
                  tile={tile} 
                  onPlay={playSong}
                  onDelete={() => deleteTile(tile.id)}
                  isPlaying={playingUrl === tile.songUrl} 
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
