import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Users } from 'lucide-react';

/**
 * Lookup for the correspondence section — a card index rather than a search
 * overlay. Results are drawn as two ruled lists on a filed sheet: sections
 * first, then entries. Matching logic is unchanged.
 */
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
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="relative"
    >
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-graphite" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Look up an entry, section or term"
          className="w-full border border-ink/25 bg-paper py-2.5 pl-9 pr-9 font-mono text-[13px] text-ink placeholder:text-graphite focus:border-blueprint focus:outline-none"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-graphite transition-colors hover:text-ink"
            aria-label="Clear"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {q && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 right-0 top-full z-50 max-h-[400px] overflow-y-auto border border-ink bg-paper-raised shadow-xl"
            style={{ scrollbarWidth: 'none' }}
          >
            {!hasResults ? (
              <div className="px-4 py-8 text-center">
                <p className="fm-label text-graphite">No match</p>
                <p className="mt-2 font-mono text-[11px] text-graphite">
                  nothing filed under &ldquo;{query}&rdquo;
                </p>
              </div>
            ) : (
              <>
                {matchedCommunities.length > 0 && (
                  <div>
                    <div className="flex items-baseline justify-between border-b border-ink/15 px-3 py-2">
                      <span className="fm-label !text-ink">Sections</span>
                      <span className="fm-label !text-[10px] text-graphite">
                        {matchedCommunities.length}
                      </span>
                    </div>
                    <ul className="divide-y divide-rule">
                      {matchedCommunities.map((c) => (
                        <li key={c.id}>
                          <button
                            onClick={() => {
                              onSelectCommunity(c.id);
                              setQuery('');
                              onClose?.();
                            }}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-paper-deep"
                          >
                            <span className="shrink-0 text-base">{c.icon}</span>
                            <span className="min-w-0">
                              <span className="block truncate text-[13px] font-semibold text-ink">
                                {c.name}
                              </span>
                              <span className="block truncate font-mono text-[11px] text-graphite">
                                {c.description}
                              </span>
                            </span>
                            <span className="ml-auto flex shrink-0 items-center gap-1 font-mono text-[11px] text-graphite">
                              <Users size={10} />{c.subscriber_count || 0}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {matchedPosts.length > 0 && (
                  <div>
                    <div className="flex items-baseline justify-between border-y border-ink/15 px-3 py-2">
                      <span className="fm-label !text-ink">Entries</span>
                      <span className="fm-label !text-[10px] text-graphite">
                        {matchedPosts.length}
                      </span>
                    </div>
                    <ul className="divide-y divide-rule">
                      {matchedPosts.map((p, i) => (
                        <li
                          key={p.id}
                          className="group flex cursor-pointer items-start gap-3 px-3 py-2.5 transition-colors hover:bg-paper-deep"
                        >
                          <span className="mt-0.5 shrink-0 font-mono text-[11px] text-ink/30">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-baseline gap-2">
                              <p className="truncate text-[13px] font-semibold text-ink">
                                {p.title || 'Untitled'}
                              </p>
                              {p.post_type === 'question' && (
                                <span
                                  className={`shrink-0 font-mono text-[10px] uppercase tracking-wider ${
                                    p.is_resolved ? 'text-blueprint' : 'text-signal'
                                  }`}
                                >
                                  {p.is_resolved ? 'closed' : 'open'}
                                </span>
                              )}
                            </div>
                            <p className="line-clamp-1 text-[12px] text-graphite">{p.content}</p>
                            {p.tags?.length > 0 && (
                              <div className="mt-1 flex gap-1.5">
                                {p.tags.slice(0, 3).map((t) => (
                                  <span
                                    key={t}
                                    className="border border-ink/20 px-1 font-mono text-[10px] text-graphite"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
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
