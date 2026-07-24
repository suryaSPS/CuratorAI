import { ArrowRight, BookOpen, BrainCircuit, MessageCircle, Orbit, Sparkles, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

const steps = [
  { icon: Upload, title: 'Bring a source', copy: 'Upload a PDF when you are ready to give the workspace context.' },
  { icon: Orbit, title: 'Follow the threads', copy: 'Move through a clear outline built from the material you chose.' },
  { icon: MessageCircle, title: 'Think out loud', copy: 'Use the tutor to explore ideas and collect what becomes testable.' },
];

export default function Landing() {
  const navigate = useNavigate();
  return (
    <main className="app-background min-h-screen overflow-hidden">
      <nav className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-5 py-5 sm:px-8">
        <button onClick={() => navigate('/')} className="flex items-center gap-3 text-left" aria-label="Open Curator">
          <span className="brand-mark" aria-hidden="true" />
          <span className="font-display text-xl font-bold tracking-[-.07em] text-ink">Curator</span>
        </button>
        <div className="flex items-center gap-2"><ThemeToggle /><button className="hidden min-h-11 px-3 text-sm font-extrabold text-ink transition-opacity hover:opacity-65 sm:inline-flex" onClick={() => navigate('/auth?mode=login')}>Sign in</button><button className="button-primary" onClick={() => navigate('/auth')}>Create your space <ArrowRight size={16} /></button></div>
      </nav>

      <section className="relative mx-auto grid min-h-[680px] max-w-[1400px] items-center gap-12 px-5 pb-20 pt-8 sm:px-8 lg:grid-cols-[1fr_.9fr]">
        <div className="relative z-10 max-w-3xl">
          <p className="eyebrow">A learning studio for your own material</p>
          <h1 className="display-title mt-6 max-w-3xl">Your notes deserve more than a folder.</h1>
          <p className="mt-7 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">Curator helps you turn material into a path you can see, a conversation you can use, and a deck that stays close to what you are learning.</p>
          <div className="mt-9 flex flex-wrap gap-3"><button className="button-primary" onClick={() => navigate('/auth')}><Sparkles size={17} />Open the observatory</button><button className="button-secondary" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>See the flow <ArrowRight size={16} /></button></div>
        </div>
        <div className="relative mx-auto w-full max-w-[510px] aspect-square" aria-hidden="true">
          <div className="absolute inset-[8%] rounded-full border border-ink/15 bg-white/35 shadow-[inset_0_0_80px_rgba(140,186,255,.18)]" />
          <div className="absolute inset-[18%] rounded-full border border-dashed border-ink/20" />
          <div className="absolute inset-[32%] grid place-items-center rounded-full bg-ink shadow-[0_0_0_22px_rgba(255,212,107,.26),0_18px_52px_rgba(27,34,53,.22)]"><BrainCircuit className="text-sun" size={48} /></div>
          <div className="absolute left-[6%] top-[22%] grid h-16 w-16 place-items-center rounded-2xl border border-ink/10 bg-white/90 text-ink shadow-lg rotate-[-12deg]"><BookOpen size={25} /></div>
          <div className="absolute bottom-[17%] right-[2%] grid h-16 w-16 place-items-center rounded-full bg-mint text-ink shadow-lg rotate-[11deg]"><MessageCircle size={25} /></div>
          <div className="absolute right-[24%] top-[3%] h-8 w-8 rounded-full bg-coral shadow-[0_0_0_10px_rgba(255,156,122,.16)]" />
          <div className="absolute bottom-[4%] left-[22%] h-5 w-5 rounded-full bg-sky shadow-[0_0_0_9px_rgba(140,186,255,.18)]" />
        </div>
      </section>

      <section id="how-it-works" className="border-y border-ink/10 bg-white/45 py-20">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8"><p className="eyebrow">How a study space takes shape</p><div className="mt-5 grid gap-6 lg:grid-cols-[.65fr_1.35fr]"><h2 className="section-title text-4xl sm:text-5xl">Start with what is already on your desk.</h2><p className="max-w-2xl self-end text-base leading-8 text-slate-600">There is no suggested curriculum or simulated progress. The workspace begins empty and responds to the sources and questions you bring to it.</p></div>
          <div className="mt-11 grid gap-4 md:grid-cols-3">{steps.map((step, index) => <article key={step.title} className="panel p-6"><div className="flex items-center justify-between"><span className="font-mono text-[10px] text-slate-500">0{index + 1}</span><div className="grid h-11 w-11 place-items-center rounded-2xl bg-mist text-ink"><step.icon size={20} /></div></div><h3 className="mt-10 font-display text-2xl font-bold tracking-[-.05em] text-ink">{step.title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{step.copy}</p></article>)}</div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1240px] gap-5 px-5 py-20 sm:px-8 lg:grid-cols-[1.12fr_.88fr]">
        <div className="panel-dark p-8 sm:p-10"><p className="eyebrow text-white/70 before:bg-sun">The signature move</p><h2 className="mt-5 max-w-xl font-display text-4xl font-bold leading-[.95] tracking-[-.07em] text-white">A course that forms around your questions.</h2><p className="mt-6 max-w-lg text-sm leading-7 text-white/70">Every chat is grounded in the active course. When the conversation reveals a meaningful concept, Curator can fold it into your active deck for review.</p><button className="button-secondary mt-8 !border-white/20 !bg-white/10 !text-white hover:!bg-white/20" onClick={() => navigate('/sessions')}>Start a session <ArrowRight size={16} /></button></div>
        <div className="panel p-8 sm:p-10"><p className="eyebrow">Designed for a clear head</p><ul className="mt-8 space-y-6">{[['One source of truth','Your PDF becomes the context for outlines and flashcards.'],['A deck that follows you','Manual cards and extracted concepts remain in the same place.'],['Signals, not theatre','Analytics are calculated from your actual study events.']].map(([title, text]) => <li key={title} className="border-b border-line pb-6 last:border-0 last:pb-0"><p className="font-display text-xl font-bold tracking-[-.04em] text-ink">{title}</p><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></li>)}</ul></div>
      </section>

      <footer className="border-t border-ink/10 px-5 py-8 sm:px-8"><div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-2"><span className="brand-mark scale-75 origin-left" aria-hidden="true" /><span className="font-mono text-[10px] uppercase tracking-[.12em] text-slate-500">A quieter way to learn</span></div><button className="text-sm font-extrabold text-ink underline decoration-sun decoration-4 underline-offset-4" onClick={() => navigate('/auth')}>Create your space</button></div></footer>
    </main>
  );
}
