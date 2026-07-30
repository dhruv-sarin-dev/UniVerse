import { useState } from 'react';
import { Send } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import API_URL from '../../api';

/**
 * Discussion — the project's open log.
 *
 * Entries are numbered and timestamped in mono, the way a lab book records
 * them, rather than drawn as chat bubbles: this is the public record attached
 * to the sheet, not a private room.
 */

const EASE = [0.16, 1, 0.3, 1];

function Label({ children, className = '' }) {
  return <span className={`fm-label text-graphite ${className}`}>{children}</span>;
}

export default function Discussion() {
  const { project, fetchProject } = useOutletContext();
  const { user, login } = useAuth();
  const [commentText, setCommentText] = useState("");

  const handleAddComment = async () => {
    if (!user) return login();
    if (!commentText.trim()) return;

    try {
      const res = await fetch(`${API_URL}/api/projects/${project.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.uid,
          user_name: user.display_name,
          text: commentText
        })
      });
      if (res.ok) {
        setCommentText("");
        fetchProject();
      }
    } catch (err) {
      console.error("Comment error", err);
    }
  };

  const comments = project.comments || [];

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="border border-ink/20 bg-paper-raised"
    >
      <div className="flex items-baseline justify-between gap-3 border-b border-ink/15 px-3 py-2">
        <Label className="!text-ink">Open log — discussion</Label>
        <Label className="whitespace-nowrap !text-[10px]">
          {comments.length} {comments.length === 1 ? 'entry' : 'entries'}
        </Label>
      </div>

      <div className="p-5 sm:p-6">
        {/* New entry */}
        <div>
          <Label className="!text-[10px]">New entry</Label>
          <textarea
            placeholder={user ? 'Write your entry…' : 'Sign in to add an entry.'}
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            className="mt-2 min-h-[110px] w-full resize-none border border-ink/25 bg-paper p-3 font-mono text-[13px] leading-relaxed text-ink placeholder:text-graphite focus:border-blueprint focus:outline-none disabled:bg-paper-deep disabled:text-graphite"
            disabled={!user}
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <Label className="!text-[10px]">
              {commentText.trim().length} chars
            </Label>
            <button
              onClick={handleAddComment}
              disabled={!user || !commentText.trim()}
              className="group relative inline-flex items-center gap-2 overflow-hidden bg-ink px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-paper disabled:cursor-not-allowed disabled:bg-paper-deep disabled:text-graphite"
            >
              {user && commentText.trim() && (
                <span className="absolute inset-0 origin-left scale-x-0 bg-blueprint transition-transform duration-300 ease-out group-hover:scale-x-100" />
              )}
              <span className="relative">Record entry</span>
              <Send size={13} className="relative" />
            </button>
          </div>
        </div>

        {/* Log */}
        <dl className="mt-8 border-t border-ink">
          {comments.map((c, idx) => (
            <motion.div
              key={c.id || idx}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.4, delay: Math.min(idx * 0.04, 0.24), ease: EASE }}
              className="flex flex-col gap-1.5 border-b border-rule py-4 sm:flex-row sm:gap-6"
            >
              <dt className="flex shrink-0 items-baseline gap-2 sm:w-44 sm:flex-col sm:gap-1">
                <span className="font-mono text-[11px] text-graphite">
                  {String(idx + 1).padStart(3, '0')}
                </span>
                <span className="fm-condensed text-[15px] font-bold uppercase leading-none tracking-tight text-ink">
                  {c.user_name}
                </span>
                <Label className="!text-[10px]">
                  {c.timestamp ? new Date(c.timestamp).toLocaleTimeString() : 'recent'}
                </Label>
              </dt>
              <dd className="text-[14px] leading-relaxed text-ink">{c.text}</dd>
            </motion.div>
          ))}

          {comments.length === 0 && (
            <div className="border-b border-dashed border-ink/25 py-12 text-center">
              <p className="fm-condensed text-xl font-black uppercase text-ink">Log empty</p>
              <p className="mt-1.5 text-sm text-graphite">
                Nothing recorded against this project yet.
              </p>
            </div>
          )}
        </dl>
      </div>
    </motion.section>
  );
}
