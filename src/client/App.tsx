import { Outlet, NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/play', label: 'Play' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/stats', label: 'Stats' },
  { to: '/import', label: 'Import' },
];

export default function App() {
  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col">
      <header className="sticky top-0 z-50 border-b border-bg-muted bg-bg-nav/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="font-display text-2xl font-semibold tracking-tight text-fg">
              GoooG
            </span>
            <span className="hidden md:inline-flex items-center border-l-2 border-accent pl-2 font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-fg-dim">
              Case File Archive
            </span>
          </div>

          <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto flex-nowrap min-w-0">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `shrink-0 px-2.5 sm:px-3 py-1.5 border-b-2 text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? 'border-accent text-fg'
                      : 'border-transparent text-fg-muted hover:text-fg hover:border-bg-hover'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
