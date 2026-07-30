import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { Search, Compass, Users, Rocket, User, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * ⌘K — an index card drawer.
 *
 * Mono entries on hairline rules, each card annotated with where it goes.
 * No glass, no glow: the selected card is the one with the blueprint edge.
 * The shortcut, the filtering and every navigation target are unchanged.
 */

// cmdk renders the group title into its own element, so the heading has to be
// styled through it rather than on the group wrapper.
const GROUP =
  'mb-0 [&_[cmdk-group-heading]]:border-b [&_[cmdk-group-heading]]:border-rule [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-graphite';

const ITEM =
  'group relative flex cursor-pointer items-center gap-3 border-b border-rule px-4 py-3 text-[13px] text-graphite transition-colors hover:text-ink aria-selected:bg-blueprint/[0.06] aria-selected:text-ink';

/** Blueprint edge on the selected card. */
function Edge() {
  return (
    <span
      className="absolute inset-y-0 left-0 w-0.5 scale-y-0 bg-blueprint transition-transform duration-200 group-aria-selected:scale-y-100"
      aria-hidden="true"
    />
  );
}

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
    <div className="fm-scope fixed inset-0 z-[999] flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]" onClick={() => setOpen(false)} />

      <Command
        className="relative w-full max-w-2xl overflow-hidden border border-ink bg-paper-raised font-sans shadow-2xl"
        shouldFilter={true}
        onKeyDown={(e) => {
          if (e.key === "Escape" || (e.key === "Backspace" && !e.currentTarget.value)) {
            e.preventDefault();
            setOpen(false);
          }
        }}
        loop={true}
      >
        <div className="flex items-center gap-2 border-b border-ink px-4">
          <Search size={16} className="shrink-0 text-graphite" />
          <Command.Input
            autoFocus
            placeholder="What do you need?"
            className="w-full border-none bg-transparent py-3.5 font-mono text-[15px] text-ink placeholder:text-graphite focus:outline-none focus:ring-0"
          />
          <button
            onClick={() => setOpen(false)}
            className="fm-label shrink-0 border border-ink/25 px-2 py-1 !text-[10px] text-graphite transition-colors hover:border-ink hover:text-ink"
          >
            Esc
          </button>
        </div>

        <Command.List className="custom-scrollbar pointer-events-auto max-h-[320px] overflow-y-auto">
          <Command.Empty className="fm-label block px-4 py-8 text-center text-graphite">
            No entry found
          </Command.Empty>

          <Command.Group heading="Navigation" className={GROUP}>
            <Command.Item
              value="Home"
              onSelect={() => runCommand(() => navigate('/'))}
              className={ITEM}
            >
              <Edge />
              <Rocket size={15} className="shrink-0" />
              <span className="flex-1 font-mono">Home</span>
              <span className="fm-label !text-[10px] text-graphite">/</span>
            </Command.Item>
            <Command.Item
              value="Discover Projects"
              onSelect={() => runCommand(() => navigate('/discover'))}
              className={ITEM}
            >
              <Edge />
              <Compass size={15} className="shrink-0" />
              <span className="flex-1 font-mono">Discover</span>
              <span className="fm-label !text-[10px] text-graphite">/discover</span>
            </Command.Item>
            <Command.Item
              value="Community"
              onSelect={() => runCommand(() => navigate('/community'))}
              className={ITEM}
            >
              <Edge />
              <Users size={15} className="shrink-0" />
              <span className="flex-1 font-mono">Community</span>
              <span className="fm-label !text-[10px] text-graphite">/community</span>
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Settings" className={GROUP}>
            <Command.Item
              value="Profile"
              onSelect={() => runCommand(() => navigate('/profile'))}
              className={ITEM}
            >
              <Edge />
              <User size={15} className="shrink-0" />
              <span className="flex-1 font-mono">Profile</span>
              <span className="fm-label !text-[10px] text-graphite">/profile</span>
            </Command.Item>
            <Command.Item
              value="Preferences"
              onSelect={() => runCommand(() => console.log('Preferences'))}
              className={ITEM}
            >
              <Edge />
              <Settings size={15} className="shrink-0" />
              <span className="flex-1 font-mono">Preferences</span>
              <span className="fm-label !text-[10px] text-graphite">—</span>
            </Command.Item>
          </Command.Group>
        </Command.List>

        <div className="flex items-center justify-between border-t border-ink px-4 py-2">
          <span className="fm-label !text-[10px] text-graphite">Uni-Verse — index</span>
          <span className="fm-label !text-[10px] text-graphite">↑↓ select · ⏎ open</span>
        </div>
      </Command>
    </div>
  );
};

export default CommandPalette;
