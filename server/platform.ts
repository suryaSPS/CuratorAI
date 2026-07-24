import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export type StudyEventType =
  | 'message_sent'
  | 'concept_extracted'
  | 'pdf_uploaded'
  | 'flashcard_created'
  | 'session_started';

export type UsageFeature = 'course_build' | 'tutor_chat';
export type ModelQuality = 'standard' | 'deep';
export type ModelRoute = { model: 'gemini-2.5-flash' | 'gemini-2.5-pro'; quality: ModelQuality };

type UserRow = {
  id: string;
  username: string;
  email: string | null;
  password_hash: string | null;
  google_sub: string | null;
  plan: 'free' | 'student' | 'pro';
  credit_balance: number;
  privacy_accepted_at: string | null;
  current_course_id: number | null;
  created_at: string;
};

export type CurrentUser = {
  id: string;
  username: string;
  email: string | null;
  plan: 'free' | 'student' | 'pro';
  creditBalance: number;
  privacyAcceptedAt: string | null;
  createdAt: string;
};

export type Flashcard = {
  id: number;
  tag: string;
  q: string;
  a: string;
  mastery: number;
  reviewCount: number;
  courseId?: number;
  source: 'ai_chat' | 'pdf' | 'manual';
};

export type Course = {
  id: number;
  title: string;
  outline: Array<{ title: string; description: string; status: string }>;
  createdAt: string;
  lastActiveAt: string;
  messageCount: number;
};

export const DATA_DIR = path.resolve(process.env.CURATOR_DATA_DIR || path.join(process.cwd(), '.data'));
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

export const db = new Database(path.join(DATA_DIR, 'curator.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL COLLATE NOCASE UNIQUE,
    email TEXT COLLATE NOCASE UNIQUE,
    password_hash TEXT,
    google_sub TEXT UNIQUE,
    plan TEXT NOT NULL DEFAULT 'free',
    credit_balance INTEGER NOT NULL DEFAULT 0,
    privacy_accepted_at TEXT,
    current_course_id INTEGER,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    session_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_name TEXT NOT NULL,
    storage_key TEXT NOT NULL UNIQUE,
    mime_type TEXT NOT NULL,
    byte_size INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_id TEXT REFERENCES files(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    outline_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_active_at TEXT NOT NULL,
    message_count INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS flashcards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
    tag TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    mastery INTEGER NOT NULL DEFAULT 0,
    review_count INTEGER NOT NULL DEFAULT 0,
    source TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS study_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS usage_ledger (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature TEXT NOT NULL,
    model TEXT NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    cached_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd REAL NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS payment_orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_order_id TEXT NOT NULL UNIQUE,
    pack_id TEXT NOT NULL,
    credits INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'created',
    created_at TEXT NOT NULL,
    fulfilled_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_courses_user ON courses(user_id, last_active_at DESC);
  CREATE INDEX IF NOT EXISTS idx_cards_user ON flashcards(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_events_user ON study_events(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_ledger(user_id, created_at DESC);
`);

function now() {
  return new Date().toISOString();
}

function toUser(row: UserRow): CurrentUser {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    plan: row.plan,
    creditBalance: row.credit_balance,
    privacyAcceptedAt: row.privacy_accepted_at,
    createdAt: row.created_at,
  };
}

function toCourse(row: Record<string, unknown>): Course {
  let outline: Course['outline'] = [];
  try { outline = JSON.parse(String(row.outline_json)); } catch { outline = []; }
  return {
    id: Number(row.id),
    title: String(row.title),
    outline,
    createdAt: String(row.created_at),
    lastActiveAt: String(row.last_active_at),
    messageCount: Number(row.message_count),
  };
}

function toFlashcard(row: Record<string, unknown>): Flashcard {
  const courseId = row.course_id === null || row.course_id === undefined ? undefined : Number(row.course_id);
  return {
    id: Number(row.id),
    tag: String(row.tag),
    q: String(row.question),
    a: String(row.answer),
    mastery: Number(row.mastery),
    reviewCount: Number(row.review_count),
    ...(courseId ? { courseId } : {}),
    source: row.source as Flashcard['source'],
  };
}

export function getUserById(id: string) {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  return row ? toUser(row) : null;
}

export function getUserByUsername(username: string) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim()) as UserRow | undefined;
}

export function getUserByGoogleSub(googleSub: string) {
  return db.prepare('SELECT * FROM users WHERE google_sub = ?').get(googleSub) as UserRow | undefined;
}

export function getUserByEmail(email: string) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim()) as UserRow | undefined;
}

export function createPasswordUser({ username, passwordHash }: { username: string; passwordHash: string }) {
  const id = randomUUID();
  db.prepare('INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)').run(id, username.trim(), passwordHash, now());
  return getUserById(id)!;
}

function uniqueGoogleUsername(seed: string) {
  const base = seed.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24) || 'learner';
  let candidate = base;
  let suffix = 1;
  while (getUserByUsername(candidate)) candidate = `${base.slice(0, 20)}-${suffix++}`;
  return candidate;
}

export function upsertGoogleUser({ sub, email, name }: { sub: string; email: string; name: string }) {
  const existing = getUserByGoogleSub(sub);
  if (existing) return toUser(existing);
  const existingEmail = getUserByEmail(email);
  if (existingEmail) {
    db.prepare('UPDATE users SET google_sub = ? WHERE id = ?').run(sub, existingEmail.id);
    return getUserById(existingEmail.id)!;
  }
  const id = randomUUID();
  const username = uniqueGoogleUsername(name || email.split('@')[0] || 'learner');
  db.prepare('INSERT INTO users (id, username, email, google_sub, created_at) VALUES (?, ?, ?, ?, ?)').run(id, username, email, sub, now());
  return getUserById(id)!;
}

function sessionHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function createSession(userId: string) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();
  db.prepare('INSERT INTO sessions (session_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(sessionHash(token), userId, expiresAt, now());
  return { token, expiresAt };
}

export function getUserFromSession(token?: string) {
  if (!token) return null;
  const row = db.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.session_hash = ? AND s.expires_at > ?`).get(sessionHash(token), now()) as UserRow | undefined;
  return row ? toUser(row) : null;
}

export function revokeSession(token?: string) {
  if (token) db.prepare('DELETE FROM sessions WHERE session_hash = ?').run(sessionHash(token));
}

export function persistPdf({ userId, originalName, buffer }: { userId: string; originalName: string; buffer: Buffer }) {
  const id = randomUUID();
  const storageKey = `${userId}/${id}.pdf`;
  const absolutePath = path.join(UPLOAD_DIR, storageKey);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, buffer, { mode: 0o600 });
  db.prepare('INSERT INTO files (id, user_id, original_name, storage_key, mime_type, byte_size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, userId, originalName, storageKey, 'application/pdf', buffer.byteLength, now());
  return { id, storageKey };
}

export function removeStoredFile(fileId: string) {
  const row = db.prepare('SELECT storage_key FROM files WHERE id = ?').get(fileId) as { storage_key: string } | undefined;
  if (row) rmSync(path.join(UPLOAD_DIR, row.storage_key), { force: true });
  db.prepare('DELETE FROM files WHERE id = ?').run(fileId);
}

export function deleteAccount(userId: string) {
  const files = db.prepare('SELECT storage_key FROM files WHERE user_id = ?').all(userId) as Array<{ storage_key: string }>;
  for (const file of files) rmSync(path.join(UPLOAD_DIR, file.storage_key), { force: true });
  rmSync(path.join(UPLOAD_DIR, userId), { recursive: true, force: true });
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
}

export function getCurrentCourse(userId: string) {
  const row = db.prepare(`SELECT c.* FROM users u JOIN courses c ON c.id = u.current_course_id WHERE u.id = ?`).get(userId) as Record<string, unknown> | undefined;
  return row ? toCourse(row) : null;
}

export function getCourseById(userId: string, courseId: number) {
  const row = db.prepare('SELECT * FROM courses WHERE id = ? AND user_id = ?').get(courseId, userId) as Record<string, unknown> | undefined;
  return row ? toCourse(row) : null;
}

export function getFlashcards(userId: string) {
  return (db.prepare('SELECT * FROM flashcards WHERE user_id = ? ORDER BY created_at DESC, id DESC').all(userId) as Array<Record<string, unknown>>).map(toFlashcard);
}

export function createManualFlashcard(userId: string, { tag, q, a }: { tag?: string; q: string; a: string }) {
  const result = db.prepare('INSERT INTO flashcards (user_id, tag, question, answer, source, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(userId, tag || 'Custom', q, a, 'manual', now());
  recordStudyEvent(userId, 'flashcard_created');
  return toFlashcard(db.prepare('SELECT * FROM flashcards WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>);
}

export function createCourseFromPdf(userId: string, fileId: string, result: { title: string; outline: Array<{ title: string; description: string }>; flashcards: Array<{ tag: string; q: string; a: string }> }) {
  const timestamp = now();
  const outline = result.outline.map((item, index) => ({ ...item, status: index === 0 ? 'active' : 'upcoming' }));
  const create = db.transaction(() => {
    const courseInsert = db.prepare('INSERT INTO courses (user_id, file_id, title, outline_json, created_at, last_active_at) VALUES (?, ?, ?, ?, ?, ?)').run(userId, fileId, result.title, JSON.stringify(outline), timestamp, timestamp);
    const courseId = Number(courseInsert.lastInsertRowid);
    const insertCard = db.prepare('INSERT INTO flashcards (user_id, course_id, tag, question, answer, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const card of result.flashcards) insertCard.run(userId, courseId, card.tag || 'General', card.q, card.a || '', 'pdf', timestamp);
    db.prepare('UPDATE users SET current_course_id = ? WHERE id = ?').run(courseId, userId);
    recordStudyEvent(userId, 'pdf_uploaded');
    return courseId;
  });
  const courseId = create();
  return getCourseById(userId, courseId)!;
}

export function completeOutlineItem(userId: string, courseId: number, index: number) {
  const course = getCourseById(userId, courseId);
  if (!course || index < 0 || index >= course.outline.length) return null;
  course.outline[index].status = 'completed';
  if (index + 1 < course.outline.length) course.outline[index + 1].status = 'active';
  db.prepare('UPDATE courses SET outline_json = ?, last_active_at = ? WHERE id = ? AND user_id = ?').run(JSON.stringify(course.outline), now(), courseId, userId);
  return course.outline;
}

export function reviewFlashcard(userId: string, id: number, rating: 'again' | 'hard' | 'easy') {
  const existing = db.prepare('SELECT * FROM flashcards WHERE id = ? AND user_id = ?').get(id, userId) as Record<string, unknown> | undefined;
  if (!existing) return null;
  const card = toFlashcard(existing);
  const delta = rating === 'again' ? -20 : rating === 'hard' ? 5 : 15;
  card.mastery = Math.min(100, Math.max(0, card.mastery + delta));
  card.reviewCount++;
  db.prepare('UPDATE flashcards SET mastery = ?, review_count = ? WHERE id = ?').run(card.mastery, card.reviewCount, id);
  return card;
}

export function recordStudyEvent(userId: string, type: StudyEventType) {
  db.prepare('INSERT INTO study_events (id, user_id, type, created_at) VALUES (?, ?, ?, ?)').run(randomUUID(), userId, type, now());
}

export function recordChatStart(userId: string, hasHistory: boolean) {
  if (!hasHistory) recordStudyEvent(userId, 'session_started');
  recordStudyEvent(userId, 'message_sent');
  db.prepare('UPDATE courses SET message_count = message_count + 1, last_active_at = ? WHERE id = (SELECT current_course_id FROM users WHERE id = ?)').run(now(), userId);
}

export function createConceptFlashcard(userId: string, courseId: number | undefined, concept: { tag: string; question: string; answer: string }) {
  const result = db.prepare('INSERT INTO flashcards (user_id, course_id, tag, question, answer, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(userId, courseId ?? null, concept.tag || 'Concept', concept.question, concept.answer || '', 'ai_chat', now());
  recordStudyEvent(userId, 'concept_extracted');
  return toFlashcard(db.prepare('SELECT * FROM flashcards WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>);
}

export function getContext(userId: string) {
  const course = getCurrentCourse(userId);
  const flashcards = getFlashcards(userId);
  const sessionCount = Number((db.prepare(`SELECT COUNT(*) AS count FROM study_events WHERE user_id = ? AND type = 'session_started'`).get(userId) as { count: number }).count);
  return { course: course ? { title: course.title, outline: course.outline } : null, flashcards, sessionCount };
}

function masteryToGrade(avg: number) {
  if (avg >= 90) return 'A';
  if (avg >= 80) return 'B';
  if (avg >= 70) return 'C';
  if (avg >= 60) return 'D';
  return 'F';
}

function getRelativeTime(isoString: string) {
  const hours = Math.floor((Date.now() - new Date(isoString).getTime()) / 3_600_000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

export function getAnalytics(userId: string) {
  const cards = getFlashcards(userId);
  const totalMessages = Number((db.prepare(`SELECT COUNT(*) AS count FROM study_events WHERE user_id = ? AND type = 'message_sent'`).get(userId) as { count: number }).count);
  const totalConcepts = Number((db.prepare(`SELECT COUNT(*) AS count FROM study_events WHERE user_id = ? AND type = 'concept_extracted'`).get(userId) as { count: number }).count);
  const sessionCount = Number((db.prepare(`SELECT COUNT(*) AS count FROM study_events WHERE user_id = ? AND type = 'session_started'`).get(userId) as { count: number }).count);
  const avgMastery = cards.length ? Math.round(cards.reduce((sum, card) => sum + card.mastery, 0) / cards.length) : 0;
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const studyTimeData = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const dateKey = date.toISOString().slice(0, 10);
    const counts = db.prepare(`SELECT type, COUNT(*) AS count FROM study_events WHERE user_id = ? AND substr(created_at, 1, 10) = ? GROUP BY type`).all(userId, dateKey) as Array<{ type: StudyEventType; count: number }>;
    return { name: dayNames[date.getDay()], messages: counts.find((item) => item.type === 'message_sent')?.count ?? 0, concepts: counts.find((item) => item.type === 'concept_extracted')?.count ?? 0 };
  });
  const courses = (db.prepare('SELECT * FROM courses WHERE user_id = ? ORDER BY last_active_at DESC').all(userId) as Array<Record<string, unknown>>).map(toCourse);
  const subjectMastery = courses.map((course) => {
    const courseCards = cards.filter((card) => card.courseId === course.id);
    return { name: course.title, score: courseCards.length ? Math.round(courseCards.reduce((sum, card) => sum + card.mastery, 0) / courseCards.length) : 0 };
  });
  const recentConcepts = cards.filter((card) => card.source === 'ai_chat').slice(0, 3).map((card) => ({ tag: card.tag, question: card.q, mastery: card.mastery }));
  return { totalMessages, totalConcepts, avgMastery, masteryGrade: cards.length ? masteryToGrade(avgMastery) : '--', totalCards: cards.length, sessionCount, studyTimeData, subjectMastery, recentConcepts };
}

export function getSubjects(userId: string) {
  const cards = getFlashcards(userId);
  return (db.prepare('SELECT * FROM courses WHERE user_id = ? ORDER BY last_active_at DESC').all(userId) as Array<Record<string, unknown>>).map((row) => {
    const course = toCourse(row);
    const courseCards = cards.filter((card) => card.courseId === course.id);
    return { id: course.id, name: course.title, progress: courseCards.length ? Math.round(courseCards.reduce((sum, card) => sum + card.mastery, 0) / courseCards.length) : 0, totalMessages: course.messageCount, lastActive: getRelativeTime(course.lastActiveAt) };
  });
}

export function getWeakAreas(userId: string) {
  const cards = getFlashcards(userId).filter((card) => card.reviewCount > 0 && card.mastery < 50).sort((a, b) => a.mastery - b.mastery);
  const tags = new Map<string, Flashcard[]>();
  for (const card of cards) tags.set(card.tag, [...(tags.get(card.tag) ?? []), card]);
  return [...tags.entries()].map(([tag, values]) => ({ tag, avgMastery: Math.round(values.reduce((sum, card) => sum + card.mastery, 0) / values.length), topQuestion: values[0]?.q ?? '' })).sort((a, b) => a.avgMastery - b.avgMastery).slice(0, 3);
}

const MODEL_PRICING = {
  'gemini-2.5-flash': { input: 0.3, output: 2.5, cached: 0.03 },
  'gemini-2.5-pro': { input: 1.25, output: 10, cached: 0.125 },
} as const;

const PLAN_LIMITS = {
  free: { monthlyCostUsd: 0.3, courseBuilds: 1, tutorMessages: 30 },
  student: { monthlyCostUsd: 5, courseBuilds: 20, tutorMessages: 750 },
  pro: { monthlyCostUsd: 20, courseBuilds: 100, tutorMessages: 4_000 },
} as const;

export const CREDIT_PACKS = {
  starter: { id: 'starter', name: 'Study starter', credits: 500, usdCents: 500, inrPaise: 49900 },
  focus: { id: 'focus', name: 'Focus pack', credits: 1_500, usdCents: 1_200, inrPaise: 99900 },
  semester: { id: 'semester', name: 'Semester pack', credits: 4_000, usdCents: 2_500, inrPaise: 199900 },
} as const;

export type CreditPackId = keyof typeof CREDIT_PACKS;

export function routeModel(feature: UsageFeature, requestedQuality?: unknown): ModelRoute {
  const quality: ModelQuality = requestedQuality === 'deep' ? 'deep' : 'standard';
  if (quality === 'deep') return { model: 'gemini-2.5-pro', quality };
  return { model: 'gemini-2.5-flash', quality: feature === 'course_build' ? 'standard' : 'standard' };
}

export function estimateTokens(value: string | Buffer) {
  const size = typeof value === 'string' ? Buffer.byteLength(value, 'utf8') : value.byteLength;
  return Math.max(250, Math.ceil(size / 4));
}

export function calculateUsageCost(model: ModelRoute['model'], inputTokens: number, outputTokens: number, cachedTokens = 0) {
  const pricing = MODEL_PRICING[model];
  return Number(((inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output + (cachedTokens / 1_000_000) * pricing.cached).toFixed(6));
}

function monthStart() { return new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(); }

export function assertUsageAllowance(user: CurrentUser, feature: UsageFeature, estimatedCostUsd: number) {
  const limit = PLAN_LIMITS[user.plan];
  const usage = db.prepare('SELECT COALESCE(SUM(cost_usd), 0) AS cost FROM usage_ledger WHERE user_id = ? AND created_at >= ?').get(user.id, monthStart()) as { cost: number };
  const eventType = feature === 'course_build' ? 'pdf_uploaded' : 'message_sent';
  const count = Number((db.prepare('SELECT COUNT(*) AS count FROM study_events WHERE user_id = ? AND type = ? AND created_at >= ?').get(user.id, eventType, monthStart()) as { count: number }).count);
  const countLimit = feature === 'course_build' ? limit.courseBuilds : limit.tutorMessages;
  const estimatedCredits = Math.max(1, Math.ceil(estimatedCostUsd * 100));
  if (user.creditBalance > 0 && user.creditBalance < estimatedCredits) throw new Error('CREDIT_BALANCE_LOW');
  if (user.creditBalance === 0 && count >= countLimit) throw new Error('FEATURE_QUOTA_REACHED');
  if (user.creditBalance === 0 && Number(usage.cost) + estimatedCostUsd > limit.monthlyCostUsd) throw new Error('MONTHLY_SPEND_LIMIT_REACHED');
}

export function recordUsage({ userId, feature, model, inputTokens, outputTokens, cachedTokens = 0 }: { userId: string; feature: UsageFeature; model: ModelRoute['model']; inputTokens: number; outputTokens: number; cachedTokens?: number }) {
  const costUsd = calculateUsageCost(model, inputTokens, outputTokens, cachedTokens);
  db.prepare('INSERT INTO usage_ledger (id, user_id, feature, model, input_tokens, output_tokens, cached_tokens, cost_usd, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(randomUUID(), userId, feature, model, inputTokens, outputTokens, cachedTokens, costUsd, now());
  const user = getUserById(userId);
  if (user && user.creditBalance > 0) {
    const credits = Math.max(1, Math.ceil(costUsd * 100));
    db.prepare('UPDATE users SET credit_balance = MAX(0, credit_balance - ?) WHERE id = ?').run(credits, userId);
  }
  return costUsd;
}

export function getBillingOverview(user: CurrentUser) {
  const usage = db.prepare('SELECT COALESCE(SUM(cost_usd), 0) AS cost FROM usage_ledger WHERE user_id = ? AND created_at >= ?').get(user.id, monthStart()) as { cost: number };
  const limits = PLAN_LIMITS[user.plan];
  const recentUsage = db.prepare('SELECT feature, model, input_tokens, output_tokens, cached_tokens, cost_usd, created_at FROM usage_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT 12').all(user.id) as Array<{ feature: UsageFeature; model: ModelRoute['model']; input_tokens: number; output_tokens: number; cached_tokens: number; cost_usd: number; created_at: string }>;
  return {
    plan: user.plan,
    credits: user.creditBalance,
    monthlySpendUsd: Number(Number(usage.cost).toFixed(4)),
    monthlySpendLimitUsd: limits.monthlyCostUsd,
    packs: Object.values(CREDIT_PACKS),
    providers: { stripe: Boolean(process.env.STRIPE_SECRET_KEY), razorpay: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) },
    recentUsage: recentUsage.map((entry) => ({ feature: entry.feature, model: entry.model, inputTokens: entry.input_tokens, outputTokens: entry.output_tokens, cachedTokens: entry.cached_tokens, costUsd: entry.cost_usd, createdAt: entry.created_at })),
  };
}

export function acceptPrivacy(userId: string) {
  db.prepare('UPDATE users SET privacy_accepted_at = COALESCE(privacy_accepted_at, ?) WHERE id = ?').run(now(), userId);
  return getUserById(userId)!;
}

export function createPaymentOrder({ userId, provider, providerOrderId, packId, amount, currency }: { userId: string; provider: 'stripe' | 'razorpay'; providerOrderId: string; packId: CreditPackId; amount: number; currency: string }) {
  const pack = CREDIT_PACKS[packId];
  db.prepare('INSERT OR IGNORE INTO payment_orders (id, user_id, provider, provider_order_id, pack_id, credits, amount, currency, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(randomUUID(), userId, provider, providerOrderId, packId, pack.credits, amount, currency, now());
}

export function fulfillPayment(providerOrderId: string) {
  const order = db.prepare("SELECT * FROM payment_orders WHERE provider_order_id = ? AND status != 'paid'").get(providerOrderId) as { user_id: string; credits: number } | undefined;
  if (!order) return false;
  const transaction = db.transaction(() => {
    db.prepare("UPDATE payment_orders SET status = 'paid', fulfilled_at = ? WHERE provider_order_id = ?").run(now(), providerOrderId);
    db.prepare('UPDATE users SET credit_balance = credit_balance + ? WHERE id = ?').run(order.credits, order.user_id);
  });
  transaction();
  return true;
}
