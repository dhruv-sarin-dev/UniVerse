import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronUp, ChevronDown, MessageSquare, Send, Trash2,
  User, PenLine, X, LogIn, AlertCircle, Check, Hash,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import API_URL, { fetchJson } from '../api';
import ReactMarkdown from 'react-markdown';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import prismStyle from 'react-syntax-highlighter/dist/esm/styles/prism/prism';
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import cssLang from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import clike from 'react-syntax-highlighter/dist/esm/languages/prism/clike';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import jsonLang from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import CommunitySearch from '../components/CommunitySearch';

/**
 * Community — the correspondence section of the field manual.
 *
 * Posts are logbook entries, questions are queries with an open or closed
 * state, votes and reputation are tallies in the margin. Nothing here is a
 * card in a feed; every block is a filed sheet with a caption bar.
 *
 * The unresolved state of a query is the one genuinely open value on this
 * sheet, so it is the only thing allowed to carry signal orange — that and the
 * action that closes it.
 *
 * Behaviour is untouched: same endpoints, same payloads, same optimistic
 * updates. Only markup and classes changed.
 */

/* The full Prism build ships every grammar it has (~500 kB of the bundle).
   PrismLight starts empty and we register the handful a student dev community
   actually posts in. Order matters — jsx and tsx extend javascript, which
   extends clike, so the bases have to be registered first. */
const LANGUAGES = [
  ['markup', markup],
  ['css', cssLang],
  ['clike', clike],
  ['javascript', javascript],
  ['jsx', jsx],
  ['typescript', typescript],
  ['tsx', tsx],
  ['python', python],
  ['bash', bash],
  ['json', jsonLang],
];
LANGUAGES.forEach(([name, lang]) => SyntaxHighlighter.registerLanguage(name, lang));

const EASE = [0.16, 1, 0.3, 1];

/* ── helpers ── */
function timeAgo(dateString) {
  if (!dateString) return 'Just now';
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString();
}

function avatarUrl(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=0D0D0D&color=fff&bold=true`;
}

/* ── shared parts ── */

function Label({ children, className = '' }) {
  return <span className={`fm-label text-graphite ${className}`}>{children}</span>;
}

/** A filed sheet: hairline border, caption bar, body. */
function Panel({ caption, meta, children, className = '', bodyClass = 'p-4' }) {
  return (
    <section className={`border border-ink/20 bg-paper-raised ${className}`}>
      <div className="flex items-baseline justify-between gap-2 border-b border-ink/15 px-3 py-2">
        <Label className="!text-ink">{caption}</Label>
        {meta != null && <Label className="!text-[10px]">{meta}</Label>}
      </div>
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

/** A rule drawn from its origin, the way a plotter lays one down. */
function DrawRule({ className = '', delay = 0 }) {
  return (
    <motion.div
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      className={`h-px origin-left bg-ink ${className}`}
      aria-hidden="true"
    />
  );
}

/** Display type printing in from behind a mask. */
function PrintLine({ children, delay = 0, className = '' }) {
  return (
    <span className="block overflow-hidden">
      <motion.span
        initial={{ y: '108%' }}
        animate={{ y: '0%' }}
        transition={{ duration: 0.75, delay, ease: EASE }}
        className={`block ${className}`}
      >
        {children}
      </motion.span>
    </span>
  );
}

/* Markdown on paper: code sits in a recessed, ruled box rather than a dark
   terminal panel. Same renderer for entries and replies. */
const MARKDOWN_COMPONENTS = {
  code({ inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    return !inline && match ? (
      <SyntaxHighlighter
        style={prismStyle}
        language={match[1]}
        PreTag="div"
        className="!my-2 !rounded-none !border !border-ink/15 !bg-paper-deep !text-[12px]"
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code
        className="border border-ink/15 bg-paper-deep px-1 font-mono text-[12px] text-ink"
        {...props}
      >
        {children}
      </code>
    );
  },
  p({ children }) { return <p className="mb-2 last:mb-0">{children}</p>; },
  a({ children, href }) {
    return (
      <a
        href={href}
        className="text-blueprint underline underline-offset-2"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    );
  },
};

/* ── components ── */

/** The tally in the margin of an entry. */
function VoteButtons({ post, userId, onVote }) {
  const userUpvoted = post.upvoted_by?.includes(userId);
  const userDownvoted = post.downvoted_by?.includes(userId);
  const netVotes = post.upvotes ?? 0;

  return (
    <div className="mr-4 flex shrink-0 select-none flex-col items-center gap-0.5 border-r border-ink/10 pr-4">
      <button
        onClick={() => onVote(post.id, userUpvoted ? 0 : 1)}
        className={`transition-colors ${
          userUpvoted ? 'text-blueprint' : 'text-graphite hover:text-blueprint'
        }`}
        title="Upvote"
      >
        <ChevronUp size={18} strokeWidth={2} />
      </button>
      <span
        className={`min-w-[24px] text-center font-mono text-[13px] tabular-nums ${
          netVotes === 0 ? 'text-graphite' : 'text-ink'
        }`}
      >
        {netVotes > 0 ? `+${netVotes}` : netVotes}
      </span>
      <button
        onClick={() => onVote(post.id, userDownvoted ? 0 : -1)}
        className={`transition-colors ${
          userDownvoted ? 'text-ink' : 'text-graphite hover:text-ink'
        }`}
        title="Downvote"
      >
        <ChevronDown size={18} strokeWidth={2} />
      </button>
      <Label className="mt-1 !text-[9px] !tracking-normal">net</Label>
    </div>
  );
}

function CommentNode({ comment, allComments, post, userId, userName, userPhoto, onAddComment, onAcceptAnswer }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const replies = allComments.filter((c) => c.parent_id === comment.id);
  const isOwner = userId && post.author_uid === userId;
  const isQuestion = post.post_type === 'question';

  const handleReplySubmit = async () => {
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    await onAddComment(post.id, replyText.trim(), comment.id);
    setReplyText('');
    setSubmitting(false);
    setReplyOpen(false);
  };

  return (
    <div className="group mt-3 flex gap-3">
      <img
        src={comment.user_avatar || avatarUrl(comment.user_name)}
        alt=""
        referrerPolicy="no-referrer"
        className="mt-0.5 h-6 w-6 shrink-0 rounded-full border border-ink/15"
      />
      <div className="min-w-0 flex-grow">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-[13px] font-semibold text-ink">{comment.user_name}</span>
            <span className="font-mono text-[10px] text-graphite">{timeAgo(comment.timestamp)}</span>
            {comment.is_accepted && (
              <span className="flex items-center gap-1 border border-blueprint/40 px-1.5 py-px font-mono text-[10px] uppercase tracking-wider text-blueprint">
                <Check size={9} strokeWidth={3} /> Accepted
              </span>
            )}
          </div>
          {isQuestion && isOwner && !comment.is_accepted && userId && (
            <button
              onClick={() => onAcceptAnswer(post.id, comment.id)}
              className="fm-label shrink-0 border border-signal px-2 py-px !text-[9px] text-signal opacity-0 transition-all hover:bg-signal hover:text-paper group-hover:opacity-100"
            >
              Accept
            </button>
          )}
        </div>
        <div className="mt-1 break-words text-[13px] leading-relaxed text-graphite">
          <ReactMarkdown components={MARKDOWN_COMPONENTS}>{comment.text}</ReactMarkdown>
        </div>

        {userId && (
          <button
            onClick={() => setReplyOpen(!replyOpen)}
            className="fm-label mt-1 !text-[9px] transition-colors hover:text-blueprint"
          >
            Reply
          </button>
        )}

        {replyOpen && (
          <div className="relative mt-2 flex items-center gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleReplySubmit()}
              placeholder="Write a reply…"
              className="w-full border border-ink/25 bg-paper py-1.5 pl-3 pr-8 font-mono text-[12px] text-ink placeholder:text-graphite focus:border-blueprint focus:outline-none"
            />
            <button
              onClick={handleReplySubmit}
              disabled={!replyText.trim() || submitting}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-blueprint transition-colors disabled:text-graphite/50"
            >
              <Send size={12} />
            </button>
          </div>
        )}

        {replies.length > 0 && (
          <div className="mt-1 space-y-1 border-l border-rule pl-3">
            {replies.map(r => (
              <CommentNode key={r.id} comment={r} allComments={allComments} post={post} userId={userId} userName={userName} userPhoto={userPhoto} onAddComment={onAddComment} onAcceptAnswer={onAcceptAnswer} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CommentSection({ post, userId, userName, userPhoto, onAddComment, onAcceptAnswer }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);
  const comments = post.comments || [];

  // Get only top-level comments
  const topLevelComments = comments.filter(c => !c.parent_id);

  const handleSubmit = async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    await onAddComment(post.id, text.trim(), null);
    setText('');
    setSubmitting(false);
  };

  return (
    <div className="w-full">
      <button
        onClick={() => {
          setOpen(!open);
          if (!open) setTimeout(() => inputRef.current?.focus(), 100);
        }}
        className={`fm-label flex items-center gap-2 transition-colors ${
          open ? '!text-blueprint' : 'text-graphite hover:text-ink'
        }`}
      >
        <MessageSquare size={13} />
        <span>
          {comments.length} {comments.length === 1 ? 'reply' : 'replies'}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-1 border-t border-rule pt-4">
              {comments.length === 0 && (
                <p className="py-2 text-center font-mono text-[11px] text-graphite">
                  — no replies filed —
                </p>
              )}
              {topLevelComments.map((c) => (
                <CommentNode key={c.id} comment={c} allComments={comments} post={post} userId={userId} userName={userName} userPhoto={userPhoto} onAddComment={onAddComment} onAcceptAnswer={onAcceptAnswer} />
              ))}

              {userId && (
                <div className="mt-3 flex items-center gap-3 border-t border-rule pt-3">
                  <img
                    src={userPhoto || avatarUrl(userName)}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-6 w-6 shrink-0 rounded-full border border-ink/15"
                  />
                  <div className="relative flex-grow">
                    <input
                      ref={inputRef}
                      type="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                      placeholder="Add to the record…"
                      className="w-full border border-ink/25 bg-paper py-2 pl-3 pr-9 font-mono text-[12px] text-ink placeholder:text-graphite focus:border-blueprint focus:outline-none"
                    />
                    <button
                      onClick={handleSubmit}
                      disabled={!text.trim() || submitting}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blueprint transition-colors disabled:text-graphite/50"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** One filed entry in the logbook. */
function PostCard({ post, userId, userName, userPhoto, onVote, onAddComment, onAcceptAnswer, onDelete, index }) {
  const isOwner = userId && post.author_uid === userId;
  const isQuestion = post.post_type === 'question';
  const isOpenQuery = isQuestion && !post.is_resolved;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3), ease: EASE }}
      className="group border border-ink/20 bg-paper-raised transition-colors hover:border-ink"
    >
      {/* Caption bar — entry number, kind, filing time */}
      <div className="flex items-baseline justify-between gap-3 border-b border-ink/15 px-4 py-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <Label className="!text-ink">
            Ent {String(index + 1).padStart(3, '0')}
          </Label>
          <span className="text-ink/25">/</span>
          {isQuestion ? (
            isOpenQuery ? (
              <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-signal">
                <span className="h-1.5 w-1.5 bg-signal" aria-hidden="true" />
                Query — open
              </span>
            ) : (
              <span className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-blueprint">
                <Check size={11} strokeWidth={3} />
                Query — closed
              </span>
            )
          ) : (
            <Label className="!text-[10px]">Discussion</Label>
          )}
          {post.community_name && (
            <span className="truncate font-mono text-[11px] text-blueprint">
              §&nbsp;{post.community_name}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="font-mono text-[11px] text-graphite">{timeAgo(post.created_at)}</span>
          {isOwner && (
            <button
              onClick={() => onDelete(post.id)}
              className="text-graphite transition-colors hover:text-signal"
              title="Delete post"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="flex p-4">
        {/* Tally column */}
        <VoteButtons post={post} userId={userId} onVote={onVote} />

        {/* Entry body */}
        <div className="min-w-0 flex-grow">
          {/* Filed by */}
          <div className="mb-3 flex items-center gap-2.5">
            <img
              src={post.author_avatar || avatarUrl(post.author_name)}
              alt=""
              referrerPolicy="no-referrer"
              className="h-7 w-7 shrink-0 rounded-full border border-ink/15"
            />
            <div className="min-w-0">
              <Label className="!text-[9px] !tracking-normal">filed by</Label>
              <p className="truncate text-[13px] font-semibold leading-tight text-ink">
                {post.author_name}
              </p>
            </div>
          </div>

          {post.title && (
            <h3 className="fm-condensed mb-2 text-xl font-black uppercase leading-[0.95] tracking-tight text-ink">
              {post.title}
            </h3>
          )}

          <div className="mb-3 break-words text-sm leading-relaxed text-graphite">
            <ReactMarkdown components={MARKDOWN_COMPONENTS}>{post.content}</ReactMarkdown>
          </div>

          {post.tags?.length > 0 && (
            <dl className="mb-4 flex items-baseline gap-3">
              <dt className="shrink-0"><Label className="!text-[9px] !tracking-normal">index</Label></dt>
              <dd className="flex flex-wrap gap-1.5">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="border border-ink/20 px-1.5 py-0.5 font-mono text-[11px] text-ink"
                  >
                    {tag}
                  </span>
                ))}
              </dd>
            </dl>
          )}

          <div className="border-t border-rule pt-3">
            <CommentSection
              post={post}
              userId={userId}
              userName={userName}
              userPhoto={userPhoto}
              onAddComment={onAddComment}
              onAcceptAnswer={onAcceptAnswer}
            />
          </div>
        </div>
      </div>
    </motion.article>
  );
}

const FIELD =
  'w-full border border-ink/25 bg-paper px-3 py-2 font-mono text-[13px] text-ink placeholder:text-graphite focus:border-blueprint focus:outline-none';

/** The blank form at the top of the logbook. */
function CreatePostCard({ user, onPost, login, communities }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postType, setPostType] = useState('discussion');
  const [communityId, setCommunityId] = useState('');

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, '');
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags([...tags, t]);
      setTagInput('');
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setPosting(true);
    let communityName = '';
    if (communityId) {
      const comm = communities?.find(c => c.id === communityId);
      if (comm) communityName = comm.name;
    }
    await onPost({
      title: title.trim(),
      content: content.trim(),
      tags,
      post_type: postType,
      community_id: communityId || null,
      community_name: communityName || null
    });
    setTitle('');
    setContent('');
    setTags([]);
    setCommunityId('');
    setPostType('discussion');
    setExpanded(false);
    setPosting(false);
  };

  if (!user) {
    return (
      <Panel caption="New entry" meta="unsigned" className="mb-6" bodyClass="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-ink/20 bg-paper">
            <User size={15} className="text-graphite" />
          </div>
          <button
            onClick={login}
            className="flex-grow border border-dashed border-ink/30 px-3 py-2.5 text-left font-mono text-[12px] text-graphite transition-colors hover:border-ink hover:text-ink"
          >
            Sign in to file an entry…
          </button>
        </div>
      </Panel>
    );
  }

  const photo = user.photo_url || avatarUrl(user.display_name);

  return (
    <section className="mb-8 border border-ink/20 bg-paper-raised">
      <div className="flex items-baseline justify-between border-b border-ink/15 px-3 py-2">
        <Label className="!text-ink">New entry</Label>
        <Label className="!text-[10px]">{expanded ? 'drafting' : 'blank form'}</Label>
      </div>

      <div className="p-4">
        <div className="flex gap-3">
          <img src={photo} alt="" referrerPolicy="no-referrer" className="h-9 w-9 shrink-0 rounded-full border border-ink/15" />
          <div className="flex-grow">
            {!expanded ? (
              <button
                onClick={() => setExpanded(true)}
                className="flex w-full items-center gap-2 border-b border-dashed border-ink/30 px-1 py-2.5 text-left font-mono text-[12px] text-graphite transition-colors hover:border-ink hover:text-ink"
              >
                <PenLine size={13} />
                What are you filing today?
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="space-y-4"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="post-kind" className="fm-label mb-1.5 block text-graphite">
                      Kind
                    </label>
                    <select
                      id="post-kind"
                      value={postType}
                      onChange={(e) => setPostType(e.target.value)}
                      className={`${FIELD} cursor-pointer`}
                    >
                      <option value="discussion">Discussion</option>
                      <option value="question">Question</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="post-section" className="fm-label mb-1.5 block text-graphite">
                      Section
                    </label>
                    <select
                      id="post-section"
                      value={communityId}
                      onChange={(e) => setCommunityId(e.target.value)}
                      className={`${FIELD} cursor-pointer`}
                    >
                      <option value="">Global log</option>
                      {communities?.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="post-title" className="fm-label mb-1.5 block text-graphite">
                    Heading <span className="normal-case tracking-normal">(optional)</span>
                  </label>
                  <input
                    id="post-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Short line describing the entry"
                    className={FIELD}
                  />
                </div>

                <div>
                  <label htmlFor="post-body" className="fm-label mb-1.5 block text-graphite">
                    Body
                  </label>
                  <textarea
                    id="post-body"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Markdown and fenced code blocks are supported."
                    rows={4}
                    autoFocus
                    className={`${FIELD} resize-none leading-relaxed`}
                  />
                </div>

                <div>
                  <label htmlFor="post-tags" className="fm-label mb-1.5 block text-graphite">
                    Index terms <span className="normal-case tracking-normal">(up to 5)</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1.5 border border-ink/20 px-1.5 py-0.5 font-mono text-[11px] text-ink"
                      >
                        {t}
                        <button onClick={() => setTags(tags.filter((x) => x !== t))} className="text-graphite transition-colors hover:text-signal">
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                    {tags.length < 5 && (
                      <input
                        id="post-tags"
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); }
                        }}
                        placeholder="add term"
                        className="w-24 border-b border-dashed border-ink/30 bg-transparent py-0.5 font-mono text-[11px] text-ink placeholder:text-graphite focus:border-blueprint focus:outline-none"
                      />
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="flex items-center justify-between border-t border-ink/15 px-4 py-3">
          <button
            className="fm-label flex items-center gap-1.5 text-graphite transition-colors hover:text-ink"
            title="Add tag"
            onClick={addTag}
          >
            <Hash size={13} /> Add term
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setExpanded(false); setTitle(''); setContent(''); setTags([]); }}
              className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-graphite transition-colors hover:text-ink"
            >
              Discard
            </button>
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || posting}
              className="group relative overflow-hidden bg-ink px-6 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-paper disabled:opacity-40"
            >
              <span className="absolute inset-0 origin-left scale-x-0 bg-blueprint transition-transform duration-300 ease-out group-hover:scale-x-100" />
              <span className="relative">{posting ? 'Filing…' : 'File entry'}</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/** Tabs and sort, drawn as the index rail of the section. */
function FeedControls({ tabs, activeTab, setActiveTab, sortBy, setSortBy }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-y border-rule py-2.5">
      <nav className="flex gap-x-5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`fm-label transition-colors hover:text-blueprint ${
              activeTab === tab.key ? '!text-ink underline underline-offset-4' : 'text-graphite'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'feed' && (
        <div className="flex items-baseline gap-3">
          <Label className="!text-[9px] !tracking-normal">order</Label>
          {[['votes', 'Tally'], ['recent', 'Latest']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`fm-label transition-colors hover:text-blueprint ${
                sortBy === key ? '!text-ink underline underline-offset-4' : 'text-graphite'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Loading / error / empty, all three drawn as sheets rather than cards. */
function FeedState({ loading, error, activeTab, user, login, onRetry }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-ink/15 border-t-blueprint" />
        <Label>Reading the log</Label>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-signal/40 bg-signal/[0.05] px-6 py-16 text-center">
        <AlertCircle size={32} className="mx-auto mb-4 text-signal" />
        <p className="fm-condensed text-2xl font-black uppercase text-ink">Log unavailable</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-graphite">{error}</p>
        <button
          onClick={onRetry}
          className="mt-6 border border-ink px-6 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-paper"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="border border-dashed border-ink/30 px-6 py-20 text-center">
      <p className="fm-condensed text-2xl font-black uppercase text-ink">
        {activeTab === 'my' ? 'Nothing filed under your name' : 'No entries on record'}
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-graphite">
        {activeTab === 'my'
          ? 'Anything you file will be listed here.'
          : user
          ? 'Be the first to write into the log.'
          : 'Sign in to file entries and answer open queries.'}
      </p>
      {!user && (
        <button
          onClick={login}
          className="group relative mt-6 overflow-hidden bg-ink px-6 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-paper"
        >
          <span className="absolute inset-0 origin-left scale-x-0 bg-blueprint transition-transform duration-300 ease-out group-hover:scale-x-100" />
          <span className="relative">Sign in</span>
        </button>
      )}
    </div>
  );
}

/** Reader identification block. */
function OperatorPanel({ user, userName, userPhoto, login }) {
  return (
    <Panel caption="Operator" meta={user ? 'signed' : 'guest'}>
      <div className="mb-4 flex items-center gap-3">
        <img
          src={userPhoto || avatarUrl(userName)}
          alt=""
          referrerPolicy="no-referrer"
          className="h-11 w-11 shrink-0 rounded-full border border-ink/15"
        />
        <div className="min-w-0">
          <p className="fm-condensed truncate text-lg font-black uppercase leading-none tracking-tight text-ink">
            {userName}
          </p>
          <p className="mt-1 truncate font-mono text-[11px] text-graphite">
            {user?.branch || 'Community member'}
          </p>
        </div>
      </div>
      {user ? (
        <Link
          to="/profile"
          className="block border border-ink px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-paper"
        >
          View record
        </Link>
      ) : (
        <button
          onClick={login}
          className="flex w-full items-center justify-center gap-2 border border-ink px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-paper"
        >
          <LogIn size={13} /> Sign in
        </button>
      )}
    </Panel>
  );
}

/* ── main page ── */

export default function Community() {
  const { user, login } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('feed');
  const [sortBy, setSortBy] = useState('votes');
  const [error, setError] = useState(null);

  const userId = user?.uid;
  const userName = user?.display_name || 'Guest';
  const userPhoto = user?.photo_url || null;

  const [communities, setCommunities] = useState([]);
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [topContributors, setTopContributors] = useState([]);
  const [trendingQuestions, setTrendingQuestions] = useState([]);

  const fetchSidebarData = useCallback(async () => {
    try {
      const [leadRes, trendRes] = await Promise.all([
        fetch(`${API_URL}/api/community/leaderboard/top`),
        fetch(`${API_URL}/api/community/trending/questions`)
      ]);
      if (leadRes.ok) setTopContributors(await leadRes.json());
      if (trendRes.ok) setTrendingQuestions(await trendRes.json());
    } catch (err) {
      // Sidebar extras are non-essential, so a failure here must not take the
      // feed down with it — but swallowing it silently hid real outages.
      console.warn('Could not load community sidebar data', err);
    }
  }, []);

  const fetchCommunities = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/communities/`);
      if (res.ok) {
        const data = await res.json();
        setCommunities(data);
      }
    } catch {
      // silent
    }
  }, []);

  /* ── Fetch ── */
  const fetchPosts = useCallback(async () => {
    try {
      setError(null);
      let path = `/api/community/?sort=${sortBy}`;
      if (activeTab === 'my') {
        path = `/api/community/user/${userId}`;
      } else if (selectedCommunity) {
        path += `&community_id=${selectedCommunity}`;
      }
      // fetchJson retries, which matters on the first load after the backend
      // has been idle — that request can take a minute or fail outright.
      const data = await fetchJson(path);
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err?.name === 'TimeoutError'
          ? 'The server is taking a while to wake up. Give it a moment and try again.'
          : 'Could not load posts. The server might be unavailable.'
      );
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, sortBy, userId, selectedCommunity]);

  useEffect(() => {
    setLoading(true);
    fetchPosts();
    fetchCommunities();
    fetchSidebarData();
  }, [fetchPosts, fetchCommunities, fetchSidebarData]);

  /* ── Actions ── */
  const handleVote = async (postId, vote) => {
    if (!userId) return login();
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const up = [...(p.upvoted_by || [])];
        const down = [...(p.downvoted_by || [])];
        if (up.includes(userId)) up.splice(up.indexOf(userId), 1);
        if (down.includes(userId)) down.splice(down.indexOf(userId), 1);
        if (vote === 1) up.push(userId);
        if (vote === -1) down.push(userId);
        return { ...p, upvoted_by: up, downvoted_by: down, upvotes: up.length - down.length };
      })
    );
    try {
      await fetch(`${API_URL}/api/community/${postId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, vote }),
      });
    } catch {
      fetchPosts(); // rollback
    }
  };

  const handleAddComment = async (postId, text, parentId = null) => {
    if (!userId) return login();
    try {
      const res = await fetch(`${API_URL}/api/community/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          user_name: userName,
          user_avatar: userPhoto,
          text,
          parent_id: parentId
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, comments: [...(p.comments || []), data.comment] } : p
          )
        );
      }
    } catch {
      /* silent */
    }
  };

  const handleAcceptAnswer = async (postId, commentId) => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_URL}/api/community/${postId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          comment_id: commentId
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id !== postId) return p;
            const updatedComments = p.comments?.map(c => ({
              ...c,
              is_accepted: c.id === commentId
            }));
            return { ...p, comments: updatedComments, is_resolved: true };
          })
        );
      }
    } catch {
      /* silent */
    }
  };

  const handlePost = async ({ title, content, tags, post_type, community_id, community_name }) => {
    try {
      const res = await fetch(`${API_URL}/api/community/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_uid: userId,
          author_name: userName,
          author_avatar: userPhoto,
          title: title || '',
          content,
          tags,
          post_type: post_type || 'discussion',
          community_id: community_id || null,
          community_name: community_name || null
        }),
      });
      if (res.ok) {
        fetchPosts();
      }
    } catch {
      /* silent */
    }
  };

  const handleDelete = async (postId) => {
    if (!confirm('Delete this post?')) return;
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    try {
      await fetch(`${API_URL}/api/community/${postId}`, { method: 'DELETE' });
    } catch {
      fetchPosts();
    }
  };

  const tabs = [
    { key: 'feed', label: 'The log' },
    ...(user ? [{ key: 'my', label: 'My entries' }] : []),
  ];

  const openQueries = posts.filter((p) => p.post_type === 'question' && !p.is_resolved).length;
  const totalReplies = posts.reduce((sum, p) => sum + (p.comments?.length || 0), 0);
  const totalVotes = posts.reduce((sum, p) => sum + Math.abs(p.upvotes || 0), 0);

  const entries = (
    <AnimatePresence>
      {posts.map((post, i) => (
        <PostCard
          key={post.id}
          post={post}
          userId={userId}
          userName={userName}
          userPhoto={userPhoto}
          onVote={handleVote}
          onAddComment={handleAddComment}
          onAcceptAnswer={handleAcceptAnswer}
          onDelete={handleDelete}
          index={i}
        />
      ))}
    </AnimatePresence>
  );

  /* Section index — global log plus each community, shared by both layouts. */
  const sectionIndex = (
    <Panel caption="Sections" meta={`${communities.length + 1}`} bodyClass="p-2">
      <button
        onClick={() => { setSelectedCommunity(null); setActiveTab('feed'); }}
        className={`flex w-full items-baseline justify-between px-2 py-1.5 text-left font-mono text-[12px] transition-colors ${
          !selectedCommunity && activeTab === 'feed'
            ? 'bg-blueprint/[0.08] text-blueprint'
            : 'text-graphite hover:text-ink'
        }`}
      >
        <span className="truncate">Global log</span>
        <span className="fm-label !text-[9px] !tracking-normal">all</span>
      </button>
      {communities.slice(0, 5).map((c, i) => (
        <button
          key={c.id}
          onClick={() => { setSelectedCommunity(c.id); setActiveTab('feed'); }}
          className={`flex w-full items-baseline justify-between gap-2 px-2 py-1.5 text-left font-mono text-[12px] transition-colors ${
            selectedCommunity === c.id
              ? 'bg-blueprint/[0.08] text-blueprint'
              : 'text-graphite hover:text-ink'
          }`}
        >
          <span className="truncate">
            <span className="mr-1.5 text-ink/30">{String(i + 1).padStart(2, '0')}</span>
            {c.name}
          </span>
          <span className="shrink-0">{c.icon}</span>
        </button>
      ))}
    </Panel>
  );

  /* Open queries — the unresolved column of the section. */
  const openQueriesPanel = (
    <Panel caption="Open queries" meta={`${trendingQuestions.length}`} bodyClass="p-0">
      {trendingQuestions.length === 0 ? (
        <p className="px-3 py-4 font-mono text-[11px] text-graphite">— none on record —</p>
      ) : (
        <ul className="divide-y divide-rule">
          {trendingQuestions.map((q, i) => (
            <li key={q.id} className="group flex cursor-pointer gap-2.5 px-3 py-2.5">
              <span className="shrink-0 font-mono text-[11px] text-ink/30">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0">
                <p className="line-clamp-2 text-[12px] leading-snug text-ink transition-colors group-hover:text-blueprint">
                  {q.title}
                </p>
                <div className="mt-1 flex gap-3 font-mono text-[10px] text-graphite">
                  <span className="flex items-center gap-0.5"><ChevronUp size={10} />{q.upvotes}</span>
                  <span className="flex items-center gap-0.5"><MessageSquare size={9} />{q.comment_count}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );

  /* Standings — reputation is a tally, so it reads as one. */
  const standingsPanel = (
    <Panel caption="Standings" meta="reputation" bodyClass="p-0">
      {topContributors.length === 0 ? (
        <p className="px-3 py-4 font-mono text-[11px] text-graphite">— no reputation earned —</p>
      ) : (
        <ul className="divide-y divide-rule">
          {topContributors.slice(0, 5).map((u, i) => (
            <li key={u.uid || i} className="flex items-center gap-2.5 px-3 py-2">
              <span className={`w-5 shrink-0 font-mono text-[11px] ${i === 0 ? 'text-ink' : 'text-ink/30'}`}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <img
                src={u.photo_url || avatarUrl(u.display_name)}
                alt=""
                referrerPolicy="no-referrer"
                className="h-5 w-5 shrink-0 rounded-full border border-ink/15"
              />
              <span className="flex-1 truncate text-[12px] text-ink">{u.display_name}</span>
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-blueprint">
                {u.reputation}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );

  /* Tallies — the specs block of this section. */
  const talliesPanel = (
    <Panel caption="Tallies" meta="this view">
      <dl className="space-y-2">
        {[
          ['Entries', posts.length],
          ['Replies', totalReplies],
          ['Votes', totalVotes],
        ].map(([term, value]) => (
          <div key={term} className="flex items-baseline">
            <dt className="fm-label w-24 shrink-0">{term}</dt>
            <dd className="font-mono text-[13px] tabular-nums text-ink">
              {String(value).padStart(3, '0')}
            </dd>
          </div>
        ))}
        <div className="flex items-baseline border-t border-rule pt-2">
          <dt className="fm-label w-24 shrink-0">Open</dt>
          <dd className={`font-mono text-[13px] tabular-nums ${openQueries > 0 ? 'text-signal' : 'text-ink'}`}>
            {String(openQueries).padStart(3, '0')}
          </dd>
        </div>
      </dl>
    </Panel>
  );

  const runningHeadMeta = `${posts.length} ${posts.length === 1 ? 'entry' : 'entries'}${
    openQueries > 0 ? ` · ${openQueries} open` : ''
  }`;

  return (
    <>
      {/* ── Mobile layout (stacked, natural scroll) ── */}
      <div className="relative z-10 px-4 pb-20 pt-24 sm:px-6 lg:hidden">
        {/* Running head */}
        <div className="flex items-baseline justify-between pb-2">
          <Label className="!text-ink">§ Correspondence — the log</Label>
          <Label className="!text-[10px]">{runningHeadMeta}</Label>
        </div>
        <DrawRule />

        <h1 className="fm-condensed pt-6 text-5xl font-black uppercase leading-[0.9] tracking-tight text-ink">
          <PrintLine>Community</PrintLine>
          <PrintLine delay={0.08} className="text-blueprint">logbook</PrintLine>
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-graphite">
          Entries, open queries and the running tally of who answered what.
        </p>

        <div className="mt-8 flex flex-col gap-5">
          <OperatorPanel user={user} userName={userName} userPhoto={userPhoto} login={login} />

          <CommunitySearch posts={posts} communities={communities} onSelectCommunity={(id) => { setSelectedCommunity(id); setActiveTab('feed'); }} />

          <CreatePostCard user={user} onPost={handlePost} login={login} communities={communities} />
        </div>

        <FeedControls
          tabs={tabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />

        <div className="space-y-4">
          {loading || error || posts.length === 0 ? (
            <FeedState
              loading={loading}
              error={error}
              activeTab={activeTab}
              user={user}
              login={login}
              onRetry={fetchPosts}
            />
          ) : (
            entries
          )}
        </div>

        <div className="mt-8 flex flex-col gap-5">
          {sectionIndex}
          {openQueriesPanel}
          {standingsPanel}
          {talliesPanel}
        </div>
      </div>

      {/* ── Desktop layout (fixed sidebars, scrollable feed) ── */}
      <div className="fixed inset-0 top-[72px] z-10 hidden lg:flex">
        {/* Left column — operator, index, sections */}
        <aside
          data-lenis-prevent
          className="h-full w-[288px] shrink-0 overflow-y-auto border-r border-ink/15 px-4 pt-5"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          <div className="flex flex-col gap-5 pb-10">
            <OperatorPanel user={user} userName={userName} userPhoto={userPhoto} login={login} />

            <Panel caption="Elsewhere" bodyClass="p-2">
              {[
                { to: '/discover', label: 'Project catalogue' },
                { to: '/onboarding', label: 'Update your record' },
              ].map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="group flex items-baseline justify-between px-2 py-1.5 font-mono text-[12px] text-graphite transition-colors hover:text-blueprint"
                >
                  <span>{l.label}</span>
                  <span className="text-ink/25 transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              ))}
            </Panel>

            {sectionIndex}

            {!user && (
              <Panel caption="Enrolment">
                <p className="text-[13px] leading-relaxed text-graphite">
                  Sign in to file entries, answer open queries and earn reputation.
                </p>
                <button
                  onClick={login}
                  className="group relative mt-4 w-full overflow-hidden bg-ink px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-paper"
                >
                  <span className="absolute inset-0 origin-left scale-x-0 bg-blueprint transition-transform duration-300 ease-out group-hover:scale-x-100" />
                  <span className="relative">Get started</span>
                </button>
              </Panel>
            )}
          </div>
        </aside>

        {/* Centre column — the log itself */}
        <main
          data-lenis-prevent
          className="h-full flex-grow overflow-y-auto scroll-smooth px-6"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          <div className="mx-auto max-w-2xl pb-16 pt-5">
            {/* Running head */}
            <div className="flex items-baseline justify-between pb-2">
              <Label className="!text-ink">§ Correspondence — the log</Label>
              <Label className="!text-[10px]">{runningHeadMeta}</Label>
            </div>
            <DrawRule />

            <div className="pb-6 pt-5">
              <CommunitySearch posts={posts} communities={communities} onSelectCommunity={(id) => { setSelectedCommunity(id); setActiveTab('feed'); }} />
            </div>

            <CreatePostCard user={user} onPost={handlePost} login={login} communities={communities} />

            <FeedControls
              tabs={tabs}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              sortBy={sortBy}
              setSortBy={setSortBy}
            />

            <div className="space-y-4">
              {loading || error || posts.length === 0 ? (
                <FeedState
                  loading={loading}
                  error={error}
                  activeTab={activeTab}
                  user={user}
                  login={login}
                  onRetry={fetchPosts}
                />
              ) : (
                entries
              )}
            </div>
          </div>
        </main>

        {/* Right column — open queries, standings, tallies */}
        <aside
          data-lenis-prevent
          className="h-full w-[272px] shrink-0 overflow-y-auto border-l border-ink/15 px-4 pt-5"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          <div className="flex flex-col gap-5 pb-10">
            {openQueriesPanel}
            {standingsPanel}
            {talliesPanel}
          </div>
        </aside>
      </div>
    </>
  );
}
