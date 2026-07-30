import { useState, useEffect, useCallback, useRef } from 'react';
/* eslint-disable no-unused-vars */
import { motion, AnimatePresence } from 'framer-motion';
/* eslint-enable no-unused-vars */
import {
  ChevronUp, ChevronDown, MessageSquare, Send, Trash2,
  TrendingUp, Clock, User, Sparkles, PenLine, Hash, X,
  LogIn, Compass, Rocket, AlertCircle, FileText, CheckCircle,
  Award, Trophy, HelpCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import API_URL from '../api';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import CommunitySearch from '../components/CommunitySearch';

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

/* ── components ── */

function VoteButtons({ post, userId, onVote }) {
  const userUpvoted = post.upvoted_by?.includes(userId);
  const userDownvoted = post.downvoted_by?.includes(userId);
  const netVotes = post.upvotes ?? 0;

  return (
    <div className="flex flex-col items-center gap-0.5 mr-4 select-none">
      <button
        onClick={() => onVote(post.id, userUpvoted ? 0 : 1)}
        className={`p-1.5 rounded-lg transition-all duration-200 ${
          userUpvoted
            ? 'text-neon-blue bg-neon-blue/15 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
            : 'text-slate-500 hover:text-neon-blue hover:bg-white/5'
        }`}
        title="Upvote"
      >
        <ChevronUp size={20} strokeWidth={2.5} />
      </button>
      <span className={`text-sm font-bold tabular-nums min-w-[20px] text-center ${
        netVotes > 0 ? 'text-neon-blue' : netVotes < 0 ? 'text-neon-magenta' : 'text-slate-400'
      }`}>
        {netVotes}
      </span>
      <button
        onClick={() => onVote(post.id, userDownvoted ? 0 : -1)}
        className={`p-1.5 rounded-lg transition-all duration-200 ${
          userDownvoted
            ? 'text-neon-magenta bg-neon-magenta/15 shadow-[0_0_12px_rgba(255,0,110,0.2)]'
            : 'text-slate-500 hover:text-neon-magenta hover:bg-white/5'
        }`}
        title="Downvote"
      >
        <ChevronDown size={20} strokeWidth={2.5} />
      </button>
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
    <div className="flex gap-3 group mt-3">
      <img
        src={comment.user_avatar || avatarUrl(comment.user_name)}
        alt=""
        className="w-7 h-7 rounded-full shrink-0 mt-0.5"
      />
      <div className="flex-grow min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold text-white">{comment.user_name}</span>
            <span className="text-[10px] text-slate-500">{timeAgo(comment.timestamp)}</span>
            {comment.is_accepted && (
              <span className="text-[10px] text-neon-teal bg-neon-teal/10 px-1.5 py-0.5 rounded flex items-center gap-1 font-medium">
                <CheckCircle size={10} /> Accepted
              </span>
            )}
          </div>
          {isQuestion && isOwner && !comment.is_accepted && userId && (
            <button
              onClick={() => onAcceptAnswer(post.id, comment.id)}
              className="opacity-0 group-hover:opacity-100 text-[10px] text-neon-teal hover:bg-neon-teal/10 px-2 py-0.5 rounded transition-all"
            >
              Accept Answer
            </button>
          )}
        </div>
        <div className="text-sm text-slate-300 leading-relaxed mt-0.5 break-words">
          <ReactMarkdown
            components={{
              code({ inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" className="text-xs my-1" {...props}>{String(children).replace(/\n$/, '')}</SyntaxHighlighter>
                ) : (<code className="bg-white/10 px-1 rounded text-neon-teal font-mono text-xs" {...props}>{children}</code>);
              }
            }}
          >
            {comment.text}
          </ReactMarkdown>
        </div>
        
        {userId && (
          <button
            onClick={() => setReplyOpen(!replyOpen)}
            className="text-[10px] font-medium text-slate-500 hover:text-white mt-1 transition-colors"
          >
            Reply
          </button>
        )}

        {replyOpen && (
          <div className="flex gap-2 items-center mt-2 relative">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleReplySubmit()}
              placeholder="Write a reply..."
              className="w-full bg-white/5 text-xs text-white placeholder-slate-500 rounded-full px-3 py-1.5 pr-8 focus:outline-none focus:ring-1 focus:ring-neon-blue/30 border border-white/5"
            />
            <button
              onClick={handleReplySubmit}
              disabled={!replyText.trim() || submitting}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neon-blue disabled:text-slate-600 hover:scale-110"
            >
              <Send size={12} />
            </button>
          </div>
        )}

        {replies.length > 0 && (
          <div className="border-l border-white/10 pl-3 mt-1 space-y-1">
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
        className={`flex items-center gap-2 text-sm transition-colors ${
          open ? 'text-neon-teal' : 'text-slate-400 hover:text-white'
        }`}
      >
        <MessageSquare size={17} />
        <span>{comments.length}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-white/5 space-y-1">
              {comments.length === 0 && (
                <p className="text-xs text-slate-500 italic text-center py-2">No comments yet — start the conversation!</p>
              )}
              {topLevelComments.map((c) => (
                <CommentNode key={c.id} comment={c} allComments={comments} post={post} userId={userId} userName={userName} userPhoto={userPhoto} onAddComment={onAddComment} onAcceptAnswer={onAcceptAnswer} />
              ))}

              {userId && (
                <div className="flex gap-3 items-center pt-3 mt-3 border-t border-white/5">
                  <img
                    src={userPhoto || avatarUrl(userName)}
                    alt=""
                    className="w-7 h-7 rounded-full shrink-0"
                  />
                  <div className="flex-grow relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                      placeholder="Write a comment..."
                      className="w-full bg-white/5 text-sm text-white placeholder-slate-500 rounded-full px-4 py-2 pr-10 focus:outline-none focus:ring-1 focus:ring-neon-blue/30 border border-white/5 transition-all"
                    />
                    <button
                      onClick={handleSubmit}
                      disabled={!text.trim() || submitting}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neon-blue disabled:text-slate-600 hover:scale-110 transition-transform"
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

function PostCard({ post, userId, userName, userPhoto, onVote, onAddComment, onAcceptAnswer, onDelete, index }) {
  const isOwner = userId && post.author_uid === userId;
  const isQuestion = post.post_type === 'question';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      className={`glass rounded-3xl border ${isQuestion && post.is_resolved ? 'border-neon-teal/30 shadow-[0_0_20px_rgba(0,255,204,0.1)]' : 'border-white/[0.06] hover:border-white/20 hover:shadow-[0_0_40px_rgba(112,0,255,0.15)]'} transition-all duration-500 group relative overflow-hidden`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
      <div className="p-6 flex relative z-10">
        {/* Vote sidebar */}
        <VoteButtons post={post} userId={userId} onVote={onVote} />

        {/* Content */}
        <div className="flex-grow min-w-0">
          {/* Author header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <img
                src={post.author_avatar || avatarUrl(post.author_name)}
                alt={post.author_name}
                className="w-10 h-10 rounded-full border border-white/10"
              />
              <div>
                <h4 className="font-semibold text-sm text-white leading-tight flex items-center gap-2">
                  {post.author_name}
                  {post.community_name && (
                    <>
                      <span className="text-slate-500 font-normal">in</span>
                      <span className="text-neon-purple text-xs bg-neon-purple/10 px-1.5 py-0.5 rounded">{post.community_name}</span>
                    </>
                  )}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">{timeAgo(post.created_at)}</p>
              </div>
            </div>
            {isOwner && (
              <button
                onClick={() => onDelete(post.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-neon-magenta transition-all p-1.5 rounded-lg hover:bg-white/5"
                title="Delete post"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {/* Title and Post Type */}
          <div className="mb-2">
            {isQuestion && (
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md mb-2 ${post.is_resolved ? 'bg-neon-teal/20 text-neon-teal' : 'bg-amber-500/20 text-amber-500'}`}>
                {post.is_resolved ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                {post.is_resolved ? 'Resolved' : 'Question'}
              </span>
            )}
            {post.title && (
              <h3 className="font-bold text-base text-white leading-snug">{post.title}</h3>
            )}
          </div>

          {/* Body */}
          <div className="text-sm text-slate-300 leading-relaxed break-words mb-3">
            <ReactMarkdown
              components={{
                code({ inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" className="rounded-xl border border-white/10 my-2 text-xs" {...props}>
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className="bg-white/10 px-1 py-0.5 rounded text-neon-teal font-mono text-xs" {...props}>
                      {children}
                    </code>
                  );
                },
                p({ children }) { return <p className="mb-2 last:mb-0">{children}</p>; },
                a({ children, href }) { return <a href={href} className="text-neon-blue hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>; }
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>

          {/* Tags */}
          {post.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-xs text-neon-blue/80 bg-neon-blue/[0.08] px-2.5 py-1 rounded-md font-medium"
                >
                  <Hash size={10} />{tag}
                </span>
              ))}
            </div>
          )}

          {/* Actions row */}
          <div className="flex items-center gap-5 pt-3 border-t border-white/5">
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
    </motion.div>
  );
}

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
      <div className="glass-strong rounded-2xl p-5 border border-white/[0.06] mb-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
            <User size={18} className="text-slate-500" />
          </div>
          <button
            onClick={login}
            className="flex-grow text-left text-slate-500 text-sm bg-white/[0.03] rounded-full px-4 py-3 border border-white/5 hover:border-white/10 transition-colors"
          >
            Sign in to share with the community...
          </button>
        </div>
      </div>
    );
  }

  const photo = user.photo_url || avatarUrl(user.display_name);

  return (
    <div className="glass-strong rounded-3xl border border-white/10 hover:border-white/20 transition-all duration-500 mb-8 overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.3)]">
      <div className="p-6">
        <div className="flex gap-3">
          <img src={photo} alt="" className="w-10 h-10 rounded-full border border-white/10 shrink-0" />
          <div className="flex-grow">
            {!expanded ? (
              <button
                onClick={() => setExpanded(true)}
                className="w-full text-left text-slate-400 text-sm bg-white/[0.03] rounded-full px-4 py-3 border border-white/5 hover:border-white/10 hover:bg-white/[0.05] transition-all"
              >
                <span className="flex items-center gap-2">
                  <PenLine size={14} />
                  Share something with the community...
                </span>
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="flex gap-2">
                  <select
                    value={postType}
                    onChange={(e) => setPostType(e.target.value)}
                    className="bg-white/5 text-white text-xs border border-white/10 rounded-lg px-2 py-1.5 focus:outline-none"
                  >
                    <option value="discussion" className="bg-slate-900">Discussion</option>
                    <option value="question" className="bg-slate-900">Question</option>
                  </select>
                  <select
                    value={communityId}
                    onChange={(e) => setCommunityId(e.target.value)}
                    className="bg-white/5 text-white text-xs border border-white/10 rounded-lg px-2 py-1.5 focus:outline-none max-w-[150px] truncate"
                  >
                    <option value="" className="bg-slate-900">Global Feed</option>
                    {communities?.map(c => (
                      <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Post title (optional)"
                  className="w-full bg-transparent text-white font-semibold placeholder-slate-500 focus:outline-none text-base"
                />
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's on your mind?"
                  rows={3}
                  autoFocus
                  className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
                />

                {/* Tags */}
                <div className="flex flex-wrap gap-2 items-center">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 text-xs text-neon-blue bg-neon-blue/10 px-2.5 py-1 rounded-md"
                    >
                      #{t}
                      <button onClick={() => setTags(tags.filter((x) => x !== t))} className="hover:text-white">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  {tags.length < 5 && (
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); }
                      }}
                      placeholder="Add tag..."
                      className="bg-transparent text-xs text-slate-400 placeholder-slate-600 focus:outline-none w-20"
                    />
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="flex justify-between items-center px-5 py-3 border-t border-white/5 bg-white/[0.01]">
          <div className="flex gap-2">
            <button
              className="p-2 text-slate-500 hover:text-white glass rounded-lg transition-colors"
              title="Add tag"
              onClick={addTag}
            >
              <Hash size={16} />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setExpanded(false); setTitle(''); setContent(''); setTags([]); }}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || posting}
              className="px-5 py-2 bg-gradient-to-r from-neon-purple to-neon-blue text-white text-sm font-semibold rounded-full
                         hover:shadow-[0_0_20px_rgba(112,0,255,0.3)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
            >
              {posting ? (
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Posting...
                </span>
              ) : 'Post'}
            </button>
          </div>
        </div>
      )}
    </div>
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
    } catch {}
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
      let url = `${API_URL}/api/community/?sort=${sortBy}`;
      if (activeTab === 'my') {
        url = `${API_URL}/api/community/user/${userId}`;
      } else if (selectedCommunity) {
        url += `&community_id=${selectedCommunity}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch {
      setError('Could not load posts. The server might be unavailable.');
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
    { key: 'feed', label: 'Feed', icon: Sparkles },
    ...(user ? [{ key: 'my', label: 'My Posts', icon: User }] : []),
  ];

  return (
    <>
      {/* ── Mobile layout (stacked, natural scroll) ── */}
      <div className="lg:hidden pt-28 pb-20 px-4 sm:px-6 flex flex-col gap-3 relative z-10">
        {/* Profile card */}
        <div className="glass-strong rounded-2xl p-5 border border-white/[0.06]">
          <div className="flex items-center gap-3 mb-4">
            <img src={userPhoto || avatarUrl(userName)} alt="Profile" className="w-12 h-12 rounded-full border border-white/10" />
            <div className="min-w-0">
              <h3 className="font-bold text-base truncate">{userName}</h3>
              <p className="text-slate-400 text-xs truncate">{user?.branch || 'Community Member'}</p>
            </div>
          </div>
          {user ? (
            <Link to="/profile" className="block w-full py-2.5 glass border border-white/5 rounded-xl text-xs font-medium hover:bg-white/10 transition-colors text-center text-slate-300">View Profile</Link>
          ) : (
            <button onClick={login} className="w-full py-2.5 glass border border-white/5 rounded-xl text-xs font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-neon-blue"><LogIn size={14} /> Sign in to join</button>
          )}
        </div>

        <div className="mb-4">
          <CommunitySearch posts={posts} communities={communities} onSelectCommunity={(id) => { setSelectedCommunity(id); setActiveTab('feed'); }} />
        </div>

        <CreatePostCard user={user} onPost={handlePost} login={login} communities={communities} />

        {/* Tabs + Sort */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/5">
            {tabs.map((tab) => { const Icon = tab.icon; return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${activeTab === tab.key ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><Icon size={13} />{tab.label}</button>
            ); })}
          </div>
          {activeTab === 'feed' && (
            <div className="flex gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/5">
              <button onClick={() => setSortBy('votes')} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-all ${sortBy === 'votes' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}><TrendingUp size={12} /> Top</button>
              <button onClick={() => setSortBy('recent')} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-all ${sortBy === 'recent' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}><Clock size={12} /> New</button>
            </div>
          )}
        </div>

        {/* Posts */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20"><div className="w-10 h-10 border-2 border-neon-blue/20 border-t-neon-blue rounded-full animate-spin mb-4" /><p className="text-xs text-slate-500">Loading posts...</p></div>
          ) : error ? (
            <div className="glass rounded-2xl p-10 border border-white/5 text-center"><AlertCircle size={32} className="mx-auto text-neon-magenta/60 mb-3" /><p className="text-sm text-slate-400">{error}</p><button onClick={fetchPosts} className="mt-4 px-5 py-2 text-xs font-medium glass rounded-full border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 transition-colors">Retry</button></div>
          ) : posts.length === 0 ? (
            <div className="glass rounded-2xl p-12 border border-white/5 text-center">
              <div className="text-4xl mb-4">{activeTab === 'my' ? '📝' : '✨'}</div>
              <h3 className="text-base font-bold text-white mb-2">{activeTab === 'my' ? 'No posts yet' : 'The feed is empty'}</h3>
              <p className="text-slate-400 text-sm mb-5">{activeTab === 'my' ? 'Share your first update with the community!' : user ? 'Be the first to share something awesome!' : 'Sign in to post and engage with the community.'}</p>
              {!user && <button onClick={login} className="px-6 py-2.5 bg-gradient-to-r from-neon-purple to-neon-blue text-white text-sm font-semibold rounded-full hover:shadow-[0_0_20px_rgba(112,0,255,0.3)] transition-all">Sign In</button>}
            </div>
          ) : (
            <AnimatePresence>{posts.map((post, i) => <PostCard key={post.id} post={post} userId={userId} userName={userName} userPhoto={userPhoto} onVote={handleVote} onAddComment={handleAddComment} onAcceptAnswer={handleAcceptAnswer} onDelete={handleDelete} index={i} />)}</AnimatePresence>
          )}
        </div>
      </div>

      {/* ── Desktop layout (fixed sidebars, scrollable feed) ── */}
      <div className="hidden lg:flex fixed inset-0 top-[72px] z-10">
        {/* Left Sidebar — fixed, own scroll */}
        <aside
          data-lenis-prevent
          className="w-[280px] shrink-0 h-full overflow-y-auto pl-4 pr-2 pt-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          <div className="flex flex-col gap-5 pb-8">
            {/* Profile card */}
            <div className="glass-strong rounded-2xl p-5 border border-white/[0.06]">
              <div className="flex items-center gap-3 mb-5">
                <img
                  src={userPhoto || avatarUrl(userName)}
                  alt="Profile"
                  className="w-12 h-12 rounded-full border border-white/10"
                />
                <div className="min-w-0">
                  <h3 className="font-bold text-base truncate">{userName}</h3>
                  <p className="text-slate-400 text-xs truncate">{user?.branch || 'Community Member'}</p>
                </div>
              </div>
              {user ? (
                <Link
                  to="/profile"
                  className="block w-full py-2.5 glass border border-white/5 rounded-xl text-xs font-medium hover:bg-white/10 transition-colors text-center text-slate-300"
                >
                  View Profile
                </Link>
              ) : (
                <button
                  onClick={login}
                  className="w-full py-2.5 glass border border-white/5 rounded-xl text-xs font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-neon-blue"
                >
                  <LogIn size={14} /> Sign in to join
                </button>
              )}
            </div>

            {/* Quick links */}
            <div className="glass-strong rounded-2xl p-5 border border-white/[0.06]">
              <h4 className="font-bold text-sm mb-3 flex items-center gap-2 text-slate-200">
                <Sparkles size={14} className="text-neon-purple" /> Quick Links
              </h4>
              <div className="space-y-1">
                <Link
                  to="/discover"
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Compass size={14} className="text-neon-teal" />Explore Projects
                </Link>
                <Link
                  to="/onboarding"
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Rocket size={14} className="text-neon-purple" />Update Profile
                </Link>
              </div>
            </div>

            {/* Top Communities */}
            <div className="glass-strong rounded-2xl p-5 border border-white/[0.06]">
              <h4 className="font-bold text-sm mb-3 flex items-center gap-2 text-slate-200">
                <Hash size={14} className="text-neon-blue" /> Top Communities
              </h4>
              <div className="space-y-1">
                <button
                  onClick={() => { setSelectedCommunity(null); setActiveTab('feed'); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs transition-colors text-left ${!selectedCommunity && activeTab === 'feed' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  <Sparkles size={14} className={!selectedCommunity ? 'text-neon-blue' : ''} /> Global Feed
                </button>
                {communities.slice(0, 5).map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedCommunity(c.id); setActiveTab('feed'); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs transition-colors text-left ${selectedCommunity === c.id ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                  >
                    <span className="text-sm">{c.icon}</span> {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Join CTA */}
            {!user && (
              <div className="glass rounded-2xl p-5 border border-white/[0.06] text-center">
                <h4 className="font-bold text-sm mb-1.5">Join Uni-Verse</h4>
                <p className="text-[11px] text-slate-400 mb-3">Connect, share, and build with fellow students.</p>
                <button
                  onClick={login}
                  className="w-full py-2.5 bg-gradient-to-r from-neon-purple to-neon-blue text-white text-xs font-semibold rounded-xl hover:shadow-[0_0_20px_rgba(112,0,255,0.3)] transition-all"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Center Feed — scrollable */}
        <main
          data-lenis-prevent
          className="flex-grow h-full overflow-y-auto px-3 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          <div className="max-w-2xl mx-auto py-6 pb-16">
            <div className="mb-4">
              <CommunitySearch posts={posts} communities={communities} onSelectCommunity={(id) => { setSelectedCommunity(id); setActiveTab('feed'); }} />
            </div>

            {/* Post composer */}
            <CreatePostCard user={user} onPost={handlePost} login={login} communities={communities} />

            {/* Tabs + Sort */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/5">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                        activeTab === tab.key
                          ? 'bg-white/10 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon size={13} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {activeTab === 'feed' && (
                <div className="flex gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/5">
                  <button
                    onClick={() => setSortBy('votes')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-all ${
                      sortBy === 'votes'
                        ? 'bg-white/10 text-white'
                        : 'text-slate-500 hover:text-white'
                    }`}
                  >
                    <TrendingUp size={12} /> Top
                  </button>
                  <button
                    onClick={() => setSortBy('recent')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-all ${
                      sortBy === 'recent'
                        ? 'bg-white/10 text-white'
                        : 'text-slate-500 hover:text-white'
                    }`}
                  >
                    <Clock size={12} /> New
                  </button>
                </div>
              )}
            </div>

            {/* Posts list */}
            <div className="space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-10 h-10 border-2 border-neon-blue/20 border-t-neon-blue rounded-full animate-spin mb-4" />
                  <p className="text-xs text-slate-500">Loading posts...</p>
                </div>
              ) : error ? (
                <div className="glass rounded-2xl p-10 border border-white/5 text-center">
                  <AlertCircle size={32} className="mx-auto text-neon-magenta/60 mb-3" />
                  <p className="text-sm text-slate-400">{error}</p>
                  <button
                    onClick={fetchPosts}
                    className="mt-4 px-5 py-2 text-xs font-medium glass rounded-full border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : posts.length === 0 ? (
                <div className="glass rounded-2xl p-12 border border-white/5 text-center">
                  <div className="text-4xl mb-4">{activeTab === 'my' ? '📝' : '✨'}</div>
                  <h3 className="text-base font-bold text-white mb-2">
                    {activeTab === 'my' ? 'No posts yet' : 'The feed is empty'}
                  </h3>
                  <p className="text-slate-400 text-sm mb-5">
                    {activeTab === 'my'
                      ? 'Share your first update with the community!'
                      : user
                      ? 'Be the first to share something awesome!'
                      : 'Sign in to post and engage with the community.'}
                  </p>
                  {!user && (
                    <button
                      onClick={login}
                      className="px-6 py-2.5 bg-gradient-to-r from-neon-purple to-neon-blue text-white text-sm font-semibold rounded-full hover:shadow-[0_0_20px_rgba(112,0,255,0.3)] transition-all"
                    >
                      Sign In
                    </button>
                  )}
                </div>
              ) : (
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
              )}
            </div>
          </div>
        </main>

        {/* Right Sidebar — fixed, own scroll */}
        <aside
          data-lenis-prevent
          className="w-[260px] shrink-0 h-full overflow-y-auto pr-4 pl-2 pt-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          <div className="flex flex-col gap-5 pb-8">
            {/* Trending Questions */}
            <div className="glass-strong rounded-2xl p-5 border border-white/[0.06]">
              <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                <HelpCircle size={14} className="text-amber-500" /> Trending Questions
              </h4>
              <div className="space-y-3">
                {trendingQuestions.length === 0 ? (
                   <p className="text-xs text-slate-500 italic">No questions yet</p>
                ) : trendingQuestions.map(q => (
                  <div key={q.id} className="group cursor-pointer">
                    <p className="text-xs text-slate-300 group-hover:text-amber-400 transition-colors line-clamp-2 leading-relaxed">{q.title}</p>
                    <div className="flex gap-2 text-[10px] text-slate-500 mt-1.5">
                      <span className="flex items-center gap-0.5"><ChevronUp size={10} /> {q.upvotes}</span>
                      <span className="flex items-center gap-0.5"><MessageSquare size={10} /> {q.comment_count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>


            {/* Community stats */}
            <div className="glass-strong rounded-2xl p-5 border border-white/[0.06]">
              <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                <Sparkles size={14} className="text-neon-blue" /> Community Pulse
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Total Posts</span>
                  <span className="text-xs font-bold text-white">{posts.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Total Comments</span>
                  <span className="text-xs font-bold text-white">
                    {posts.reduce((sum, p) => sum + (p.comments?.length || 0), 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Total Votes</span>
                  <span className="text-xs font-bold text-white">
                    {posts.reduce((sum, p) => sum + Math.abs(p.upvotes || 0), 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

