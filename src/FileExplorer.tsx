import React, { useState, useEffect } from 'react';
import { 
  Folder, FolderOpen, Music, ChevronRight, ChevronDown, 
  RefreshCw, HardDrive, CheckCircle2, Cloud, CloudOff 
} from 'lucide-react';

export interface AudioFile {
  id: string;
  name: string;
  size: string;
  duration?: string;
  status: 'raw' | 'processing' | 'split_ready';
  stems?: string[];
  stemUrls?: Record<string, string>;
  url?: string;
  path?: string;
}

export interface FolderNode {
  id: string;
  name: string;
  type: 'inbox' | 'splits' | 'clips' | 'custom';
  files: AudioFile[];
}

interface FileExplorerProps {
  onSelectSong: (file: AudioFile, folderName: string) => void;
  selectedSongId: string | null;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  onSelectSong,
  selectedSongId
}) => {
  const [folders, setFolders] = useState<FolderNode[]>([
    {
      id: 'f1',
      name: '00_Inbox_New_Songs',
      type: 'inbox',
      files: [
        { id: 's1', name: 'Golden_Hour_Acoustic.mp3', size: '8.4 MB', duration: '3:29', status: 'raw' },
        { id: 's2', name: 'Night_Drive_Synthwave.wav', size: '34.1 MB', duration: '2:45', status: 'raw' }
      ]
    },
    {
      id: 'f2',
      name: '01_Vocal_Stem_Splits',
      type: 'splits',
      files: [
        { 
          id: 's3', 
          name: 'Midnight_Echoes_Demo.wav', 
          size: '42.0 MB', 
          duration: '3:15', 
          status: 'split_ready', 
          stems: ['vocals.wav', 'instrumental.wav'] 
        }
      ]
    },
    {
      id: 'f3',
      name: '02_Instrument_Samples',
      type: 'clips',
      files: [
        { id: 's4', name: 'Guitar_Riff_Take1.wav', size: '2.1 MB', duration: '0:08', status: 'raw' }
      ]
    }
  ]);

  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    '00_Inbox_New_Songs': true,
    '01_Vocal_Stem_Splits': true,
    '02_Instrument_Samples': true,
    'f1': true,
    'f2': true,
    'f3': true
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);

  // Fetch real directory files from Python backend
  const fetchLiveDirectory = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/files');
      if (res.ok) {
        const data = await res.json();
        if (data && data.folders) {
          setFolders(data.folders);
          setBackendConnected(true);
        }
      } else {
        setBackendConnected(false);
      }
    } catch {
      setBackendConnected(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveDirectory();
  }, []);

  const toggleFolder = (folderId: string) => {
    setOpenFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  return (
    <aside className="w-72 bg-[#12151e] border-r border-slate-800 flex flex-col h-full select-none shrink-0">
      {/* Directory Title Bar */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-[#151924]">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-cyan-400" />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-200">Main Directory</span>
            <div className="flex items-center gap-1 text-[10px]">
              {backendConnected ? (
                <span className="text-emerald-400 font-mono flex items-center gap-1">
                  <Cloud className="w-3 h-3 text-emerald-400" /> Live PC Sync
                </span>
              ) : (
                <span className="text-slate-500 font-mono flex items-center gap-1">
                  <CloudOff className="w-3 h-3 text-slate-500" /> Demo Mode
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={fetchLiveDirectory}
          className={`p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition cursor-pointer ${
            isRefreshing ? 'animate-spin text-cyan-400' : ''
          }`}
          title="Refresh Directory from Disk"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Directory Tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {folders.map(folder => {
          const isOpen = !!openFolders[folder.id];

          return (
            <div key={folder.id} className="space-y-0.5">
              <button
                onClick={() => toggleFolder(folder.id)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-[#1c2130] text-slate-300 transition text-xs font-semibold cursor-pointer text-left"
              >
                {isOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                )}
                {isOpen ? (
                  <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span className="truncate flex-1 font-mono text-[11px] text-slate-200">{folder.name}</span>
                <span className="text-[10px] text-slate-500 font-mono bg-slate-800/80 px-1.5 py-0.2 rounded">
                  {folder.files.length}
                </span>
              </button>

              {isOpen && (
                <div className="pl-6 pr-1 space-y-1 pt-0.5">
                  {folder.files.length === 0 ? (
                    <div className="text-[10px] text-slate-500 italic py-1 pl-2">Folder empty</div>
                  ) : (
                    folder.files.map(file => {
                      const isSelected = selectedSongId === file.id;

                      return (
                        <div
                          key={file.id}
                          onClick={() => onSelectSong(file, folder.name)}
                          className={`flex flex-col p-2 rounded-lg border transition cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-500/10 border-cyan-500/50 shadow-sm'
                              : 'bg-[#171b26] border-slate-800/80 hover:border-slate-700 hover:bg-[#1d2231]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 truncate">
                              <Music className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                              <span className="text-xs font-medium text-slate-200 truncate">{file.name}</span>
                            </div>
                            {file.status === 'split_ready' && (
                              <span title="Stems Available">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 font-mono pl-5">
                            <span>{file.duration || '--:--'}</span>
                            <span>{file.size}</span>
                          </div>

                          {file.stems && file.stems.length > 0 && (
                            <div className="flex items-center gap-1 mt-1.5 pl-5">
                              {file.stems.map((stem, i) => (
                                <span key={i} className="text-[9px] bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded font-mono">
                                  {stem.replace('.wav', '')}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Storage Footer */}
      <div className="p-3 border-t border-slate-800 bg-[#151924] text-xs">
        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
          Google Drive Synced
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div className="bg-cyan-500 h-full w-1/3 rounded-full"></div>
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
          <span>{backendConnected ? 'Connected to Disk' : 'Local Drive Ready'}</span>
          <span>Auto-Updating</span>
        </div>
      </div>
    </aside>
  );
};