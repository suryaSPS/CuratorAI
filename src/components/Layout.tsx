import { Home, Layers3, Sparkles, BarChart3, BookOpen } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const mobileItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/sessions', icon: Sparkles, label: 'Study' },
  { to: '/subjects', icon: Layers3, label: 'Subjects' },
  { to: '/flashcards', icon: BookOpen, label: 'Cards' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
];

export default function Layout() {
  return (
    <div className="app-background">
      <Sidebar />
      <main className="app-main min-h-screen">
        <TopBar />
        <Outlet />
      </main>
      <nav className="mobile-nav" aria-label="Primary navigation">
        {mobileItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} aria-label={label} end={to === '/'}>
            <Icon size={20} />
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
