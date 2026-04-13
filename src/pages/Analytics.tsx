import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Download, Brain, Zap, MessageSquare, Layers, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';

export default function Analytics() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/analytics')
      .then((res) => res.json())
      .then(setData)
      .catch((err) => console.error('Failed to load analytics', err));
  }, []);

  if (!data) return <div className="p-8 text-center text-slate-500">Loading analytics...</div>;

  const metrics = [
    {
      label: 'Messages Sent',
      value: data.totalMessages,
      unit: '',
      trend: 'Total interactions',
      color: 'border-secondary-container',
      icon: MessageSquare,
    },
    {
      label: 'Concepts Extracted',
      value: data.totalConcepts,
      unit: '',
      trend: 'Auto-synthesized by AI',
      color: 'border-tertiary-fixed',
      icon: Zap,
    },
    {
      label: 'Avg Mastery',
      value: data.masteryGrade,
      unit: '',
      trend:
        data.avgMastery > 0
          ? `${data.avgMastery}% across ${data.totalCards} cards`
          : 'No cards yet',
      color: 'border-primary-container',
      icon: Brain,
    },
    {
      label: 'Study Sessions',
      value: data.sessionCount,
      unit: '',
      trend: 'Total sessions started',
      color: 'border-secondary-fixed-dim',
      icon: Layers,
    },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="text-xs font-bold tracking-[0.2em] text-cyan-600 uppercase mb-2 block">
            Performance Insight
          </span>
          <h2 className="text-4xl font-extrabold text-primary tracking-tighter">
            Student Analytics
          </h2>
          <p className="text-on-surface-variant max-w-md mt-2">
            Real-time tracking of your study activity, concept extraction, and knowledge mastery.
          </p>
        </div>
        <button className="flex items-center gap-2 bg-secondary-container text-primary px-6 py-3 rounded-xl text-sm font-bold hover:shadow-lg transition-all active:scale-95">
          <Download className="w-4 h-4" />
          Export Data
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {metrics.map((metric, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`bg-white p-6 rounded-2xl border-l-4 ${metric.color} shadow-sm border-y border-r border-slate-100`}
          >
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
              {metric.label}
            </p>
            <h3 className="text-3xl font-black text-primary">
              {metric.value}
              {metric.unit && (
                <span className="text-lg font-medium ml-1">{metric.unit}</span>
              )}
            </h3>
            <div className="flex items-center gap-1 mt-2 text-slate-500 text-xs font-bold">
              <TrendingUp className="w-3.5 h-3.5" />
              {metric.trend}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-12 gap-6">
        {/* Activity Chart */}
        <div className="col-span-12 lg:col-span-8 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="text-xl font-bold text-primary">Study Activity</h4>
              <p className="text-sm text-on-surface-variant">
                Messages sent and concepts extracted per day (last 7 days)
              </p>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 px-3 py-1 bg-surface-container-low rounded-lg text-xs font-bold text-primary">
                <div className="w-2 h-2 rounded-full bg-secondary"></div> Messages
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-surface-container-low rounded-lg text-xs font-bold text-primary">
                <div className="w-2 h-2 rounded-full bg-tertiary-fixed-dim"></div> Concepts
              </div>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.studyTimeData}
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
                <Bar dataKey="messages" stackId="a" fill="#006684" radius={[4, 4, 0, 0]} barSize={40} />
                <Bar dataKey="concepts" stackId="a" fill="#7fd6c3" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subject Mastery */}
        <div className="col-span-12 lg:col-span-4 bg-primary-container text-white rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-secondary rounded-full blur-[60px] opacity-20"></div>
          <h4 className="text-xl font-bold mb-6">Subject Mastery</h4>

          {data.subjectMastery.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-blue-100 text-sm">
                Upload a PDF to start tracking subject mastery.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {data.subjectMastery.map((subject: any) => (
                <div key={subject.name}>
                  <div className="flex justify-between text-sm font-bold mb-2">
                    <span className="truncate pr-2">{subject.name}</span>
                    <span className="text-secondary-container shrink-0">{subject.score}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${subject.score}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="h-full bg-secondary-container rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-12 gap-6">
        {/* Recently Extracted Concepts */}
        <div className="col-span-12 lg:col-span-7 bg-surface-container-low rounded-3xl p-8 border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-xl font-bold text-primary">Recently Extracted Concepts</h4>
            <button
              onClick={() => navigate('/flashcards')}
              className="text-sm font-bold text-secondary flex items-center gap-1"
            >
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {data.recentConcepts.length === 0 ? (
            <div className="text-center py-12 text-on-surface-variant">
              <Zap className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="font-semibold text-primary mb-1">No concepts extracted yet</p>
              <p className="text-sm">
                Start a study session — the AI will autonomously extract key concepts into your
                flashcard deck.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.recentConcepts.map((concept: any, i: number) => (
                <motion.div
                  key={i}
                  whileHover={{ x: 10 }}
                  className="bg-white p-4 rounded-2xl flex items-center justify-between shadow-sm border border-slate-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                      <Zap className="w-6 h-6" />
                    </div>
                    <div>
                      <h5 className="font-bold text-primary line-clamp-1">{concept.question}</h5>
                      <p className="text-xs text-on-surface-variant">Tag: {concept.tag}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-lg font-black text-primary">{concept.mastery}%</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">
                      MASTERY
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Concepts Per Session */}
        <div className="col-span-12 lg:col-span-5 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
          <h4 className="text-xl font-bold text-primary mb-2">Extraction Rate</h4>
          <p className="text-sm text-on-surface-variant mb-8">
            AI-extracted concepts per study session
          </p>
          <div className="relative h-48 flex items-center justify-center">
            <div className="w-40 h-40 rounded-full border-[12px] border-slate-100 flex items-center justify-center relative">
              {data.sessionCount > 0 && (
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle
                    className="text-secondary"
                    cx="80"
                    cy="80"
                    r="68"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="12"
                    strokeDasharray="427"
                    strokeDashoffset={
                      427 -
                      Math.min(
                        427,
                        (data.totalConcepts / Math.max(data.sessionCount, 1) / 10) * 427
                      )
                    }
                    strokeLinecap="round"
                  />
                </svg>
              )}
              <div className="text-center">
                <span className="text-4xl font-black text-primary leading-none">
                  {data.sessionCount > 0
                    ? (data.totalConcepts / data.sessionCount).toFixed(1)
                    : '—'}
                </span>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                  Concepts / Session
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="bg-surface-container-low p-4 rounded-2xl text-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Cards</p>
              <p className="text-lg font-bold text-primary">{data.totalCards}</p>
            </div>
            <div className="bg-surface-container-low p-4 rounded-2xl text-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Avg Mastery</p>
              <p className="text-lg font-bold text-primary">
                {data.avgMastery > 0 ? `${data.avgMastery}%` : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
