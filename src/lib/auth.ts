export type SessionProvider = 'password' | 'google';

export type LocalSession = {
  username: string;
  provider: SessionProvider;
  startedAt: string;
};

const SESSION_KEY = 'curator-local-session';
const SESSION_EVENT = 'curator-session-changed';

export function getLocalSession(): LocalSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.sessionStorage.getItem(SESSION_KEY);
    if (!value) return null;
    const session = JSON.parse(value) as LocalSession;
    return typeof session.username === 'string' && typeof session.provider === 'string' && typeof session.startedAt === 'string'
      ? session
      : null;
  } catch {
    return null;
  }
}

export function startLocalSession(username: string, provider: SessionProvider) {
  const session: LocalSession = { username: username.trim(), provider, startedAt: new Date().toISOString() };
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(SESSION_EVENT));
  return session;
}

export function subscribeToSession(listener: () => void) {
  window.addEventListener(SESSION_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(SESSION_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}
