import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { Search, Compass, Users, Rocket, User, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = (command) => {
    setOpen(false);
    command();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh]">
      <Command 
        className="w-full max-w-2xl bg-[#111118] border border-white/10 rounded-xl shadow-2xl overflow-hidden font-sans"
        shouldFilter={true}
        onKeyDown={(e) => {
          if (e.key === "Escape" || (e.key === "Backspace" && !e.currentTarget.value)) {
            e.preventDefault();
            setOpen(false);
          }
        }}
        loop={true}
      >
        <div className="flex items-center border-b border-white/5 px-4">
          <Search className="w-5 h-5 text-slate-400 mr-2" />
          <Command.Input 
            autoFocus 
            placeholder="What do you need?" 
            className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-lg text-white py-4 placeholder:text-slate-500" 
          />
          <button onClick={() => setOpen(false)} className="text-xs text-slate-500 bg-white/5 px-2 py-1 rounded">ESC</button>
        </div>

        <Command.List className="max-h-[300px] overflow-y-auto p-2 pointer-events-auto custom-scrollbar">
          <Command.Empty className="py-6 text-center text-slate-400">No results found.</Command.Empty>

          <Command.Group heading="Navigation" className="text-xs font-semibold text-slate-500 mb-1 px-2 mt-2">
            <Command.Item 
              value="Home"
              onSelect={() => runCommand(() => navigate('/'))}
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer transition-colors aria-selected:bg-white/10 aria-selected:text-white"
            >
              <Rocket size={18} /> Home
            </Command.Item>
            <Command.Item 
              value="Discover Projects"
              onSelect={() => runCommand(() => navigate('/discover'))}
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer transition-colors aria-selected:bg-white/10 aria-selected:text-white"
            >
              <Compass size={18} /> Discover
            </Command.Item>
            <Command.Item 
              value="Community"
              onSelect={() => runCommand(() => navigate('/community'))}
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer transition-colors aria-selected:bg-white/10 aria-selected:text-white"
            >
              <Users size={18} /> Community
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Settings" className="text-xs font-semibold text-slate-500 mb-1 px-2 mt-4">
            <Command.Item 
              value="Profile"
              onSelect={() => runCommand(() => navigate('/profile'))}
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer transition-colors aria-selected:bg-white/10 aria-selected:text-white"
            >
              <User size={18} /> Profile
            </Command.Item>
            <Command.Item 
              value="Preferences"
              onSelect={() => runCommand(() => console.log('Preferences'))}
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer transition-colors aria-selected:bg-white/10 aria-selected:text-white"
            >
              <Settings size={18} /> Preferences
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
};

export default CommandPalette;
