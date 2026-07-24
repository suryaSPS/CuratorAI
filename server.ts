import 'dotenv/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { OAuth2Client } from 'google-auth-library';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import Razorpay from 'razorpay';
import Stripe from 'stripe';
import {
  CREDIT_PACKS,
  type CreditPackId,
  type CurrentUser,
  type Flashcard,
  acceptPrivacy,
  assertUsageAllowance,
  calculateUsageCost,
  completeOutlineItem,
  createConceptFlashcard,
  createCourseFromPdf,
  createManualFlashcard,
  createPasswordUser,
  createPaymentOrder,
  createSession,
  deleteAccount,
  estimateTokens,
  fulfillPayment,
  getAnalytics,
  getBillingOverview,
  getContext,
  getCurrentCourse,
  getFlashcards,
  getSubjects,
  getUserByUsername,
  getUserFromSession,
  getWeakAreas,
  persistPdf,
  recordChatStart,
  recordUsage,
  reviewFlashcard,
  revokeSession,
  routeModel,
  upsertGoogleUser,
} from './server/platform.ts';

if (!process.env.GEMINI_API_KEY) {
  console.error('FATAL: GEMINI_API_KEY is not set.\nCopy .env.example to .env and add your Gemini API key.');
  process.exit(1);
}

const app = express();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;
const SESSION_COOKIE = 'curator_session';
const APP_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const geminiDataTier = process.env.GEMINI_DATA_TIER === 'paid' ? 'paid' : 'unpaid';

if (process.env.NODE_ENV === 'production' && geminiDataTier !== 'paid') {
  console.error('FATAL: GEMINI_DATA_TIER must be "paid" in production. Unpaid Gemini usage must not process academic PDFs or study conversations.');
  process.exit(1);
}

interface AuthenticatedRequest extends Request {
  user?: CurrentUser;
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Please wait a few minutes.' },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => callback(null, file.mimetype === 'application/pdf'),
});

function readCookie(req: Request, name: string) {
  const encoded = req.headers.cookie?.split(';').map((value) => value.trim()).find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1);
  return encoded ? decodeURIComponent(encoded) : undefined;
}

function setSessionCookie(res: Response, token: string, expiresAt: string) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(expiresAt),
    path: '/',
  });
}

function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const user = getUserFromSession(readCookie(req, SESSION_COOKIE));
  if (!user) return res.status(401).json({ error: 'Sign in is required.' });
  req.user = user;
  next();
}

function requireModelPrivacy(user: CurrentUser, res: Response) {
  if (!user.privacyAcceptedAt) {
    res.status(428).json({ error: 'Review the privacy acknowledgement in Settings before processing study material.', code: 'PRIVACY_ACKNOWLEDGEMENT_REQUIRED' });
    return false;
  }
  if (geminiDataTier !== 'paid') {
    res.status(412).json({ error: 'A billing-enabled Gemini project is required before Curator can process academic PDFs or conversations. Unpaid Gemini services may use submitted content to improve products.', code: 'PAID_GEMINI_REQUIRED' });
    return false;
  }
  return true;
}

function sendUsageError(error: unknown, res: Response) {
  const code = error instanceof Error ? error.message : 'USAGE_LIMIT_REACHED';
  const messages: Record<string, string> = {
    CREDIT_BALANCE_LOW: 'Your credit balance is too low for this request. Add credits to continue.',
    FEATURE_QUOTA_REACHED: 'You have reached this month’s included usage limit. Add credits to continue.',
    MONTHLY_SPEND_LIMIT_REACHED: 'This request would exceed your monthly safety limit. Add credits or try again next month.',
  };
  return res.status(402).json({ error: messages[code] ?? 'This request is not available within your current usage limits.', code });
}

function responseUsage(response: unknown) {
  const usage = (response as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number; cachedContentTokenCount?: number } }).usageMetadata;
  const inputTokens = Number(usage?.promptTokenCount ?? 0);
  const outputTokens = Number(usage?.candidatesTokenCount ?? 0) + Number(usage?.thoughtsTokenCount ?? 0);
  const cachedTokens = Number(usage?.cachedContentTokenCount ?? 0);
  return { inputTokens, outputTokens, cachedTokens };
}

function validPack(value: unknown): value is CreditPackId {
  return typeof value === 'string' && value in CREDIT_PACKS;
}

function compareSignature(expected: string, received: string | undefined) {
  if (!received) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  return left.length === right.length && timingSafeEqual(left, right);
}

function getStripe() {
  return process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
}

function getRazorpay() {
  return process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
    : null;
}

// Payment webhooks must receive their original raw body and therefore come before JSON parsing.
app.post('/api/billing/stripe-webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const stripe = getStripe();
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).json({ error: 'Stripe webhook is not configured.' });
  try {
    const signature = req.headers['stripe-signature'];
    if (typeof signature !== 'string') throw new Error('Missing signature');
    const event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === 'checkout.session.completed') fulfillPayment(event.data.object.id);
    res.json({ received: true });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid Stripe webhook.' });
  }
});

app.post('/api/billing/razorpay-webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) return res.status(503).json({ error: 'Razorpay webhook is not configured.' });
  const received = req.headers['x-razorpay-signature'];
  const rawBody = req.body as Buffer;
  const expected = createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
  if (!compareSignature(expected, typeof received === 'string' ? received : undefined)) return res.status(400).json({ error: 'Invalid Razorpay webhook.' });
  const payload = JSON.parse(rawBody.toString('utf8')) as { event?: string; payload?: { payment?: { entity?: { order_id?: string } } } };
  if (payload.event === 'payment.captured' && payload.payload?.payment?.entity?.order_id) fulfillPayment(payload.payload.payment.entity.order_id);
  res.json({ received: true });
});

app.use(express.json({ limit: '5mb' }));

// --- Authentication ---
app.get('/api/auth/session', (req, res) => {
  const user = getUserFromSession(readCookie(req, SESSION_COOKIE));
  res.json({ user });
});

app.post('/api/auth/register', authLimiter, async (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!/^[a-zA-Z0-9_-]{3,32}$/.test(username)) return res.status(400).json({ error: 'Use 3–32 letters, numbers, underscores, or hyphens for your username.' });
  if (password.length < 8) return res.status(400).json({ error: 'Use a password with at least 8 characters.' });
  if (getUserByUsername(username)) return res.status(409).json({ error: 'That username is already in use.' });
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const user = createPasswordUser({ username, passwordHash });
    const session = createSession(user.id);
    setSessionCookie(res, session.token, session.expiresAt);
    res.status(201).json({ user });
  } catch {
    res.status(409).json({ error: 'That username is already in use.' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const user = username ? getUserByUsername(username) : undefined;
  if (!user?.password_hash || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Incorrect username or password.' });
  const session = createSession(user.id);
  setSessionCookie(res, session.token, session.expiresAt);
  res.json({ user: getUserFromSession(session.token) });
});

app.post('/api/auth/google', authLimiter, async (req, res) => {
  if (!googleClient || !googleClientId) return res.status(503).json({ error: 'Google sign-in is not configured yet.' });
  const credential = typeof req.body.credential === 'string' ? req.body.credential : '';
  if (!credential) return res.status(400).json({ error: 'Google credential is required.' });
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: googleClientId });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || !payload.email_verified) throw new Error('Invalid Google identity.');
    const user = upsertGoogleUser({ sub: payload.sub, email: payload.email, name: payload.name || payload.given_name || payload.email.split('@')[0] });
    const session = createSession(user.id);
    setSessionCookie(res, session.token, session.expiresAt);
    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Google could not verify this sign-in. Try again.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  revokeSession(readCookie(req, SESSION_COOKIE));
  clearSessionCookie(res);
  res.status(204).end();
});

// Every remaining application endpoint is private and scoped to the signed-in user.
app.use('/api', requireAuth);

app.get('/api/user', (req: AuthenticatedRequest, res) => {
  res.json({ name: process.env.USER_NAME?.trim() || null, account: req.user });
});

app.get('/api/context', (req: AuthenticatedRequest, res) => res.json(getContext(req.user!.id)));
app.get('/api/flashcards', (req: AuthenticatedRequest, res) => res.json(getFlashcards(req.user!.id)));

app.post('/api/flashcards', (req: AuthenticatedRequest, res) => {
  const { tag, q, a } = req.body as { tag?: string; q?: string; a?: string };
  if (!q?.trim() || !a?.trim()) return res.status(400).json({ error: 'Question and answer are required.' });
  res.status(201).json(createManualFlashcard(req.user!.id, { tag, q: q.trim(), a: a.trim() }));
});

app.get('/api/analytics', (req: AuthenticatedRequest, res) => res.json(getAnalytics(req.user!.id)));
app.get('/api/subjects', (req: AuthenticatedRequest, res) => res.json(getSubjects(req.user!.id)));
app.get('/api/weak-areas', (req: AuthenticatedRequest, res) => res.json(getWeakAreas(req.user!.id)));

app.patch('/api/courses/:id/outline/:index', (req: AuthenticatedRequest, res) => {
  const courseId = Number(req.params.id);
  const index = Number(req.params.index);
  if (!Number.isInteger(courseId) || !Number.isInteger(index)) return res.status(400).json({ error: 'Invalid course or outline item.' });
  const outline = completeOutlineItem(req.user!.id, courseId, index);
  if (!outline) return res.status(404).json({ error: 'Course or outline item not found.' });
  res.json({ outline });
});

app.patch('/api/flashcards/:id/review', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const rating = req.body.rating as 'again' | 'hard' | 'easy';
  if (!Number.isInteger(id) || !['again', 'hard', 'easy'].includes(rating)) return res.status(400).json({ error: 'rating must be again, hard, or easy.' });
  const card = reviewFlashcard(req.user!.id, id, rating);
  if (!card) return res.status(404).json({ error: 'Flashcard not found.' });
  res.json(card);
});

app.post('/api/upload-pdf', apiLimiter, (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (!error && !req.file) return res.status(400).json({ error: 'Only PDF files are accepted.' });
    if (error?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large (max 10MB).' });
    if (error) return next(error);
    next();
  });
}, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  if (!requireModelPrivacy(user, res)) return;
  const route = routeModel('course_build', req.body.quality);
  const estimatedInputTokens = Math.max(1_000, Math.ceil(req.file.buffer.byteLength / 80));
  const estimatedCost = calculateUsageCost(route.model, estimatedInputTokens, route.quality === 'deep' ? 8_192 : 4_096);
  try {
    assertUsageAllowance(user, 'course_build', estimatedCost);
  } catch (error) {
    return sendUsageError(error, res);
  }
  const storedFile = persistPdf({ userId: user.id, originalName: req.file.originalname, buffer: req.file.buffer });
  try {
    const schema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'A concise academic title for this material.' },
        outline: { type: Type.ARRAY, description: 'A 3–5 step learning outline based on the document.', items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING } }, required: ['title', 'description'] } },
        flashcards: { type: Type.ARRAY, description: '5–8 highly testable flashcards from the document.', items: { type: Type.OBJECT, properties: { tag: { type: Type.STRING }, q: { type: Type.STRING }, a: { type: Type.STRING } }, required: ['tag', 'q', 'a'] } },
      },
      required: ['title', 'outline', 'flashcards'],
    };
    const response = await ai.models.generateContent({
      model: route.model,
      contents: [{ role: 'user', parts: [{ inlineData: { data: req.file.buffer.toString('base64'), mimeType: 'application/pdf' } }, { text: 'Analyze this document. Generate a course title, a learning outline, and the most critical concepts as flashcards.' }] }],
      config: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.2, maxOutputTokens: route.quality === 'deep' ? 8_192 : 4_096 },
    });
    if (!response.text) throw new Error('The model returned no content.');
    const result = JSON.parse(response.text) as { title: string; outline: Array<{ title: string; description: string }>; flashcards: Array<{ tag: string; q: string; a: string }> };
    const course = createCourseFromPdf(user.id, storedFile.id, result);
    const usage = responseUsage(response);
    recordUsage({ userId: user.id, feature: 'course_build', model: route.model, ...usage });
    res.status(201).json({ success: true, course: { title: course.title, outline: course.outline }, model: route.model, quality: route.quality });
  } catch (error) {
    console.error('PDF processing error:', error);
    res.status(502).json({ error: 'The document could not be processed. Your source remains private in your workspace; try again in a moment.' });
  }
});

app.post('/api/chat', apiLimiter, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
  const history = Array.isArray(req.body.history) ? req.body.history : [];
  if (!message) return res.status(400).json({ error: 'message is required.' });
  if (!requireModelPrivacy(user, res)) return;
  const route = routeModel('tutor_chat', req.body.quality);
  const historyText = history.map((item: unknown) => typeof item === 'object' && item && 'content' in item ? String((item as { content: unknown }).content) : '').join('\n');
  const estimatedCost = calculateUsageCost(route.model, estimateTokens(`${historyText}\n${message}`), route.quality === 'deep' ? 2_048 : 1_024);
  try {
    assertUsageAllowance(user, 'tutor_chat', estimatedCost);
  } catch (error) {
    return sendUsageError(error, res);
  }
  const activeCourse = getCurrentCourse(user.id);
  const formattedHistory = history.filter((item: unknown): item is { role: string; content: string } => typeof item === 'object' && item !== null && typeof (item as { role?: unknown }).role === 'string' && typeof (item as { content?: unknown }).content === 'string').slice(-20).map((item) => ({ role: item.role === 'user' ? 'user' : 'model', parts: [{ text: item.content }] }));
  formattedHistory.push({ role: 'user', parts: [{ text: message }] });
  try {
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        reply: { type: Type.STRING, description: 'A concise Socratic response that helps the learner reason toward understanding.' },
        extractedConcept: { type: Type.OBJECT, nullable: true, description: 'A testable concept worth adding to a review deck, or null.', properties: { tag: { type: Type.STRING }, question: { type: Type.STRING }, answer: { type: Type.STRING } }, required: ['tag', 'question', 'answer'] },
      },
      required: ['reply'],
    };
    const response = await ai.models.generateContent({
      model: route.model,
      contents: formattedHistory,
      config: { systemInstruction: `You are Curator, a precise Socratic tutor helping a learner master "${activeCourse?.title ?? 'the subject at hand'}". Guide discovery instead of simply giving answers.`, responseMimeType: 'application/json', responseSchema, temperature: 0.7, maxOutputTokens: route.quality === 'deep' ? 2_048 : 1_024 },
    });
    if (!response.text) throw new Error('The model returned no response.');
    const result = JSON.parse(response.text) as { reply: string; extractedConcept?: { tag: string; question: string; answer: string } | null };
    recordChatStart(user.id, history.length > 0);
    const newCard: Flashcard | null = result.extractedConcept?.question ? createConceptFlashcard(user.id, activeCourse?.id, result.extractedConcept) : null;
    const usage = responseUsage(response);
    recordUsage({ userId: user.id, feature: 'tutor_chat', model: route.model, ...usage });
    res.json({ reply: result.reply, newFlashcardAdded: Boolean(newCard), newFlashcard: newCard, model: route.model, quality: route.quality });
  } catch (error) {
    console.error('Chat API error:', error);
    res.status(502).json({ error: 'The tutor could not respond. Your study material was not changed; please retry.' });
  }
});

// --- Billing and privacy ---
app.get('/api/billing/overview', (req: AuthenticatedRequest, res) => res.json(getBillingOverview(req.user!)));

app.post('/api/billing/checkout', async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const provider = req.body.provider as 'stripe' | 'razorpay';
  const packId = req.body.packId;
  if (!validPack(packId)) return res.status(400).json({ error: 'Choose a valid credit pack.' });
  const pack = CREDIT_PACKS[packId];
  if (provider === 'stripe') {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ error: 'Stripe checkout is not configured.' });
    const checkout = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price_data: { currency: 'usd', product_data: { name: `${pack.name} — ${pack.credits} Curator credits` }, unit_amount: pack.usdCents }, quantity: 1 }],
      success_url: `${APP_URL}/settings?payment=success`,
      cancel_url: `${APP_URL}/settings?payment=cancelled`,
      metadata: { userId: user.id, packId },
    });
    createPaymentOrder({ userId: user.id, provider: 'stripe', providerOrderId: checkout.id, packId, amount: pack.usdCents, currency: 'usd' });
    return res.json({ provider, checkoutUrl: checkout.url });
  }
  if (provider === 'razorpay') {
    const razorpay = getRazorpay();
    if (!razorpay || !process.env.RAZORPAY_KEY_ID) return res.status(503).json({ error: 'Razorpay checkout is not configured.' });
    const order = await razorpay.orders.create({ amount: pack.inrPaise, currency: 'INR', receipt: `curator-${Date.now()}`, notes: { userId: user.id, packId } });
    createPaymentOrder({ userId: user.id, provider: 'razorpay', providerOrderId: order.id, packId, amount: pack.inrPaise, currency: 'inr' });
    return res.json({ provider, keyId: process.env.RAZORPAY_KEY_ID, orderId: order.id, amount: order.amount, currency: order.currency, name: 'Curator', description: `${pack.name} — ${pack.credits} credits` });
  }
  res.status(400).json({ error: 'Choose Stripe or Razorpay.' });
});

app.post('/api/billing/razorpay/verify', (req, res) => {
  if (!process.env.RAZORPAY_KEY_SECRET) return res.status(503).json({ error: 'Razorpay checkout is not configured.' });
  const { orderId, paymentId, signature } = req.body as { orderId?: string; paymentId?: string; signature?: string };
  if (!orderId || !paymentId || !signature) return res.status(400).json({ error: 'Payment verification details are required.' });
  const expected = createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
  if (!compareSignature(expected, signature)) return res.status(400).json({ error: 'Payment signature could not be verified.' });
  fulfillPayment(orderId);
  res.json({ success: true });
});

app.get('/api/privacy', (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  res.json({
    acceptedAt: user.privacyAcceptedAt,
    modelTier: geminiDataTier,
    modelProcessingAllowed: geminiDataTier === 'paid',
    storage: 'Private application storage',
    paidTierNotice: 'Paid Gemini API services do not use prompts, responses, or uploaded documents to improve Google products. Limited retention for abuse monitoring can still apply.',
    unpaidTierNotice: 'Unpaid Gemini services may use submitted content and responses to improve Google products. Do not submit sensitive, confidential, or personal information to unpaid services.',
    retention: 'You can delete your account and stored sources at any time.',
  });
});

app.put('/api/privacy', (req: AuthenticatedRequest, res) => {
  if (req.body.accept !== true) return res.status(400).json({ error: 'Privacy acknowledgement is required.' });
  res.json({ user: acceptPrivacy(req.user!.id) });
});

app.delete('/api/account', (req: AuthenticatedRequest, res) => {
  deleteAccount(req.user!.id);
  clearSessionCookie(res);
  res.status(204).end();
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ configLoader: 'native', server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => console.log(`Server running on http://localhost:${port}`));
}

startServer();
