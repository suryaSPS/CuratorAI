import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Search, Plus, MoreVertical, CheckCircle2 } from 'lucide-react';

export default function Flashcards() {
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCard, setNewCard] = useState({ tag: '', q: '', a: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/flashcards')
      .then(res => res.json())
      .then(data => setFlashcards(data))
      .catch(err => console.error("Failed to load flashcards", err));
  }, []);

  const filteredCards = flashcards.filter(card => 
    card.q.toLowerCase().includes(search.toLowerCase()) || 
    card.tag.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCard.q || !newCard.a) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCard)
      });
      if (res.ok) {
        const addedCard = await res.json();
        setFlashcards([addedCard, ...flashcards]);
        setShowAddModal(false);
        setNewCard({ tag: '', q: '', a: '' });
      }
    } catch (error) {
      console.error("Failed to add card", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-primary mb-2">Active Deck</h1>
          <p className="text-on-surface-variant max-w-md leading-relaxed">
            Review and manage your auto-synthesized and custom flashcards.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search cards..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary w-64 transition-all"
            />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-primary text-white rounded-xl font-bold flex items-center gap-2 transition-transform hover:scale-95 duration-150 shadow-lg shadow-primary/20"
          >
            <Plus className="w-5 h-5" />
            Add Card
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredCards.map((card, i) => (
            <motion.div 
              key={card.id || i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-64 relative group"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-bold px-2 py-1 bg-secondary/10 text-secondary rounded-lg uppercase tracking-widest">
                  {card.tag}
                </span>
                <button className="text-slate-300 hover:text-primary transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 flex flex-col justify-center">
                <h3 className="text-lg font-bold text-primary mb-2 line-clamp-3">{card.q}</h3>
                <p className="text-sm text-slate-500 line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {card.a || "Answer hidden. Click to reveal."}
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-500">Mastery: {card.mastery}%</span>
                </div>
                {card.mastery > 80 && <CheckCircle2 className="w-4 h-4 text-secondary" />}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add Card Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/20 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-primary mb-6">Create Custom Card</h2>
            <form onSubmit={handleAddCard} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Tag</label>
                <input 
                  type="text" 
                  value={newCard.tag}
                  onChange={e => setNewCard({...newCard, tag: e.target.value})}
                  className="w-full px-4 py-3 bg-surface-container-low border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
                  placeholder="e.g., Physics"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Question *</label>
                <textarea 
                  required
                  value={newCard.q}
                  onChange={e => setNewCard({...newCard, q: e.target.value})}
                  className="w-full px-4 py-3 bg-surface-container-low border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary resize-none h-24"
                  placeholder="What is the speed of light?"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Answer *</label>
                <textarea 
                  required
                  value={newCard.a}
                  onChange={e => setNewCard({...newCard, a: e.target.value})}
                  className="w-full px-4 py-3 bg-surface-container-low border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary resize-none h-24"
                  placeholder="299,792,458 m/s"
                />
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-secondary text-white rounded-xl text-sm font-bold shadow-lg shadow-secondary/20 hover:scale-95 transition-transform disabled:opacity-70"
                >
                  {isSubmitting ? 'Saving...' : 'Save Card'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
