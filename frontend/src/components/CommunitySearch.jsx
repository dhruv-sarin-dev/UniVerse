import { useState, useRef, useEffect } from 'react';
/* eslint-disable no-unused-vars */
import { motion, AnimatePresence } from 'framer-motion';
/* eslint-enable no-unused-vars */
import { Search, X, Hash, Users, FileText, MessageSquare } from 'lucide-react';

export default function CommunitySearch({ posts, communities, onSelectCommunity, onClose }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const q = query.toLowerCase().trim();

  const matchedCommunities = q
    ? communities.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q)
      ).slice(0, 4)
    : [];

  const matchedPosts = q
    ? posts.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.content?.toLowerCase().includes(q) ||
          (p.tags || []).some((t) => t.toLowerCase().includes(q))
      ).slice(0, 6)
    : [];

  const hasResults = matchedCommunities.length > 0 || matchedPosts.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="relative"
    >
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search posts, communities, tags..."
          className="w-full bg-white/[0.04] text-sm text-white placeholder-slate-500 rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:ring-1 focus:ring-neon-blue/30 border border-white/[0.06] transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {q && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            className="absolute top-full left-0 right-0 mt-2 glass-strong rounded-xl border border-white/[0.08] overflow-hidden z-50 max-h-[400px] overflow-y-auto shadow-2xl"
            style={{ scrollbarWidth: 'none' }}
          >
            {!hasResults ? (
              <div className="p-6 text-center">
                <Search size={24} className="mx-auto text-slate-600 mb-2" />
                <p className="text-xs text-slate-500">No results for &ldquo;{query}&rdquo;</p>
              </div>
            ) : (
              <>
                {matchedCommunities.length > 0 && (
                  <div className="p-2">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold px-3 py-1.5">
                      Communities
                    </p>
                    {matchedCommunities.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          onSelectCommunity(c.id);
                          setQuery('');
                          onClose?.();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.06] transition-colors text-left"
                      >
                        <span className="text-lg">{c.icon}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{c.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">{c.description}</p>
                        </div>
                        <span className="ml-auto text-[10px] text-slate-500 flex items-center gap-1">
                          <Users size={10} />{c.subscriber_count || 0}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {matchedPosts.length > 0 && (
                  <div className="p-2 border-t border-white/5">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold px-3 py-1.5">
                      Posts
                    </p>
                    {matchedPosts.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
                      >
                        <div className={`mt-0.5 p-1.5 rounded-md ${
                          p.post_type === 'question'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-neon-blue/10 text-neon-blue'
                        }`}>
                          {p.post_type === 'question' ? <MessageSquare size={12} /> : <FileText size={12} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{p.title || 'Untitled'}</p>
                          <p className="text-[11px] text-slate-500 line-clamp-1">{p.content}</p>
                          {p.tags?.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {p.tags.slice(0, 3).map((t) => (
                                <span key={t} className="text-[9px] text-neon-blue/60 bg-neon-blue/[0.06] px-1.5 py-0.5 rounded">
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
