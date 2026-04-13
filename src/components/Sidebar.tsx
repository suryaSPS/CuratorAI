import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  CreditCard,
  BarChart3,
  Settings,
  HelpCircle,
  PlusCircle,
  Sparkles,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/src/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: BookOpen, label: 'Study Sessions', path: '/sessions' },
  { icon: Layers, label: 'Subjects', path: '/subjects' },
  { icon: CreditCard, label: 'Flashcards', path: '/flashcards' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const [courseTitle, setCourseTitle] = useState<string | null>(null);

  const fetchCourse = () => {
    fetch('/api/context')
      .then((res) => res.json())
      .then((data) => {
        setCourseTitle(data.course?.title ?? null);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchCourse();
    // Re-fetch when a PDF is uploaded (Dashboard fires this event)
    window.addEventListener('course-updated', fetchCourse);
    return () => window.removeEventListener('course-updated', fetchCourse);
  }, []);

  return (
    <aside className="fixed left-0 top-0 h-full w-64 z-50 bg-slate-100 flex flex-col py-8 px-4 gap-y-4 border-r border-slate-200">
      <div className="mb-8 px-2 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center overflow-hidden">
          <Sparkles className="text-secondary-container w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-black text-primary tracking-tighter leading-none">Curator AI</h2>
          <p
            className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 truncate max-w-[130px]"
            title={courseTitle ?? undefined}
          >
            {courseTitle ?? 'No active course'}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ease-out font-headline text-sm tracking-wide uppercase font-bold',
                isActive
                  ? 'text-cyan-700 border-r-4 border-cyan-600 bg-white/50'
                  : 'text-slate-500 hover:text-cyan-600 hover:pl-6'
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-6 space-y-4">
        <button
          onClick={() => navigate('/sessions')}
          className="w-full bg-primary-container text-white py-3 rounded-xl font-bold text-sm tracking-wider uppercase shadow-lg shadow-primary-container/20 flex items-center justify-center gap-2 hover:scale-[0.98] transition-transform"
        >
          <PlusCircle className="w-4 h-4" />
          New Session
        </button>
        <NavLink
          to="/help"
          className="flex items-center gap-3 px-4 py-3 text-slate-500 font-headline text-sm tracking-wide uppercase font-bold hover:text-cyan-600 transition-all"
        >
          <HelpCircle className="w-5 h-5" />
          Help Center
        </NavLink>
      </div>
    </aside>
  );
}
