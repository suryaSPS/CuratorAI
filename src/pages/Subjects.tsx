import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Clock, ChevronRight, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Subjects() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/subjects')
      .then(res => res.json())
      .then(data => setSubjects(data))
      .catch(err => console.error("Failed to load subjects", err));
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-primary mb-2">Curated Subjects</h1>
          <p className="text-on-surface-variant max-w-md leading-relaxed">
            Your active learning roadmaps and mastery progression.
          </p>
        </div>
        <button className="px-6 py-3 bg-primary text-white rounded-xl font-bold flex items-center gap-2 transition-transform hover:scale-95 duration-150 shadow-lg shadow-primary/20">
          <Plus className="w-5 h-5" />
          Add Subject
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((subject, i) => (
          <motion.div 
            key={subject.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => navigate('/sessions')}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:border-secondary/30 hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-secondary/10 group-hover:text-secondary transition-colors">
                <BookOpen className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded-lg uppercase tracking-widest group-hover:bg-secondary/10 group-hover:text-secondary transition-colors">
                {subject.progress}% Mastered
              </span>
            </div>
            
            <h3 className="text-xl font-bold text-primary mb-2">{subject.name}</h3>
            
            <div className="flex items-center gap-4 text-xs font-medium text-slate-500 mb-6">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {subject.totalHours}h invested</span>
              <span>•</span>
              <span>Active {subject.lastActive}</span>
            </div>

            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
              <div 
                className="h-full bg-secondary rounded-full transition-all duration-1000" 
                style={{ width: `${subject.progress}%` }}
              ></div>
            </div>

            <div className="flex justify-end">
              <span className="text-sm font-bold text-secondary flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Continue <ChevronRight className="w-4 h-4" />
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
