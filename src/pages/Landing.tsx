import { Sparkles, Brain, Zap, BookOpen, EyeOff, Palette, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-surface -m-8">
      {/* Hero Section */}
      <section className="relative w-full min-h-[600px] flex items-center bg-primary overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://picsum.photos/seed/abstract/1920/1080" 
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-30 mix-blend-screen"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-transparent"></div>
        </div>
        
        <div className="relative z-10 px-12 max-w-4xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 bg-secondary-container/20 border border-secondary-container/30 rounded-full mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse"></span>
            <span className="text-secondary-container text-xs font-bold uppercase tracking-widest font-headline">Intelligence Reimagined</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold text-white font-headline leading-[1.1] tracking-tight mb-6"
          >
            Unlock Your Full <br/><span className="text-secondary-container">Potential</span> with AI-Powered Learning
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-blue-100 text-xl max-w-2xl mb-10 font-light leading-relaxed"
          >
            Step into an editorial-inspired study environment where AI doesn't just answer questions—it curates a personal path to mastery.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-4"
          >
            <button className="px-8 py-4 bg-gradient-to-r from-secondary-container to-secondary text-primary font-bold rounded-xl shadow-lg shadow-secondary/20 hover:scale-105 transition-all">
              Get Started Free
            </button>
            <button className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition-all">
              View Demo
            </button>
          </motion.div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section className="px-12 py-24 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Large Focus Card */}
          <div className="md:col-span-2 p-10 rounded-3xl bg-surface-container-low flex flex-col justify-between group border border-slate-100">
            <div>
              <span className="text-secondary font-bold text-xs uppercase tracking-widest mb-4 block">Personalized Pathways</span>
              <h3 className="text-4xl font-bold text-primary font-headline mb-4">Adaptive Intelligence Curriculum</h3>
              <p className="text-on-surface-variant text-lg max-w-md">Our neural engine analyzes your learning speed, retention gaps, and focus hours to build a dynamic study map that evolves with you.</p>
            </div>
            <div className="mt-12 flex gap-4 overflow-hidden">
              {[
                { icon: Brain, color: 'text-secondary', progress: 75, delay: 0 },
                { icon: Zap, color: 'text-tertiary-fixed-dim', progress: 50, delay: 0.1 },
                { icon: BookOpen, color: 'text-primary-container', progress: 100, delay: 0.2 },
              ].map((item, i) => (
                <div key={i} className="h-40 w-1/3 bg-white rounded-2xl shadow-sm p-6 flex flex-col justify-between transform transition-transform group-hover:-translate-y-4 duration-500" style={{ transitionDelay: `${item.delay}s` }}>
                  <item.icon className={item.color} />
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      whileInView={{ width: `${item.progress}%` }}
                      className={`h-full ${item.color.replace('text-', 'bg-')}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vertical Side Card */}
          <div className="p-10 rounded-3xl bg-primary-container text-white flex flex-col shadow-xl shadow-primary/10">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6">
              <Sparkles className="text-secondary-container w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold font-headline mb-4">The Curator Assistant</h3>
            <p className="text-blue-100 mb-8">Instant context, deep-dives, and ethical synthesis on any topic you're studying.</p>
            <div className="mt-auto pt-6 border-t border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-primary">
                  <Zap className="w-4 h-4 fill-current" />
                </div>
                <span className="text-xs font-medium text-secondary-container uppercase tracking-widest">Active Listening</span>
              </div>
            </div>
          </div>
        </div>

        {/* Asymmetric Detail Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center py-24">
          <div className="relative">
            <div className="absolute -top-12 -left-12 w-64 h-64 bg-secondary-container/10 blur-[100px] rounded-full"></div>
            <div className="glass-card p-2 rounded-3xl shadow-2xl rotate-1 overflow-hidden">
              <img 
                src="https://picsum.photos/seed/ui/800/600" 
                alt="Interface" 
                className="rounded-2xl shadow-inner"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-10 -right-10 p-8 glass-panel rounded-3xl shadow-2xl border border-white/50 max-w-[240px]">
              <p className="text-[10px] uppercase font-bold tracking-widest text-secondary mb-2">Success Rate</p>
              <p className="text-4xl font-black text-primary">94%</p>
              <p className="text-xs text-on-surface-variant leading-relaxed mt-2">Retention improvement reported by premium scholars.</p>
            </div>
          </div>
          
          <div>
            <h2 className="text-5xl font-bold text-primary mb-8 leading-tight">Study without the <br/>Visual Noise.</h2>
            <p className="text-on-surface-variant text-xl mb-10 leading-relaxed">
              We've eliminated the clutter of traditional LMS platforms. Experience an editorial study interface that prioritizes readability and deep focus.
            </p>
            <ul className="space-y-8">
              <li className="flex items-start gap-6">
                <div className="w-12 h-12 shrink-0 bg-surface-container-high rounded-2xl flex items-center justify-center text-secondary">
                  <EyeOff className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-lg font-bold text-primary">Distraction-Free Mode</p>
                  <p className="text-on-surface-variant">Intelligent UI that hides non-essential tools during deep focus sessions.</p>
                </div>
              </li>
              <li className="flex items-start gap-6">
                <div className="w-12 h-12 shrink-0 bg-surface-container-high rounded-2xl flex items-center justify-center text-secondary">
                  <Palette className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-lg font-bold text-primary">Tonal Layering</p>
                  <p className="text-on-surface-variant">Adaptive color palettes designed to reduce eye strain over long study hours.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Final CTA */}
        <section className="mt-24 p-16 rounded-[3rem] bg-white text-center relative overflow-hidden border border-slate-100 shadow-2xl shadow-primary/5">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-secondary-container via-primary to-tertiary-fixed-dim"></div>
          <div className="max-w-2xl mx-auto">
            <h2 className="text-4xl font-black text-primary mb-4">Ready to evolve?</h2>
            <p className="text-on-surface-variant mb-12 text-xl">Join 50,000+ scholars who have transformed their learning workflow with The Digital Curator.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <input 
                type="email" 
                placeholder="scholar@university.edu" 
                className="px-6 py-4 bg-surface-container-low rounded-2xl border-none focus:ring-2 focus:ring-secondary w-full sm:w-96 outline-none"
              />
              <button className="px-10 py-4 bg-primary text-white font-bold rounded-2xl shadow-xl hover:bg-primary-container transition-all flex items-center justify-center gap-2">
                Reserve Access
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
