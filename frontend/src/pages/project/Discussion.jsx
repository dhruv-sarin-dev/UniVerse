import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MessageSquare, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import API_URL from '../../api';

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

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 md:p-8">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <MessageSquare size={20} className="text-teal-400" />
        Community Discussion
      </h3>

      {/* Comment Box */}
      <div className="mb-8">
        <textarea
          placeholder={user ? "What are your thoughts?" : "Sign in to join the conversation..."}
          value={commentText}
          onChange={e => setCommentText(e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 min-h-[120px] transition-all"
          disabled={!user}
        />
        <div className="flex justify-end mt-3">
          <button
            onClick={handleAddComment}
            disabled={!user || !commentText.trim()}
            className="bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg overflow-hidden relative group"
          >
            <span className="relative z-10 flex items-center gap-2">
              Post Comment <Send size={14} />
            </span>
          </button>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-6">
        {project.comments?.map((c, idx) => (
          <div key={c.id || idx} className="flex gap-4 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white shrink-0 shadow-lg">
              {c.user_name?.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-slate-100 text-sm">{c.user_name}</span>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter self-center py-0.5 px-1.5 bg-white/5 rounded">Student</span>
                <span className="text-[10px] text-slate-600 ml-auto">
                  {c.timestamp ? new Date(c.timestamp).toLocaleTimeString() : 'Recent'}
                </span>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/5 group-hover:border-white/10 transition-colors">
                {c.text}
              </p>
            </div>
          </div>
        ))}
        {(!project.comments || project.comments.length === 0) && (
          <div className="text-center py-8 text-slate-500 italic">
            Be the first to start a conversation!
          </div>
        )}
      </div>
    </div>
  );
}
