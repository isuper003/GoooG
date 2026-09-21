import { useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';

interface NavItem {
  to: string;
  label: string;
}

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: NavItem[];
  dueCount: number;
  activeCount: number;
  onOpenRandom: () => void;
}

const NAV_ICONS: Record<string, string> = {
  '/': '✨',
  '/play': '⚔️',
  '/gallery': '🖼️',
  '/import': '📷',
  '/stats': '📊',
};

export default function MobileNavDrawer({
  isOpen,
  onClose,
  navItems,
  dueCount,
  activeCount,
  onOpenRandom,
}: MobileNavDrawerProps) {
  const location = useLocation();

  // Close drawer automatically on route change
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 w-[85%] max-w-sm h-full bg-[#090d14] border-l border-white/10 flex flex-col justify-between shadow-2xl p-6"
          >
            {/* Top Section */}
            <div className="flex flex-col gap-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white text-black flex items-center justify-center font-display font-black text-xs shadow-sm">
                    G
                  </div>
                  <div>
                    <span className="font-display text-lg font-bold text-white tracking-tight">GoooG</span>
                    <span className="block text-[10px] font-mono text-cyan-400 tracking-wider uppercase">
                      Studio Navigation
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close menu"
                  className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white border border-white/10 flex items-center justify-center text-sm transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Primary Train CTA */}
              <Link
                to="/play"
                onClick={onClose}
                className="w-full py-3 px-4 rounded-xl bg-cyan-400 hover:bg-white text-black font-semibold text-sm flex items-center justify-between transition-all shadow-lg shadow-cyan-400/20 active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">⚔️</span>
                  <span>Train Now in Arena</span>
                </div>
                {dueCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-black text-cyan-300 font-mono text-xs font-bold">
                    {dueCount} Due
                  </span>
                ) : (
                  <span>→</span>
                )}
              </Link>

              {/* Navigation Links List */}
              <nav className="flex flex-col gap-1.5 pt-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/40 px-2 pb-1">
                  Main Views
                </span>

                {navItems.map((item) => {
                  const icon = NAV_ICONS[item.to] || '•';

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                          isActive
                            ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 shadow-[0_0_12px_rgba(0,240,255,0.15)] font-bold'
                            : 'text-white/70 hover:text-white hover:bg-white/[0.05]'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <div className="flex items-center gap-3">
                            <span className="text-base">{icon}</span>
                            <span>{item.label}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {item.to === '/play' && dueCount > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 text-[11px] font-mono font-bold leading-none">
                                {dueCount}
                              </span>
                            )}
                            {isActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f0ff]" />
                            )}
                          </div>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            {/* Bottom Actions Section */}
            <div className="flex flex-col gap-3 pt-4 border-t border-white/[0.08]">
              {/* Random Showcase Trigger */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRandom();
                }}
                className="w-full py-2.5 px-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/80 hover:text-white border border-white/10 hover:border-cyan-400/30 font-mono text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">🎲</span>
                  <span>Random Showcase</span>
                </div>
                <span className="text-cyan-400 text-xs">Open →</span>
              </button>

              {/* Roster active indicator */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-black/40 border border-white/[0.06] text-[11px] font-mono text-white/60">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span>Roster Status</span>
                </span>
                <span className="font-bold text-white/80">{activeCount} Active</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
