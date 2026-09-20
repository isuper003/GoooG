import { useState, useEffect } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { useCharacters } from './hooks/useCharacters';
import FullscreenButton from './components/ui/FullscreenButton';
import RandomShowcaseModal from './components/showcase/RandomShowcaseModal';

const navItems = [
  { to: '/', label: 'Spotlight' },
  { to: '/play', label: 'Arena' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/import', label: 'Photo Studio' },
  { to: '/stats', label: 'Stats' },
];

export default function App() {
  const { data: characters = [] } = useCharacters({});
  const activeCount = characters.filter((c) => c.isActive).length;
  const [isRandomOpen, setIsRandomOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsRandomOpen(true);
    window.addEventListener('open-random-showcase', handleOpen);
    return () => window.removeEventListener('open-random-showcase', handleOpen);
  }, []);

  return (
    <div className="min-h-screen bg-[#04060a] text-[#f5f7fb] flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Minimalist Studio Bar */}
      <header className="w-full border-b border-white/[0.08] bg-[#04060a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-6">
          
          {/* Brand & Mode Indicator */}
          <div className="flex items-center gap-3.5 shrink-0">
            <Link to="/" className="flex items-center gap-2 cursor-pointer group">
              <div className="w-6 h-6 rounded-md bg-white text-black flex items-center justify-center font-display font-black text-xs shadow-sm group-hover:bg-cyan-400 transition-colors">
                G
              </div>
              <span className="font-display text-lg font-bold tracking-tight text-white">GoooG</span>
            </Link>
            <div className="h-3.5 w-px bg-white/10 hidden sm:block"></div>
            <span className="text-[11px] font-mono tracking-widest text-cyan-400 uppercase hidden sm:block">
              Character Spotlight
            </span>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150 ${
                    isActive
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Active Performer Quick Action */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-white/70">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              <span>ROSTER: {activeCount || characters.length || 0} ACTIVE</span>
            </div>

            <button
              type="button"
              onClick={() => setIsRandomOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-white/80 hover:text-white border border-white/[0.1] hover:border-cyan-400/40 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              title="Inspect Random Characters"
            >
              <span>🎲</span>
              <span>Random</span>
            </button>

            <Link
              to="/play"
              className="px-3.5 py-1.5 rounded-lg bg-cyan-400 hover:bg-white text-black font-semibold text-xs transition-colors shadow-lg shadow-cyan-400/20"
            >
              Train Now →
            </Link>

            <FullscreenButton variant="header" />
          </div>

        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col">
        <Outlet />
      </main>

      {/* Floating Random Showcase Overlay */}
      <RandomShowcaseModal
        isOpen={isRandomOpen}
        onClose={() => setIsRandomOpen(false)}
      />
    </div>
  );
}

