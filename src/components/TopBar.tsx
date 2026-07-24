import { useEffect, useState } from 'react';
import { Bell, Command, Search, Sparkles } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function TopBar() {
  const [user, setUser] = useState<{ name: string | null } | null>(null);

  useEffect(() => {
    fetch('/api/user')
      .then((res) => res.json())
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  return (
    <header className="topbar">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="brand-mark lg:hidden" aria-hidden="true" />
        <label className="search-field" aria-label="Search your knowledge base">
          <Search size={17} />
          <input
            type="text"
            placeholder="Search your material"
          />
          <span className="hidden rounded border border-line px-1.5 py-0.5 font-mono text-[9px] sm:inline">⌘ K</span>
        </label>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button className="icon-button" aria-label="Open command menu">
          <Command size={17} />
        </button>
        <button className="icon-button" aria-label="View notifications">
          <Bell size={17} />
        </button>
        <div className="ml-1 flex items-center gap-2 border-l border-line pl-3">
          {user?.name && (
            <div className="hidden text-right sm:block">
              <p className="text-sm font-extrabold text-ink leading-none">{user.name}</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-slate-500">Learning space</p>
            </div>
          )}
          <div className="grid h-10 w-10 place-items-center rounded-full border border-ink/10 bg-sun font-display font-bold text-ink shadow-sm select-none" aria-label={user?.name ?? 'User'}>
            {user?.name ? initials : <Sparkles size={16} />}
          </div>
        </div>
      </div>
    </header>
  );
}
