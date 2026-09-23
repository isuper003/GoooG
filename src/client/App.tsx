import { useState, useEffect } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { useCharacters } from './hooks/useCharacters';
import { useReviewQueues } from './hooks/useReview';
import FullscreenButton from './components/ui/FullscreenButton';
import RandomShowcaseModal from './components/showcase/RandomShowcaseModal';
import MobileNavDrawer from './components/ui/MobileNavDrawer';
import { usePWAInstall } from './hooks/usePWAInstall';
import PWAInstallModal from './components/pwa/PWAInstallModal';

const navItems = [
  { to: '/', label: 'Spotlight' },
  { to: '/play', label: 'Arena' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/player', label: 'Player 🎬' },
  { to: '/import', label: 'Photo Studio' },
  { to: '/stats', label: 'Stats' },
  { to: '/data18', label: 'Data18 🎬' },
];

export default function App() {
  const { data: characters = [] } = useCharacters({});
  const { data: reviewQueues } = useReviewQueues();
  const activeCount = characters.filter((c) => c.isActive).length;
  const dueCount = reviewQueues?.due?.count ?? 0;
  const [isRandomOpen, setIsRandomOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isGuideOpen,
    setIsGuideOpen,
    promptInstall,
  } = usePWAInstall();

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

          {/* Navigation Tabs (Desktop only - hidden on mobile) */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-1.5 py-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                target={item.to === '/player' ? '_blank' : undefined}
                rel={item.to === '/player' ? 'noopener noreferrer' : undefined}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150 ${
                    isActive
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                  }`
                }
              >
                <>
                  {item.label}
                  {item.to === '/play' && dueCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 text-[10px] font-mono font-bold leading-none">
                      {dueCount}
                    </span>
                  )}
                </>
              </NavLink>
            ))}
          </nav>

          {/* Active Performer Quick Action */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Random Showcase Icon Button */}
            <button
              type="button"
              onClick={() => setIsRandomOpen(true)}
              className="hidden sm:flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-white/80 hover:text-white border border-white/[0.1] hover:border-cyan-400/40 text-sm transition-all cursor-pointer shadow-sm active:scale-95"
              title="Inspect Random Characters"
              aria-label="Inspect Random Characters"
            >
              <span>🎲</span>
            </button>

            {/* PWA Install Header Icon Button */}
            {!isInstalled && (isInstallable || isIOS) && (
              <button
                type="button"
                onClick={() => {
                  if (isInstallable && !isIOS) {
                    promptInstall();
                  } else {
                    setIsGuideOpen(true);
                  }
                }}
                className="hidden sm:flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 hover:border-cyan-400/50 text-sm transition-all cursor-pointer shadow-sm active:scale-95"
                title="Install GoooG as Web App"
                aria-label="Install GoooG as Web App"
              >
                <span>📲</span>
              </button>
            )}

            {/* Desktop: Train Now Button */}
            <Link
              to="/play"
              className="hidden md:inline-flex px-3.5 py-1.5 rounded-lg bg-cyan-400 hover:bg-white text-black font-semibold text-xs transition-colors shadow-lg shadow-cyan-400/20"
            >
              Train Now →
            </Link>

            {/* Mobile: Drawer Trigger Button (Replaces Train Now on mobile) */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="md:hidden flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg border border-white/10 hover:border-cyan-400/40 bg-white/[0.04] hover:bg-white/[0.1] text-white/80 hover:text-white transition-all cursor-pointer active:scale-95"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>

            <FullscreenButton variant="header" />
          </div>

        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col">
        <Outlet />
      </main>

      {/* Mobile Navigation Drawer */}
      <MobileNavDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        navItems={navItems}
        dueCount={dueCount}
        activeCount={activeCount}
        onOpenRandom={() => setIsRandomOpen(true)}
        onOpenInstall={() => setIsGuideOpen(true)}
        isInstalled={isInstalled}
      />

      {/* Floating Random Showcase Overlay */}
      <RandomShowcaseModal
        isOpen={isRandomOpen}
        onClose={() => setIsRandomOpen(false)}
      />

      {/* PWA Installation & Guidance Modal */}
      <PWAInstallModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onInstall={promptInstall}
        isIOS={isIOS}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
      />
    </div>
  );
}

