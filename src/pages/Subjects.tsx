import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Clock3, FileUp, Layers3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Subject = { id: number; name: string; progress: number; totalMessages: number; lastActive: string };

export default function Subjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const navigate = useNavigate();
  useEffect(() => { fetch('/api/subjects').then((r) => r.json()).then(setSubjects).catch(() => undefined); }, []);
  return <div className="page page-enter space-y-6">
    <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="eyebrow">Course shelf</p><h1 className="display-title mt-4 text-5xl sm:text-6xl">Learning maps.</h1><p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">Each source becomes a course with its own outline, conversations, and mastery signal.</p></div><button className="button-primary" onClick={() => navigate('/')}><FileUp size={17} />Add a source</button></section>
    {subjects.length ? <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{subjects.map((subject, index) => <article key={subject.id} className="panel group p-6"><div className="flex items-start justify-between"><div className={`grid h-12 w-12 place-items-center rounded-2xl ${index % 3 === 0 ? 'bg-sun' : index % 3 === 1 ? 'bg-mint' : 'bg-sky/40'} text-ink`}><BookOpen size={21} /></div><span className="font-mono text-[10px] text-slate-500">{subject.progress}%</span></div><h2 className="mt-10 text-2xl font-display font-bold tracking-[-.055em] text-ink">{subject.name}</h2><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500"><span className="flex items-center gap-1.5"><Clock3 size={13} />Active {subject.lastActive}</span><span className="flex items-center gap-1.5"><Layers3 size={13} />{subject.totalMessages} messages</span></div><div className="progress-track mt-7"><div className="progress-fill" style={{ width: `${subject.progress}%` }} /></div><button onClick={() => navigate('/sessions')} className="mt-5 flex items-center gap-2 text-sm font-extrabold text-ink underline decoration-sky decoration-4 underline-offset-4">Open course <ArrowRight size={16} /></button></article>)}</section> : <section className="panel mx-auto max-w-2xl p-8 text-center sm:p-12"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-sun text-ink"><BookOpen size={25} /></div><h2 className="mt-6 font-display text-3xl font-bold tracking-[-.06em] text-ink">Your first map starts with a source.</h2><p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-600">Upload a PDF from the dashboard. Curator will turn it into an outline you can explore.</p><button className="button-primary mt-7" onClick={() => navigate('/')}><FileUp size={17} />Go to sources</button></section>}
  </div>;
}
