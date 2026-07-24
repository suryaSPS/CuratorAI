import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  CreditCard,
  BarChart3,
  Settings,
  HelpCircle,
  Plus,
  Orbit,
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
    <aside className="nav-rail">
      <div className="mb-9 flex items-center gap-3 px-2">
        <div className="brand-mark" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold tracking-[-.06em] leading-none text-ink">Curator</h2>
          {courseTitle && (
            <p
              className="mt-1 truncate font-mono text-[9px] uppercase tracking-[.08em] text-slate-500"
              title={courseTitle}
            >
              {courseTitle}
            </p>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-1" aria-label="Primary navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                `nav-link ${isActive ? 'active' : ''}`
              )
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-3 border-t border-line pt-5">
        <button
          onClick={() => navigate('/sessions')}
          className="button-primary w-full"
        >
          <Plus size={17} />
          Start studying
        </button>
        <NavLink
          to="/help"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Orbit size={18} />
          How it works
        </NavLink>
      </div>
    </aside>
  );
}
