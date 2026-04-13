import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Search, Plus, MoreVertical, CheckCircle2, RotateCcw, ChevronRight, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';

// ---------- Review Mode ----------

function ReviewMode({ cards, onExit }: { cards: any[]; onExit: (updatedCards: any[]) => void }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<{ rating: string; delta: number }[]>([]);
  const [localCards, setLocalCards] = useState(cards.map((c) => ({ ...c })));
  const [done, setDone] = useState(false);

  const card = localCards[index];

  const handleRating = async (rating: 'again' | 'hard' | 'easy') => {
    const delta = rating === 'again' ? -20 : rating === 'hard' ? 5 : 15;
    const snapshot = localCards; // capture before optimistic update for rollback

    // Optimistic update locally
    const updated = localCards.map((c) =>
      c.id === card.id
        ? { ...c, mastery: Math.min(100, Math.max(0, c.mastery + delta)) }
        : c
    );
    setLocalCards(updated);
    setResults((prev) => [...prev, { rating, delta }]);

    // Persist to backend — revert if it fails
    try {
      const res = await fetch(`/api/flashcards/${card.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
    } catch (err) {
      console.error('Failed to save review rating — reverting', err);
      setLocalCards(snapshot);
      setResults((prev) => prev.slice(0, -1));
      return; // don't advance to next card
    }

    if (index + 1 >= localCards.length) {
      setDone(true);
    } else {
      setFlipped(false);
      setTimeout(() => setIndex((i) => i + 1), 150);
    }
  };

  if (done) {
    const improved = results.filter((r) => r.delta > 0).length;
    const avgDelta =
      results.reduce((sum, r) => sum + r.delta, 0) / results.length;

    return (
      <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-2xl"
        >
          <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-secondary" />
          </div>
          <h2 className="text-2xl font-extrabold text-primary mb-2">Session Complete</h2>
          <p className="text-on-surface-variant mb-8">
            You reviewed {results.length} card{results.length !== 1 ? 's' : ''}.
          </p>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-surface-container-low p-4 rounded-2xl">
              <p className="text-2xl font-black text-primary">
                {results.filter((r) => r.rating === 'easy').length}
              </p>
              <p className="text-xs font-bold text-secondary uppercase tracking-widest mt-1">Easy</p>
            </div>
            <div className="bg-surface-container-low p-4 rounded-2xl">
              <p className="text-2xl font-black text-primary">
                {results.filter((r) => r.rating === 'hard').length}
              </p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Hard</p>
            </div>
            <div className="bg-surface-container-low p-4 rounded-2xl">
              <p className="text-2xl font-black text-primary">
                {results.filter((r) => r.rating === 'again').length}
              </p>
              <p className="text-xs font-bold text-red-400 uppercase tracking-widest mt-1">Again</p>
            </div>
          </div>
          <p className="text-sm text-on-surface-variant mb-8">
            Average mastery change:{' '}
            <span className={cn('font-bold', avgDelta >= 0 ? 'text-secondary' : 'text-red-500')}>
              {avgDelta >= 0 ? '+' : ''}{avgDelta.toFixed(0)}%
            </span>{' '}
            · {improved} card{improved !== 1 ? 's' : ''} improved
          </p>
          <button
            onClick={() => onExit(localCards)}
            className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:scale-[0.98] transition-transform"
          >
            Back to Deck
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
      {/* Progress bar */}
      <div className="w-full max-w-lg mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-white/60 text-xs font-bold uppercase tracking-widest">
            {index + 1} / {localCards.length}
          </span>
          <button onClick={() => onExit(localCards)} className="text-white/60 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-secondary-container rounded-full"
            animate={{ width: `${((index) / localCards.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-lg cursor-pointer perspective-1000"
        onClick={() => !flipped && setFlipped(true)}
        style={{ perspective: '1000px' }}
      >
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          style={{ transformStyle: 'preserve-3d' }}
          className="relative w-full"
        >
          {/* Front */}
          <div
            className="bg-white rounded-3xl p-10 min-h-[260px] flex flex-col justify-between shadow-2xl"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <span className="text-[10px] font-bold px-2 py-1 bg-secondary/10 text-secondary rounded-lg uppercase tracking-widest self-start">
              {card.tag}
            </span>
            <div className="text-center">
              <p className="text-xl font-bold text-primary leading-relaxed">{card.q}</p>
            </div>
            <p className="text-center text-xs text-slate-400 font-medium">Tap to reveal answer</p>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 bg-primary-container rounded-3xl p-10 min-h-[260px] flex flex-col justify-between shadow-2xl"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <span className="text-[10px] font-bold px-2 py-1 bg-white/10 text-white/70 rounded-lg uppercase tracking-widest self-start">
              Answer
            </span>
            <p className="text-xl font-bold text-white text-center leading-relaxed">{card.a}</p>
            <div className="flex gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); handleRating('again'); }}
                className="flex-1 py-3 bg-red-500/20 text-red-200 font-bold rounded-xl text-sm border border-red-500/30 hover:bg-red-500/30 transition-colors"
              >
                Again
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleRating('hard'); }}
                className="flex-1 py-3 bg-white/10 text-white font-bold rounded-xl text-sm border border-white/20 hover:bg-white/20 transition-colors"
              >
                Hard
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleRating('easy'); }}
                className="flex-1 py-3 bg-secondary-container/30 text-secondary-container font-bold rounded-xl text-sm border border-secondary-container/40 hover:bg-secondary-container/40 transition-colors"
              >
                Easy
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      <p className="text-white/40 text-xs mt-6 font-medium">
        Current mastery: {card.mastery}%
      </p>
    </div>
  );
}

// ---------- Main Flashcards Page ----------

export default function Flashcards() {
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCard, setNewCard] = useState({ tag: '', q: '', a: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);

  useEffect(() => {
    fetch('/api/flashcards')
      .then((res) => res.json())
      .then(setFlashcards)
      .catch((err) => console.error('Failed to load flashcards', err));
  }, []);

  const filteredCards = flashcards.filter(
    (card) =>
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
        body: JSON.stringify(newCard),
      });
      if (res.ok) {
        const addedCard = await res.json();
        setFlashcards([addedCard, ...flashcards]);
        setShowAddModal(false);
        setNewCard({ tag: '', q: '', a: '' });
      }
    } catch (err) {
      console.error('Failed to add card', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cards due for review: mastery < 100, prioritise lowest mastery first
  const reviewQueue = [...flashcards]
    .filter((c) => c.mastery < 100)
    .sort((a, b) => a.mastery - b.mastery);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {reviewMode && (
        <ReviewMode
          cards={reviewQueue}
          onExit={(updatedCards) => {
            // Merge updated mastery scores back into full deck
            setFlashcards((prev) =>
              prev.map((c) => updatedCards.find((u) => u.id === c.id) ?? c)
            );
            setReviewMode(false);
          }}
        />
      )}

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
          {reviewQueue.length > 0 && (
            <button
              onClick={() => setReviewMode(true)}
              className="px-6 py-3 bg-secondary text-white rounded-xl font-bold flex items-center gap-2 transition-transform hover:scale-95 duration-150 shadow-lg shadow-secondary/20"
            >
              <RotateCcw className="w-5 h-5" />
              Review ({reviewQueue.length})
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-primary text-white rounded-xl font-bold flex items-center gap-2 transition-transform hover:scale-95 duration-150 shadow-lg shadow-primary/20"
          >
            <Plus className="w-5 h-5" />
            Add Card
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {flashcards.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Cards', value: flashcards.length },
            {
              label: 'Mastered',
              value: flashcards.filter((c) => c.mastery >= 80).length,
            },
            {
              label: 'Needs Review',
              value: reviewQueue.length,
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-white p-4 rounded-2xl border border-slate-100 text-center shadow-sm">
              <p className="text-2xl font-black text-primary">{stat.value}</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {flashcards.length === 0 ? (
        <div className="text-center py-24 text-on-surface-variant">
          <Brain className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p className="font-semibold text-primary mb-1">No flashcards yet</p>
          <p className="text-sm">Upload a PDF or start a study session — cards are added automatically.</p>
        </div>
      ) : (
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
                    {card.a || 'Answer hidden. Hover to reveal.'}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 mr-3">
                    <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-700',
                          card.mastery >= 80
                            ? 'bg-secondary'
                            : card.mastery >= 40
                            ? 'bg-amber-400'
                            : 'bg-red-400'
                        )}
                        style={{ width: `${card.mastery}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 shrink-0">
                      {card.mastery}%
                    </span>
                  </div>
                  {card.mastery >= 80 ? (
                    <CheckCircle2 className="w-4 h-4 text-secondary shrink-0" />
                  ) : (
                    <button
                      onClick={() => setReviewMode(true)}
                      className="text-slate-300 hover:text-secondary transition-colors shrink-0"
                      title="Review this card"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

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
                  onChange={(e) => setNewCard({ ...newCard, tag: e.target.value })}
                  className="w-full px-4 py-3 bg-surface-container-low border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
                  placeholder="e.g., Physics"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Question *</label>
                <textarea
                  required
                  value={newCard.q}
                  onChange={(e) => setNewCard({ ...newCard, q: e.target.value })}
                  className="w-full px-4 py-3 bg-surface-container-low border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary resize-none h-24"
                  placeholder="What is the speed of light?"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Answer *</label>
                <textarea
                  required
                  value={newCard.a}
                  onChange={(e) => setNewCard({ ...newCard, a: e.target.value })}
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
