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
      <header className="sticky top-0 z-50 border-b border-bg-muted bg-bg-nav/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-category-trans via-category-sluts to-category-twinks bg-clip-text text-transparent">
              GoooG
            </span>
            <span className="hidden md:inline-block text-xs font-semibold uppercase tracking-wider text-fg-muted px-2 py-0.5 rounded-badge bg-bg-muted border border-bg-hover">
              Character Guessing
            </span>
          </div>

          <nav className="flex items-center gap-0.5 sm:gap-2 overflow-x-auto flex-nowrap min-w-0">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `shrink-0 px-2.5 sm:px-3 py-1.5 text-sm font-medium rounded-button transition-colors duration-150 ${
                    isActive
                      ? 'bg-bg-hover text-fg shadow-sm'
                      : 'text-fg-muted hover:text-fg hover:bg-bg-muted'
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
