import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const savedTheme = window.localStorage.getItem('curator-theme');
    return savedTheme ? savedTheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    window.localStorage.setItem('curator-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <button
      className="icon-button"
      onClick={() => setIsDark((value) => !value)}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
