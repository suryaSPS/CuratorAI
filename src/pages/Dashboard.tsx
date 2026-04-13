import React, { useState, useRef, useEffect } from 'react';
import {
  PlayCircle,
  BookOpen,
  Timer,
  Brain,
  Zap,
  Plus,
  UploadCloud,
  FileText,
  Loader2,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [weakAreas, setWeakAreas] = useState<any[]>([]);
  const [currentCourse, setCurrentCourse] = useState<any>(null);

  useEffect(() => {
    fetch('/api/user')
      .then((r) => r.json())
      .then(setUser)
      .catch(() => {});

    fetch('/api/subjects')
      .then((r) => r.json())
      .then(setSubjects)
      .catch(() => {});

    fetch('/api/analytics')
      .then((r) => r.json())
      .then((data) => setActivityData(data.studyTimeData ?? []))
      .catch(() => {});

    fetch('/api/weak-areas')
      .then((r) => r.json())
      .then(setWeakAreas)
      .catch(() => {});

    fetch('/api/context')
      .then((r) => r.json())
      .then((data) => setCurrentCourse(data.course))
      .catch(() => {});
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload-pdf', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Upload failed');
      // Notify Sidebar to refresh its course title
      window.dispatchEvent(new CustomEvent('course-updated'));
      navigate('/sessions');
    } catch {
      alert('Failed to process PDF. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const topSubjects = subjects.slice(0, 2);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Welcome Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-primary mb-2">
            Welcome Back, {user?.name ?? '...'}.
          </h1>
          <p className="text-on-surface-variant max-w-md leading-relaxed">
            {currentCourse ? (
              <>
                You're currently studying{' '}
                <span className="text-secondary font-semibold">{currentCourse.title}</span>. Shall we
                continue?
              </>
            ) : (
              <>Upload a PDF below to create your first personalized course.</>
            )}
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/sessions')}
            className="px-6 py-3 bg-gradient-to-r from-primary-container to-primary text-white rounded-xl font-bold flex items-center gap-2 transition-transform hover:scale-95 duration-150 shadow-lg shadow-primary/20"
          >
            <PlayCircle className="w-5 h-5" />
            Start New Session
          </button>
          <button
            onClick={() => navigate('/flashcards')}
            className="px-6 py-3 bg-white text-primary border border-slate-200 rounded-xl font-bold flex items-center gap-2 transition-transform hover:scale-95 duration-150 shadow-sm"
          >
            <BookOpen className="w-5 h-5" />
            Review Flashcards
          </button>
        </div>
      </section>

      {/* Grid Layout */}
      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Main Column */}
        <div className="col-span-12 lg:col-span-8 space-y-8">

          {/* PDF Upload */}
          <div className="bg-gradient-to-br from-secondary-container/20 to-transparent p-8 rounded-3xl border border-secondary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -z-10"></div>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary/10 text-secondary rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 border border-secondary/20">
                  <Sparkles className="w-3 h-3" /> Multimodal AI
                </div>
                <h3 className="text-2xl font-bold text-primary mb-2">Custom Knowledge Synthesis</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed mb-6">
                  Upload any PDF (lecture notes, research papers, book chapters). Gemini will analyze
                  its structure, generate a learning outline, and extract testable flashcards into
                  your active deck.
                </p>
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-6 py-3 bg-secondary text-white rounded-xl font-bold flex items-center gap-2 transition-all hover:scale-[0.98] shadow-lg shadow-secondary/20 disabled:opacity-70 disabled:hover:scale-100"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Synthesizing Knowledge...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-5 h-5" />
                      Upload PDF Material
                    </>
                  )}
                </button>
              </div>
              <div
                className="hidden md:flex w-48 h-48 bg-white rounded-2xl shadow-xl shadow-primary/5 border border-slate-100 items-center justify-center relative group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="absolute inset-4 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 group-hover:border-secondary transition-colors">
                  <FileText className="w-8 h-8 text-slate-300 group-hover:text-secondary transition-colors" />
                  <span className="text-xs font-bold text-slate-400 group-hover:text-secondary transition-colors">
                    Drag & Drop PDF
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Curated Mastery Paths */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-primary">Curated Mastery Paths</h3>
              <button
                onClick={() => navigate('/subjects')}
                className="text-secondary text-sm font-bold uppercase tracking-widest hover:underline"
              >
                View All
              </button>
            </div>

            {topSubjects.length === 0 ? (
              <div className="text-center py-12 text-on-surface-variant">
                <Brain className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="font-semibold text-primary mb-1">No subjects yet</p>
                <p className="text-sm">Upload a PDF above to generate your first course.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {topSubjects.map((subject, i) => (
                  <motion.div
                    key={subject.id}
                    whileHover={{ y: -5 }}
                    onClick={() => navigate('/sessions')}
                    className="group relative p-6 bg-surface-container-low rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden border border-transparent hover:border-secondary/20 hover:shadow-xl hover:shadow-primary/5"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      {i === 0 ? <Brain className="w-16 h-16" /> : <Zap className="w-16 h-16" />}
                    </div>
                    <div className="relative z-10">
                      <h4 className="text-lg font-bold text-primary mb-2">{subject.name}</h4>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full mb-4 overflow-hidden">
                        <div
                          className="h-full bg-secondary rounded-full"
                          style={{ width: `${subject.progress}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center text-xs text-on-surface-variant font-medium">
                        <span>{subject.progress}% Mastery</span>
                        <span className="flex items-center gap-1">
                          <Timer className="w-3.5 h-3.5" /> Active {subject.lastActive}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Momentum Chart */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-primary">Activity Momentum</h3>
              <div className="flex items-center gap-4 text-xs font-bold text-on-surface-variant">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-secondary"></span> Messages
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-tertiary-fixed"></span> Concepts
                </span>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={activityData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Bar dataKey="messages" fill="#006684" radius={[4, 4, 0, 0]} barSize={32} />
                  <Bar dataKey="concepts" fill="#9bf3df" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          {/* Weak Areas (computed from real flashcard mastery) */}
          <div className="bg-primary-container p-8 rounded-3xl text-white shadow-2xl shadow-primary-container/30 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-secondary-container/20 blur-[60px] rounded-full"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <Brain className="text-secondary-container w-6 h-6" />
                <h3 className="text-lg font-bold">Weak Areas</h3>
              </div>

              {weakAreas.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-blue-100 text-sm leading-relaxed">
                    No weak areas detected yet. Start studying and reviewing flashcards to see
                    personalized insights.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-blue-100 text-sm leading-relaxed mb-6">
                    Based on your flashcard mastery scores, these topics need attention.
                  </p>
                  <div className="space-y-4">
                    {weakAreas.map((area, i) => (
                      <div
                        key={i}
                        className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="text-sm font-bold">{area.tag}</h5>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded border ${
                              area.avgMastery < 30
                                ? 'bg-red-500/20 text-red-200 border-red-500/30'
                                : 'bg-secondary-container/20 text-secondary-container border-secondary-container/30'
                            }`}
                          >
                            {area.avgMastery}% MASTERY
                          </span>
                        </div>
                        {area.topQuestion && (
                          <p className="text-xs text-blue-100/80 group-hover:text-white line-clamp-2">
                            {area.topQuestion}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              <button
                onClick={() => navigate('/flashcards')}
                className="w-full mt-8 py-3 bg-secondary-container text-primary font-bold rounded-xl text-sm hover:scale-[0.98] transition-transform"
              >
                Review Flashcards
              </button>
            </div>
          </div>

          {/* Active Course Card */}
          <div className="bg-surface-container-low p-8 rounded-3xl border border-slate-100">
            <h3 className="text-lg font-bold text-primary mb-6">Active Course</h3>
            {currentCourse ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-primary leading-tight">
                      {currentCourse.title}
                    </h4>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {currentCourse.outline?.length ?? 0} topics in outline
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/sessions')}
                  className="w-full py-3 bg-secondary text-white font-bold rounded-xl text-sm hover:scale-[0.98] transition-transform"
                >
                  Continue Studying
                </button>
              </div>
            ) : (
              <div className="text-center py-4 text-on-surface-variant">
                <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">No active course. Upload a PDF to get started.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-secondary-container to-secondary text-white rounded-2xl shadow-xl shadow-secondary/40 flex items-center justify-center group hover:scale-110 transition-all duration-300 z-50"
      >
        <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform" />
      </button>
    </div>
  );
}
