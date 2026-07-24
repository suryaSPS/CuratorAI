import { FormEvent, useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  FileText,
  LockKeyhole,
  MessageCircle,
  Orbit,
  ShieldCheck,
  Sparkles,
  Upload,
} from 'lucide-react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import GoogleSignIn from '../components/GoogleSignIn';
import { getLocalSession, startLocalSession } from '../lib/auth';

type AuthMode = 'signup' | 'login';
type FieldName = 'username' | 'password' | 'agree';

const flowSteps = [
  {
    icon: Upload,
    title: 'Bring a source',
    description: 'A PDF gives the workspace the context it needs to build a course around your material.',
    detail: 'PDF → course map',
    tint: 'sun',
  },
  {
    icon: MessageCircle,
    title: 'Follow the question',
    description: 'Use a guided conversation to pull apart the ideas that deserve a closer look.',
    detail: 'Course map → conversation',
    tint: 'sky',
  },
  {
    icon: Sparkles,
    title: 'Keep the signal',
    description: 'Useful concepts collect in a review deck, so your learning stays connected to the source.',
    detail: 'Conversation → deck',
    tint: 'mint',
  },
];

function getNextPath(next: string | null) {
  return next?.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>(searchParams.get('mode') === 'signup' ? 'signup' : 'login');
  const [activeStep, setActiveStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Record<FieldName, boolean>>({ username: false, password: false, agree: false });
  const [values, setValues] = useState({ username: '', password: '', agree: false });
  const nextPath = getNextPath(searchParams.get('next'));
  const existingSession = getLocalSession();

  const errors = useMemo(() => ({
    username: mode === 'signup' && values.username.trim().length < 3 ? 'Use at least three characters.' : mode === 'login' && !values.username.trim() ? 'Enter your username.' : '',
    password: mode === 'signup' && values.password.length < 8 ? 'Use at least 8 characters.' : mode === 'login' && !values.password ? 'Enter your password.' : '',
    agree: mode === 'signup' && !values.agree ? 'Please accept to continue.' : '',
  }), [mode, values]);

  const passwordScore = Math.min(4, [values.password.length >= 8, /[A-Z]/.test(values.password), /\d/.test(values.password), /[^A-Za-z0-9]/.test(values.password)].filter(Boolean).length);
  const current = flowSteps[activeStep];
  const CurrentIcon = current.icon;

  const markTouched = (field: FieldName) => setTouched((state) => ({ ...state, [field]: true }));
  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setSubmitted(false);
    setTouched({ username: false, password: false, agree: false });
  };
  const startSession = useCallback((username: string, provider: 'password' | 'google') => {
    startLocalSession(username, provider);
    navigate(nextPath, { replace: true });
  }, [navigate, nextPath]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setTouched({ username: true, password: true, agree: true });
    if (Object.values(errors).some(Boolean)) return;
    startSession(values.username, 'password');
  };
  const shouldShow = (field: FieldName) => (submitted || touched[field]) && Boolean(errors[field]);

  if (existingSession) return <Navigate to={nextPath} replace />;

  return (
    <main className="auth-page app-background">
      <nav className="auth-nav">
        <button onClick={() => navigate('/landing')} className="flex items-center gap-3 text-left" aria-label="Return to Curator home">
          <span className="brand-mark" aria-hidden="true" />
          <span><span className="block font-display text-xl font-bold tracking-[-.07em] text-ink">Curator</span><span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[.13em] text-slate-500">Personal learning studio</span></span>
        </button>
        <div className="flex items-center gap-2"><button onClick={() => navigate('/landing')} className="auth-back-link"><ArrowLeft size={15} />Explore</button><ThemeToggle /></div>
      </nav>

      <section className="auth-layout">
        <div className="auth-form-column">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .46, ease: 'easeOut' }} className="auth-form-surface">
            <div className="auth-form-heading">
              <p className="eyebrow">A space for your own material</p>
              <h1>{mode === 'signup' ? 'Make a little room to think.' : 'Welcome back to your orbit.'}</h1>
              <p>{mode === 'signup' ? 'Start with what you are already reading. Curator turns it into a study space that stays with you.' : 'Sign in to open the learning space you were using in this browser tab.'}</p>
            </div>

            <div className="auth-mode-switch" aria-label="Authentication mode">
              <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => changeMode('signup')}>Create account</button>
              <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => changeMode('login')}>Sign in</button>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={mode} initial={{ opacity: 0, x: mode === 'signup' ? -10 : 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: mode === 'signup' ? 10 : -10 }} transition={{ duration: .22, ease: 'easeOut' }} className="mt-7">
                <GoogleSignIn onSuccess={({ username }) => startSession(username, 'google')} />
                <div className="auth-divider"><span>or use a username</span></div>
                <form className="space-y-4" onSubmit={submit} noValidate>
                  <label className="auth-field">Username<input value={values.username} onChange={(event) => setValues({ ...values, username: event.target.value })} onBlur={() => markTouched('username')} autoComplete="username" placeholder={mode === 'signup' ? 'Choose a username' : 'Enter your username'} aria-invalid={shouldShow('username')} aria-describedby={shouldShow('username') ? 'username-error' : undefined} />{shouldShow('username') && <span id="username-error" className="auth-field-error">{errors.username}</span>}</label>
                  <label className="auth-field">Password<span className="auth-password-wrap"><input value={values.password} onChange={(event) => setValues({ ...values, password: event.target.value })} onBlur={() => markTouched('password')} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} type={showPassword ? 'text' : 'password'} placeholder={mode === 'signup' ? 'Create a password' : 'Enter your password'} aria-invalid={shouldShow('password')} aria-describedby={shouldShow('password') ? 'password-error' : undefined} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>{mode === 'signup' && values.password && <span className="auth-password-meter" aria-label={`Password strength ${passwordScore} out of 4`}><i className={passwordScore >= 1 ? 'active' : ''} /><i className={passwordScore >= 2 ? 'active' : ''} /><i className={passwordScore >= 3 ? 'active' : ''} /><i className={passwordScore >= 4 ? 'active' : ''} /></span>}{shouldShow('password') && <span id="password-error" className="auth-field-error">{errors.password}</span>}</label>
                  {mode === 'signup' && <label className="auth-check"><input checked={values.agree} onChange={(event) => setValues({ ...values, agree: event.target.checked })} onBlur={() => markTouched('agree')} type="checkbox" aria-invalid={shouldShow('agree')} /><span aria-hidden="true">{values.agree && <Check size={13} />}</span><small>I understand this browser-only session ends when I close this tab.</small></label>}
                  {shouldShow('agree') && <p className="auth-field-error -mt-2">{errors.agree}</p>}
                  <button className="button-primary mt-2 w-full" type="submit">{mode === 'signup' ? 'Create local session' : 'Sign in to Curator'} <ArrowRight size={16} /></button>
                </form>
              </motion.div>
            </AnimatePresence>

            <div className="auth-assurance"><LockKeyhole size={15} /><span>Access is remembered only in this browser tab with session storage.</span></div>
          </motion.div>
        </div>

        <motion.section initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .6, delay: .08, ease: [0.16, 1, .3, 1] }} className="auth-showcase">
          <div className="auth-showcase-top"><p className="eyebrow text-white/65 before:bg-mint">A five-minute first orbit</p><span className="auth-live-dot">How it works</span></div>
          <div className="auth-orbit-stage" aria-hidden="true">
            <div className="auth-orbit auth-orbit-outer"><span className="auth-orbit-node auth-node-sun" /></div>
            <div className="auth-orbit auth-orbit-middle"><span className="auth-orbit-node auth-node-sky" /></div>
            <div className="auth-orbit auth-orbit-inner"><span className="auth-orbit-node auth-node-mint" /></div>
            <div className="auth-core"><Orbit size={44} /><span>YOUR<br />MATERIAL</span></div>
            <div className="auth-float-card auth-float-source"><FileText size={17} /><span>Source</span></div>
            <div className="auth-float-card auth-float-deck"><Sparkles size={17} /><span>Deck</span></div>
          </div>
          <div className="auth-steps" role="tablist" aria-label="How Curator works">
            {flowSteps.map((step, index) => {
              const StepIcon = step.icon;
              return <button key={step.title} type="button" role="tab" aria-selected={activeStep === index} className={activeStep === index ? 'active' : ''} onClick={() => setActiveStep(index)}><span><StepIcon size={16} /></span><b>{String(index + 1).padStart(2, '0')}</b><em>{step.title}</em></button>;
            })}
          </div>
          <AnimatePresence mode="wait">
            <motion.article key={current.title} initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }} transition={{ duration: .25, ease: 'easeOut' }} className={`auth-step-card auth-step-${current.tint}`}>
              <span className="auth-step-icon"><CurrentIcon size={22} /></span>
              <div><p className="auth-step-route">{current.detail}</p><h2>{current.title}</h2><p>{current.description}</p></div>
            </motion.article>
          </AnimatePresence>
          <div className="auth-showcase-footer"><ShieldCheck size={17} /><span>No ready-made courses. No pretend progress. Just your material, shaped into a usable learning space.</span></div>
        </motion.section>
      </section>
    </main>
  );
}
