import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Bolt, Brain, FileText, Layout, User, Send, Paperclip, Link, Filter, AlertCircle, Star, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';

export default function StudySession() {
  const [messages, setMessages] = useState([
    { role: 'model', content: "Welcome to your study session. What would you like to focus on today?" }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [courseContext, setCourseContext] = useState<any>({
    title: "Loading...",
    outline: []
  });
  const [sessionCount, setSessionCount] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial context and flashcards from backend
  useEffect(() => {
    fetch('/api/context')
      .then(res => res.json())
      .then(data => {
        setCourseContext(data.course ?? { title: 'Open Session', outline: [] });
        setFlashcards(data.flashcards);
        setSessionCount(data.sessionCount ?? null);
      })
      .catch(err => console.error("Failed to load context", err));
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMsg = inputMessage.trim();
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history: messages
        })
      });

      if (!response.ok) throw new Error('Network response was not ok');
      
      const data = await response.json();
      
      setMessages(prev => [...prev, { role: 'model', content: data.reply }]);
      
      if (data.newFlashcardAdded) {
        setFlashcards(data.flashcards);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', content: "Sorry, I encountered an error processing that request." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden -m-8">
      {/* Left Sidebar: Topic Outline */}
      <section className="w-72 bg-surface-container-low flex flex-col overflow-y-auto px-6 py-8 border-r border-slate-200">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 font-headline">Topic Outline</h2>
        <div className="space-y-6 relative">
          <div className="absolute left-2.5 top-2 bottom-2 w-[2px] bg-slate-200"></div>
          {courseContext.outline.map((item: any, i: number) => (
            <div key={i} className={cn("relative pl-8 transition-opacity", item.status === 'upcoming' && "opacity-50")}>
              <div className={cn(
                "absolute left-0 top-1 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-surface-container-low",
                item.status === 'completed' ? "bg-secondary" : item.status === 'active' ? "bg-secondary-container" : "bg-slate-300"
              )}>
                {item.status === 'completed' ? (
                  <CheckCircle2 className="w-3 h-3 text-white" />
                ) : item.status === 'active' ? (
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                ) : null}
              </div>
              <h3 className="text-sm font-bold text-primary">{item.title}</h3>
              {item.description && (
                <p className={cn("text-xs mt-1", item.status === 'active' ? "text-secondary font-medium" : "text-slate-500")}>
                  {item.description}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-auto p-4 rounded-2xl bg-tertiary-fixed/30 border border-tertiary-fixed/50">
          <div className="flex items-center gap-2 mb-2">
            <Bolt className="w-4 h-4 text-tertiary fill-current" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-tertiary">Quick Tip</span>
          </div>
          <p className="text-xs text-on-tertiary-fixed-variant leading-relaxed">Ask the AI to generate a quiz based on the current active topic.</p>
        </div>
      </section>

      {/* Center Area: Chat Interface */}
      <section className="flex-1 flex flex-col bg-white relative">
        {/* Chat Header */}
        <div className="px-8 py-4 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-secondary-container/20 flex items-center justify-center">
              <Brain className="text-secondary w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-primary">{courseContext.title}</h2>
              <p className="text-[10px] text-slate-400">
                Interactive Session{sessionCount !== null ? ` • Session #${sessionCount}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 rounded-full text-xs font-bold text-secondary border border-secondary/20 hover:bg-secondary/5 transition-colors">Export Notes</button>
            <button className="px-3 py-1.5 rounded-full text-xs font-bold bg-secondary text-white hover:opacity-90 transition-opacity">Record Audio</button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
          {messages.map((msg, index) => (
            <div key={index} className={cn("flex gap-4 max-w-3xl", msg.role === 'user' ? "ml-auto flex-row-reverse max-w-2xl" : "")}>
              <div className={cn(
                "w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center",
                msg.role === 'user' ? "bg-secondary" : "bg-primary-container"
              )}>
                {msg.role === 'user' ? <User className="text-white w-4 h-4" /> : <Bolt className="text-white w-4 h-4" />}
              </div>
              <div className={cn(
                "text-sm leading-relaxed",
                msg.role === 'user' 
                  ? "bg-surface-container-low px-5 py-3 rounded-2xl rounded-tr-none text-on-surface shadow-sm" 
                  : "text-on-surface space-y-4"
              )}>
                {msg.content}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-4 max-w-3xl">
              <div className="w-8 h-8 rounded-full bg-primary-container flex-shrink-0 flex items-center justify-center">
                <Bolt className="text-white w-4 h-4 animate-pulse" />
              </div>
              <div className="flex items-center gap-1 h-8">
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="px-8 pb-8">
          <form onSubmit={handleSendMessage} className="glass-panel rounded-3xl p-2 shadow-2xl shadow-primary/5 flex items-center gap-2 border border-slate-200">
            <button type="button" className="w-10 h-10 flex items-center justify-center rounded-2xl text-slate-400 hover:text-secondary hover:bg-secondary/5 transition-all">
              <Paperclip className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isLoading}
              placeholder="Ask follow up questions or type '/' for commands..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-3 px-2 outline-none disabled:opacity-50"
            />
            <button 
              type="submit" 
              disabled={isLoading || !inputMessage.trim()}
              className="w-10 h-10 flex items-center justify-center rounded-2xl bg-secondary-container text-primary shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
            >
              <Send className="w-5 h-5 fill-current" />
            </button>
          </form>
        </div>
      </section>

      {/* Right Pane: Overview & Flashcards */}
      <section className="w-[400px] bg-white flex flex-col border-l border-slate-200 overflow-y-auto px-8 py-8">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 font-headline">Learning Context</h2>
        
        {/* Active Deck */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-on-surface/50">Active Deck</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-secondary/10 text-secondary rounded-full">
              {flashcards.length} CARDS
            </span>
          </div>
          <div className="space-y-3">
            {flashcards.map((card, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={i} 
                className="group relative p-5 rounded-2xl bg-surface-container-low hover:bg-white hover:shadow-xl hover:shadow-primary/5 transition-all border border-transparent hover:border-slate-100"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="px-2 py-0.5 rounded bg-white text-[9px] font-bold text-slate-500 uppercase tracking-tighter shadow-sm">{card.tag}</span>
                  <Star className="w-4 h-4 text-slate-300 group-hover:text-secondary transition-colors" />
                </div>
                <p className="text-sm font-medium text-primary mb-4">{card.q}</p>
                <div className="flex items-center gap-2">
                  <div className="h-1 flex-1 bg-slate-200 rounded-full overflow-hidden">
                    <div className={cn("h-full transition-all duration-1000", card.mastery > 50 ? 'bg-secondary' : 'bg-red-500')} style={{ width: `${card.mastery}%` }}></div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">Mastery: {card.mastery}%</span>
                </div>
              </motion.div>
            ))}
          </div>
          <button className="w-full mt-6 py-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 text-xs font-bold hover:bg-surface-container-low hover:border-secondary/30 hover:text-secondary transition-all flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            Create Custom Card
          </button>
        </div>
      </section>
    </div>
  );
}

