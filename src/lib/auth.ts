export type Account = {
  id: string;
  username: string;
  email: string | null;
  plan: 'free' | 'student' | 'pro';
  creditBalance: number;
  privacyAcceptedAt: string | null;
  createdAt: string;
};

const SESSION_EVENT = 'curator-session-changed';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    ...options,
  });
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || 'Something went wrong. Please try again.');
  return body;
}

export async function getSession() {
  const response = await fetch('/api/auth/session', { credentials: 'same-origin' });
  if (!response.ok) return null;
  const body = await response.json() as { user: Account | null };
  return body.user;
}

export async function register(username: string, password: string) {
  const body = await request<{ user: Account }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  announceSessionChange();
  return body.user;
}

export async function signIn(username: string, password: string) {
  const body = await request<{ user: Account }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  announceSessionChange();
  return body.user;
}

export async function signInWithGoogle(credential: string) {
  const body = await request<{ user: Account }>('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  });
  announceSessionChange();
  return body.user;
}

export async function signOut() {
  const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
  if (!response.ok) throw new Error('Could not sign out. Please try again.');
  announceSessionChange();
}

export function subscribeToSession(listener: () => void) {
  window.addEventListener(SESSION_EVENT, listener);
  return () => window.removeEventListener(SESSION_EVENT, listener);
}

export function announceSessionChange() {
  window.dispatchEvent(new Event(SESSION_EVENT));
}
