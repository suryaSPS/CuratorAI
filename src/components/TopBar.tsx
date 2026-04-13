import { useEffect, useState } from 'react';
import { Search, Bell, Sparkles } from 'lucide-react';

export default function TopBar() {
  const [user, setUser] = useState<{ name: string; tier: string } | null>(null);

  useEffect(() => {
    fetch('/api/user')
      .then((res) => res.json())
      .then(setUser)
      .catch(() => setUser({ name: 'Learner', tier: 'Pro Member' }));
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
    <header className="fixed top-0 right-0 left-64 h-16 flex items-center justify-between px-8 z-40 bg-slate-50/70 backdrop-blur-xl border-b border-slate-200">
      <div className="flex items-center flex-1 max-w-xl">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search knowledge base..."
            className="w-full pl-10 pr-4 py-2 bg-surface-container-high border-none rounded-full text-sm focus:bg-white focus:ring-1 focus:ring-secondary transition-all outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button className="text-slate-500 hover:text-cyan-600 transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <button className="text-slate-500 hover:text-cyan-600 transition-colors">
          <Sparkles className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-primary leading-none">
              {user?.name ?? '...'}
            </p>
            <p className="text-[10px] text-slate-500 font-medium">{user?.tier ?? ''}</p>
          </div>
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm flex items-center justify-center bg-primary-container text-white font-bold text-sm select-none">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
