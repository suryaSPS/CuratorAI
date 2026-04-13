import { motion } from 'motion/react';
import { HelpCircle, MessageCircle, FileText, ExternalLink } from 'lucide-react';

export default function Help() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-4xl">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-primary mb-2">Help & Support</h1>
        <p className="text-on-surface-variant max-w-md leading-relaxed">
          Need assistance? Find answers to common questions or reach out to our team.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: FileText, title: 'Documentation', desc: 'Read detailed guides on how to use Curator AI effectively.' },
          { icon: MessageCircle, title: 'Community Forum', desc: 'Connect with other learners and share study strategies.' },
          { icon: HelpCircle, title: 'Contact Support', desc: 'Get in touch with our support team for technical issues.' },
        ].map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:border-secondary/30 transition-colors cursor-pointer group">
            <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <item.icon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-primary mb-2">{item.title}</h3>
            <p className="text-sm text-slate-500 mb-4">{item.desc}</p>
            <span className="text-xs font-bold text-secondary flex items-center gap-1 uppercase tracking-widest">
              Learn More <ExternalLink className="w-3 h-3" />
            </span>
          </div>
        ))}
      </div>

      <div className="bg-primary-container text-white p-8 rounded-3xl relative overflow-hidden mt-8">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-secondary rounded-full blur-[80px] opacity-30"></div>
        <h2 className="text-2xl font-bold mb-4 relative z-10">Frequently Asked Questions</h2>
        <div className="space-y-4 relative z-10">
          {[
            { q: 'How does the Custom Knowledge Synthesis work?', a: 'When you upload a PDF, our AI analyzes the text, extracts key concepts, and automatically generates a structured outline and a set of flashcards tailored to that specific document.' },
            { q: 'Can I export my flashcards?', a: 'Yes! You can export your flashcards to CSV or Anki format from the Active Deck page.' },
            { q: 'How is my mastery score calculated?', a: 'Mastery is calculated based on your performance during study sessions, taking into account both accuracy and the time taken to answer.' },
          ].map((faq, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/10">
              <h4 className="font-bold mb-2">{faq.q}</h4>
              <p className="text-sm text-white/80 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
