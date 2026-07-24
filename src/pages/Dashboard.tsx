import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, BrainCircuit, FileUp, Layers3, Loader2, MessageCircle, Sparkles, Upload, WandSparkles } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useNavigate } from 'react-router-dom';

type Subject = { id: number; name: string; progress: number; totalMessages: number; lastActive: string };
type WeakArea = { tag: string; avgMastery: number; topQuestion: string };
type Course = { title: string; outline: Array<{ title: string; description: string; status: string }> };
type Context = { course: Course | null; flashcards: Array<{ id: number }>; sessionCount: number };
type Activity = { name: string; messages: number; concepts: number };

export default function Dashboard() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [user, setUser] = useState<{ name: string | null } | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([]);
  const [context, setContext] = useState<Context>({ course: null, flashcards: [], sessionCount: 0 });
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/user').then((r) => r.json()).then(setUser).catch(() => undefined);
    fetch('/api/subjects').then((r) => r.json()).then(setSubjects).catch(() => undefined);
    fetch('/api/analytics').then((r) => r.json()).then((data) => setActivity(data.studyTimeData ?? [])).catch(() => undefined);
    fetch('/api/weak-areas').then((r) => r.json()).then(setWeakAreas).catch(() => undefined);
    fetch('/api/context').then((r) => r.json()).then(setContext).catch(() => undefined);
  }, []);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    const body = new FormData();
    body.append('file', file);
    try {
      const response = await fetch('/api/upload-pdf', { method: 'POST', body });
      if (!response.ok) throw new Error('Upload failed');
      window.dispatchEvent(new CustomEvent('course-updated'));
      navigate('/sessions');
    } catch {
      setUploadError('The PDF could not be processed. Check the file and try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const course = context.course;
  const activeOutline = course?.outline.find((item) => item.status === 'active');

  return (
    <div className="page page-enter space-y-5">
      <section className="panel-dark min-h-[350px] p-6 sm:p-9 lg:p-12">
        <div className="orbital -right-[10%] -top-[32%] w-[430px] opacity-70" />
        <div className="orbital -right-[1%] top-[20%] w-[255px] opacity-50" />
        <div className="relative max-w-2xl">
          <p className="eyebrow text-white/70 before:bg-mint">Your learning observatory</p>
          <h1 className="mt-5 max-w-xl font-display text-4xl font-bold leading-[.95] tracking-[-.07em] text-white sm:text-6xl">
            {course ? `Return to ${course.title}.` : user?.name ? `A clear space to learn, ${user.name}.` : 'Make room for what you want to know.'}
          </h1>
          <p className="mt-5 max-w-xl text-sm font-medium leading-7 text-white/90 sm:text-base">
            {course
              ? activeOutline ? `Your active thread: ${activeOutline.title}.` : 'Your course is ready whenever you are.'
              : 'Bring in a PDF, then Curator turns the material into a course, a conversation, and a deck you can actually use.'}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button className="button-primary !border-[#111522]/20 !bg-sun !text-[#111522] !shadow-[0_6px_0_#ff9c7a] hover:!bg-[#ffe08b]" onClick={() => course ? navigate('/sessions') : fileInputRef.current?.click()}>
              {course ? <><Sparkles size={17} />Continue the thread</> : <><Upload size={17} />Add a source</>}
            </button>
            <button className="button-secondary !border-white/35 !bg-white/10 !text-white hover:!bg-white/20" onClick={() => navigate('/flashcards')}>
              <BookOpen size={17} />Open deck
            </button>
          </div>
        </div>
        <div className="relative mt-10 grid max-w-2xl grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/12 bg-white/12 sm:mt-14">
          {[
            ['Courses', subjects.length],
            ['Cards', context.flashcards.length],
            ['Sessions', context.sessionCount],
          ].map(([label, value]) => (
            <div key={String(label)} className="bg-[#1b2235]/60 px-3 py-4 sm:px-5">
              <p className="font-mono text-[9px] uppercase tracking-[.12em] text-white/55">{label}</p>
              <p className="mt-1 font-display text-2xl font-bold tracking-[-.06em] text-white">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleUpload} />

      <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
        <section className="panel p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Source studio</p>
              <h2 className="section-title mt-3">Turn reading into a living course.</h2>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-mint text-ink"><WandSparkles size={20} /></div>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">A single PDF gives Curator the context to organize your study path and draw out testable concepts.</p>
          <div className="mt-7 flex flex-col items-start justify-between gap-4 rounded-2xl border border-dashed border-ink/20 bg-mist/65 p-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-white text-ink shadow-sm"><FileUp size={20} /></div>
              <div><p className="text-sm font-extrabold text-ink">Choose a PDF</p><p className="mt-0.5 text-xs text-slate-500">Up to 10 MB · processed in this session</p></div>
            </div>
            <button className="button-primary" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              {isUploading ? <><Loader2 className="animate-spin" size={17} />Reading it</> : <><Upload size={17} />Upload</>}
            </button>
          </div>
          {uploadError && <p className="mt-3 text-sm font-semibold text-red-700" role="alert">{uploadError}</p>}
        </section>

        <section className="panel p-6 sm:p-8">
          <p className="eyebrow">Now in orbit</p>
          {course ? (
            <>
              <div className="mt-4 flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky/30 text-ink"><Layers3 size={20} /></div><div><h2 className="section-title text-xl">{course.title}</h2><p className="mt-1 text-sm text-slate-600">{course.outline.length} learning threads</p></div></div>
              <div className="mt-7 space-y-3">{course.outline.slice(0, 3).map((item) => <div key={item.title} className="flex gap-3 text-sm"><span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${item.status === 'completed' ? 'bg-mint' : item.status === 'active' ? 'bg-sun shadow-[0_0_0_4px_rgba(255,212,107,.25)]' : 'bg-line'}`} /><span className="font-semibold text-ink">{item.title}</span></div>)}</div>
              <button className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-ink underline decoration-sky decoration-4 underline-offset-4" onClick={() => navigate('/sessions')}>Open workspace <ArrowRight size={16} /></button>
            </>
          ) : <div className="mt-6 rounded-2xl bg-sky/15 p-5"><BrainCircuit size={23} className="text-ink" /><p className="mt-4 text-sm font-bold text-ink">No course selected</p><p className="mt-1 text-sm leading-6 text-slate-600">Add a source to build your first learning map.</p></div>}
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <section className="panel p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4"><div><p className="eyebrow">Learning weather</p><h2 className="section-title mt-3">Your last seven days</h2></div><MessageCircle size={20} className="text-slate-500" /></div>
          <div className="mt-6 h-52"><ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={208} initialDimension={{ width: 1, height: 208 }}><BarChart data={activity} margin={{ top: 8, right: 0, left: -28, bottom: 0 }}><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#667085', fontSize: 10, fontWeight: 700 }} /><YAxis hide /><Tooltip cursor={{ fill: 'rgba(140,186,255,.12)' }} contentStyle={{ borderRadius: 14, border: '1px solid #dce0d5', boxShadow: 'none' }} /><Bar dataKey="messages" fill="#8cbaff" radius={[7, 7, 0, 0]} barSize={18} /><Bar dataKey="concepts" fill="#8bdcba" radius={[7, 7, 0, 0]} barSize={18} /></BarChart></ResponsiveContainer></div>
          <div className="mt-4 flex gap-4 font-mono text-[10px] uppercase tracking-wider text-slate-500"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-sky" />Messages</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-mint" />Concepts</span></div>
        </section>

        <section className="panel p-6 sm:p-8">
          <div className="flex items-center justify-between"><div><p className="eyebrow">Return to</p><h2 className="section-title mt-3">Review queue</h2></div><button className="icon-button" onClick={() => navigate('/flashcards')} aria-label="Open flashcards"><ArrowRight size={17} /></button></div>
          {weakAreas.length ? <div className="mt-6 space-y-3">{weakAreas.map((area) => <button key={area.tag} onClick={() => navigate('/flashcards')} className="group w-full rounded-2xl bg-mist/75 p-4 text-left transition-colors hover:bg-sun/45"><div className="flex items-center justify-between gap-3"><span className="text-sm font-extrabold text-ink">{area.tag}</span><span className="font-mono text-[10px] text-slate-500">{area.avgMastery}%</span></div><p className="mt-2 line-clamp-1 text-xs text-slate-600">{area.topQuestion}</p></button>)}</div> : <div className="mt-6 rounded-2xl bg-mist/70 p-5"><p className="text-sm font-bold text-ink">Nothing needs attention yet.</p><p className="mt-1 text-sm leading-6 text-slate-600">Review cards to surface the topics worth revisiting.</p></div>}
        </section>
      </div>

      <section className="panel p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4"><div><p className="eyebrow">Course shelf</p><h2 className="section-title mt-3">Your learning maps</h2></div><button className="button-secondary" onClick={() => navigate('/subjects')}>See all <ArrowRight size={16} /></button></div>
        {subjects.length ? <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{subjects.slice(0, 3).map((subject) => <button key={subject.id} onClick={() => navigate('/sessions')} className="group rounded-2xl border border-line bg-white/50 p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:border-ink/25 hover:shadow-lg"><div className="flex justify-between gap-3"><BookOpen size={19} className="text-ink" /><span className="font-mono text-[10px] text-slate-500">{subject.progress}%</span></div><h3 className="mt-8 text-lg font-extrabold tracking-tight text-ink">{subject.name}</h3><p className="mt-1 text-xs text-slate-500">Active {subject.lastActive}</p><div className="progress-track mt-5"><div className="progress-fill" style={{ width: `${subject.progress}%` }} /></div></button>)}</div> : <div className="mt-7 rounded-2xl border border-dashed border-line p-8 text-center"><p className="font-display text-xl font-bold tracking-tight text-ink">Your shelf is waiting.</p><p className="mt-2 text-sm text-slate-600">Sources you add will appear here as courses.</p></div>}
      </section>
    </div>
  );
}
