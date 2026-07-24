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
import { getLocalSession, subscribeToSession } from './lib/auth';

function SessionGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [session, setSession] = useState(getLocalSession);

  useEffect(() => subscribeToSession(() => setSession(getLocalSession())), []);

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
