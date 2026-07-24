import { type ReactNode, useEffect, useState } from 'react';
import { BrowserRouter as Router, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import StudySession from './pages/StudySession';
import Landing from './pages/Landing';
import Subjects from './pages/Subjects';
import Flashcards from './pages/Flashcards';
import Settings from './pages/Settings';
import Help from './pages/Help';
import Auth from './pages/Auth';
import { getSession, subscribeToSession } from './lib/auth';

function SessionGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [session, setSession] = useState<undefined | null | Awaited<ReturnType<typeof getSession>>>(undefined);

  useEffect(() => {
    let current = true;
    const refresh = () => { getSession().then((user) => { if (current) setSession(user); }); };
    refresh();
    const unsubscribe = subscribeToSession(refresh);
    return () => { current = false; unsubscribe(); };
  }, []);

  if (session === undefined) return <main className="app-background grid min-h-screen place-items-center"><div className="flex items-center gap-3 rounded-full border border-line bg-paper/85 px-5 py-3 font-mono text-[10px] uppercase tracking-[.13em] text-slate-500"><i className="h-2 w-2 animate-pulse rounded-full bg-mint" />Opening your workspace</div></main>;
  if (session) return <>{children}</>;
  const next = `${location.pathname}${location.search}${location.hash}`;
  return <Navigate to={`/auth?next=${encodeURIComponent(next)}`} replace />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/landing" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<SessionGate><Layout /></SessionGate>}>
          <Route index element={<Dashboard />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="sessions" element={<StudySession />} />
          <Route path="subjects" element={<Subjects />} />
          <Route path="flashcards" element={<Flashcards />} />
          <Route path="settings" element={<Settings />} />
          <Route path="help" element={<Help />} />
        </Route>
      </Routes>
    </Router>
  );
}
