import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CircleUserRound, CreditCard, Database, ExternalLink, KeyRound, Loader2, LogOut, Palette, ShieldCheck, Trash2, WalletCards } from 'lucide-react';
import { signOut } from '../lib/auth';

type Account = { username: string; email: string | null; plan: string; creditBalance: number; privacyAcceptedAt: string | null };
type Pack = { id: 'starter' | 'focus' | 'semester'; name: string; credits: number; usdCents: number; inrPaise: number };
type UsageEntry = { feature: 'course_build' | 'tutor_chat'; model: string; inputTokens: number; outputTokens: number; cachedTokens: number; costUsd: number; createdAt: string };
type Billing = { plan: string; credits: number; monthlySpendUsd: number; monthlySpendLimitUsd: number; packs: Pack[]; providers: { stripe: boolean; razorpay: boolean }; recentUsage: UsageEntry[] };
type Privacy = { acceptedAt: string | null; modelTier: 'paid' | 'unpaid'; modelProcessingAllowed: boolean; paidTierNotice: string; unpaidTierNotice: string };
type RazorpayResponse = { provider: 'razorpay'; keyId: string; orderId: string; amount: number; currency: string; name: string; description: string };

declare global {
  interface Window {
    Razorpay?: new (options: { key: string; amount: number; currency: string; name: string; description: string; order_id: string; handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void; theme: { color: string } }) => { open: () => void };
  }
}

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById('razorpay-checkout') as HTMLScriptElement | null;
    if (existing) { existing.addEventListener('load', () => resolve(), { once: true }); existing.addEventListener('error', () => reject(new Error('Razorpay could not load.')), { once: true }); return; }
    const script = document.createElement('script');
    script.id = 'razorpay-checkout';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Razorpay could not load.'));
    document.body.appendChild(script);
  });
}

async function jsonRequest<T>(url: string, options?: RequestInit) {
  const response = await fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...options });
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || 'That action could not be completed.');
  return body;
}

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [account, setAccount] = useState<Account | null>(null);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [privacy, setPrivacy] = useState<Privacy | null>(null);
  const [provider, setProvider] = useState<'stripe' | 'razorpay'>('razorpay');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(searchParams.get('payment') === 'success' ? 'Payment received. Your credits will appear as soon as the provider confirms it.' : null);

  const load = async () => {
    const [user, overview, privacyStatus] = await Promise.all([
      jsonRequest<{ account: Account }>('/api/user'),
      jsonRequest<Billing>('/api/billing/overview'),
      jsonRequest<Privacy>('/api/privacy'),
    ]);
    setAccount(user.account);
    setBilling(overview);
    setPrivacy(privacyStatus);
    if (overview.providers.stripe && !overview.providers.razorpay) setProvider('stripe');
  };

  useEffect(() => { load().catch((error) => setNotice(error instanceof Error ? error.message : 'Could not load settings.')); }, []);

  const initials = account?.username.slice(0, 2).toUpperCase() ?? '';
  const hasCheckout = Boolean(billing?.providers.stripe || billing?.providers.razorpay);
  const displayProvider = useMemo(() => provider === 'razorpay' ? 'Razorpay · INR' : 'Stripe · USD', [provider]);

  const checkout = async (pack: Pack) => {
    if (!hasCheckout) return;
    setBusy(pack.id);
    setNotice(null);
    try {
      const checkoutData = await jsonRequest<{ provider: 'stripe'; checkoutUrl: string | null } | RazorpayResponse>('/api/billing/checkout', { method: 'POST', body: JSON.stringify({ provider, packId: pack.id }) });
      if (checkoutData.provider === 'stripe') {
        if (!checkoutData.checkoutUrl) throw new Error('Stripe could not create a checkout link.');
        window.location.assign(checkoutData.checkoutUrl);
        return;
      }
      await loadRazorpay();
      if (!window.Razorpay) throw new Error('Razorpay checkout is unavailable.');
      new window.Razorpay({
        key: checkoutData.keyId,
        amount: checkoutData.amount,
        currency: checkoutData.currency,
        name: checkoutData.name,
        description: checkoutData.description,
        order_id: checkoutData.orderId,
        theme: { color: '#1b2235' },
        handler: async (response) => {
          try {
            await jsonRequest('/api/billing/razorpay/verify', { method: 'POST', body: JSON.stringify({ orderId: response.razorpay_order_id, paymentId: response.razorpay_payment_id, signature: response.razorpay_signature }) });
            await load();
            setNotice('Payment confirmed — credits are ready to use.');
          } catch (error) { setNotice(error instanceof Error ? error.message : 'Payment could not be verified.'); }
        },
      }).open();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Checkout could not start.');
    } finally {
      setBusy(null);
    }
  };

  const acceptPrivacy = async () => {
    setBusy('privacy'); setNotice(null);
    try { await jsonRequest('/api/privacy', { method: 'PUT', body: JSON.stringify({ accept: true }) }); await load(); setNotice('Privacy choices saved.'); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Could not save your privacy choice.'); }
    finally { setBusy(null); }
  };

  const leave = async () => {
    try { await signOut(); navigate('/auth', { replace: true }); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Could not sign out.'); }
  };

  const removeAccount = async () => {
    if (!window.confirm('Delete your account, courses, cards, usage records, and stored PDFs? This cannot be undone.')) return;
    setBusy('delete');
    try {
      const response = await fetch('/api/account', { method: 'DELETE', credentials: 'same-origin' });
      if (!response.ok) throw new Error('Your account could not be deleted.');
      window.location.assign('/auth');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Your account could not be deleted.'); }
    finally { setBusy(null); }
  };

  return <div className="page page-enter max-w-5xl space-y-5">
    <section><p className="eyebrow">Workspace settings</p><h1 className="display-title mt-4 text-5xl sm:text-6xl">Keep it yours.</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">Your account, source files, model usage, and payments are separated from every other learner’s workspace.</p></section>
    {notice && <p className="rounded-2xl border border-sky/40 bg-sky/15 px-4 py-3 text-sm font-semibold text-ink" role="status">{notice}</p>}
    <div className="grid gap-5 lg:grid-cols-[.72fr_1.28fr]">
      <aside className="panel p-4">{[[CircleUserRound, 'Profile'], [WalletCards, 'Credits'], [ShieldCheck, 'Privacy'], [Palette, 'Interface']].map(([Icon, label], index) => { const ItemIcon = Icon as typeof CircleUserRound; return <div key={String(label)} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-bold ${index === 0 ? 'bg-sun text-ink' : 'text-slate-500'}`}><ItemIcon size={18} />{label}</div>; })}</aside>
      <div className="space-y-5">
        <section className="panel p-6 sm:p-8"><p className="eyebrow">Profile</p><div className="mt-7 flex flex-col gap-5 border-b border-line pb-7 sm:flex-row sm:items-center"><div className="grid h-20 w-20 place-items-center rounded-[1.5rem] bg-sun font-display text-2xl font-bold text-ink">{initials || <CircleUserRound size={26} />}</div><div><h2 className="section-title text-2xl">{account?.username ?? 'Your account'}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{account?.email ?? 'Username and password account'} · {account?.plan ?? 'free'} plan</p></div></div><div className="mt-7 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-mist/70 p-5"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-ink shadow-sm"><KeyRound size={18} /></div><div><p className="text-sm font-extrabold text-ink">Persistent secure session</p><p className="mt-1 text-xs text-slate-500">Password hashes and HTTP-only session cookies stay off the browser’s JavaScript.</p></div></div><button className="button-secondary" onClick={leave}><LogOut size={16} />Sign out</button></div></section>
        <section className="panel p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Usage & credits</p><h2 className="section-title mt-3">Spend with a ceiling, not a surprise.</h2></div><div className="rounded-2xl bg-mint px-4 py-3 text-right"><p className="font-mono text-[9px] uppercase tracking-wider text-ink/65">Available</p><p className="mt-1 font-display text-2xl font-bold tracking-[-.06em] text-ink">{billing?.credits ?? 0} credits</p></div></div><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Every request is metered server-side from Gemini’s reported token usage. Flash handles standard work; Deep quality uses Pro only when you choose it.</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-mist/65 p-4"><p className="font-mono text-[9px] uppercase tracking-wider text-slate-500">This month</p><p className="mt-2 text-lg font-extrabold text-ink">${(billing?.monthlySpendUsd ?? 0).toFixed(4)} <span className="text-sm font-semibold text-slate-500">of ${(billing?.monthlySpendLimitUsd ?? 0).toFixed(2)}</span></p></div><div className="rounded-2xl bg-mist/65 p-4"><p className="font-mono text-[9px] uppercase tracking-wider text-slate-500">Model routing</p><p className="mt-2 text-sm font-extrabold text-ink">Flash default · Pro on Deep</p><p className="mt-1 text-xs text-slate-500">Hard quota check before every call</p></div></div><div className="mt-6 overflow-hidden rounded-2xl border border-line"><div className="flex items-center justify-between bg-mist/65 px-4 py-3"><p className="font-mono text-[9px] uppercase tracking-wider text-slate-500">Recent usage audit</p><p className="font-mono text-[9px] uppercase tracking-wider text-slate-500">Reported tokens · actual cost</p></div>{billing?.recentUsage.length ? <div className="divide-y divide-line">{billing.recentUsage.map((entry) => <div key={`${entry.createdAt}-${entry.feature}`} className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3 sm:grid-cols-[1.1fr_.8fr_.8fr_auto]"><span className="text-xs font-extrabold text-ink">{entry.feature === 'course_build' ? 'Course build' : 'Tutor chat'}</span><span className="font-mono text-[9px] uppercase tracking-wider text-slate-500">{entry.model.replace('gemini-2.5-', '')}</span><span className="font-mono text-[9px] text-slate-500">{entry.inputTokens.toLocaleString()} in · {entry.outputTokens.toLocaleString()} out</span><span className="font-mono text-[10px] font-bold text-ink">${entry.costUsd.toFixed(4)}</span></div>)}</div> : <p className="px-4 py-4 text-xs leading-5 text-slate-500">No model requests have been recorded for this account yet.</p>}</div><div className="mt-7 flex flex-wrap items-center gap-3"><span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Pay with</span>{(['razorpay', 'stripe'] as const).map((item) => <button key={item} type="button" disabled={!billing?.providers[item]} onClick={() => setProvider(item)} className={`rounded-full border px-3 py-2 font-mono text-[10px] uppercase tracking-wider transition ${provider === item ? 'border-ink bg-ink text-white' : 'border-line text-slate-500'} disabled:cursor-not-allowed disabled:opacity-35`}>{item === 'razorpay' ? 'Razorpay · INR' : 'Stripe · USD'}</button>)}<span className="text-xs text-slate-500">{hasCheckout ? displayProvider : 'Add provider keys to enable checkout.'}</span></div><div className="mt-4 grid gap-3 md:grid-cols-3">{billing?.packs.map((pack) => <article key={pack.id} className="rounded-2xl border border-line bg-white/50 p-4"><p className="text-sm font-extrabold text-ink">{pack.name}</p><p className="mt-3 font-display text-2xl font-bold tracking-[-.06em] text-ink">{pack.credits} <span className="text-xs font-mono uppercase tracking-wider text-slate-500">credits</span></p><p className="mt-1 text-xs text-slate-500">${(pack.usdCents / 100).toFixed(0)} · ₹{(pack.inrPaise / 100).toFixed(0)}</p><button className="button-secondary mt-4 w-full" disabled={!hasCheckout || busy === pack.id} onClick={() => checkout(pack)}>{busy === pack.id ? <Loader2 className="animate-spin" size={15} /> : <CreditCard size={15} />}{hasCheckout ? 'Add credits' : 'Not configured'}</button></article>)}</div></section>
        <section className="panel p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Privacy & source files</p><h2 className="section-title mt-3">Your course material deserves care.</h2></div><div className="grid h-11 w-11 place-items-center rounded-2xl bg-sky/25 text-ink"><ShieldCheck size={20} /></div></div><div className="mt-5 grid gap-3 sm:grid-cols-3">{[[Database, 'Private storage', 'PDFs are stored per account in private application storage.'], [ShieldCheck, privacy?.modelTier === 'paid' ? 'Paid Gemini API' : 'Unpaid Gemini blocked', privacy?.modelTier === 'paid' ? privacy.paidTierNotice : privacy?.unpaidTierNotice ?? 'Set GEMINI_DATA_TIER to paid before processing academic material.'], [ExternalLink, 'Your control', 'Delete your account to remove its database records and stored sources.']].map(([Icon, title, description]) => { const ItemIcon = Icon as typeof Database; return <div key={String(title)} className="rounded-2xl bg-mist/65 p-4"><ItemIcon size={18} className="text-ink" /><p className="mt-4 text-sm font-extrabold text-ink">{title}</p><p className="mt-2 text-xs leading-5 text-slate-600">{description}</p></div>; })}</div><div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line p-4"><div><p className="text-sm font-extrabold text-ink">Privacy acknowledgement</p><p className="mt-1 text-xs text-slate-500">{privacy?.acceptedAt ? `Accepted ${new Date(privacy.acceptedAt).toLocaleDateString()}.` : 'Review and record this choice before uploading sensitive material.'}</p></div>{privacy?.acceptedAt ? <span className="inline-flex items-center gap-2 rounded-full bg-mint px-3 py-2 text-xs font-extrabold text-ink"><ShieldCheck size={15} />Acknowledged</span> : <button className="button-primary" disabled={busy === 'privacy'} onClick={acceptPrivacy}>{busy === 'privacy' ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}I understand</button>}</div><div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5"><div><p className="text-sm font-extrabold text-ink">Delete account</p><p className="mt-1 text-xs text-slate-500">Permanently removes your stored PDFs, courses, cards, sessions, and billing ledger.</p></div><button className="button-secondary !border-coral !text-[#a54633]" disabled={busy === 'delete'} onClick={removeAccount}>{busy === 'delete' ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}Delete</button></div></section>
      </div>
    </div>
  </div>;
}
