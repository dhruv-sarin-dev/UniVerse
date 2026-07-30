import { useState, useEffect } from 'react';
/* eslint-disable no-unused-vars */
import { motion, AnimatePresence } from 'framer-motion';
/* eslint-enable no-unused-vars */
import { Heart, MessageSquare, Share2, Award, Zap, TrendingUp, Code, LogIn, Compass, Rocket } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import API_URL from '../api';

export default function Home() {
  const { user, login } = useAuth();
  const [activeTab, setActiveTab] = useState('feed');
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPostText, setNewPostText] = useState('');
  const [posting, setPosting] = useState(false);

  // Fetch community posts from API
  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/api/community/posts`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setPosts(data);
        }
      })
      .catch(() => {
        // API unavailable — posts stays empty
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLike = (id) => {
    setLikedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handlePost = async () => {
    if (!newPostText.trim()) return;
    if (!user) return login();
    
    setPosting(true);
    try {
      await fetch(`${API_URL}/api/community/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.uid,
          user_name: user.display_name,
          content: newPostText.trim()
        })
      });
      setNewPostText('');
      const res = await fetch(`${API_URL}/api/community/posts`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) setPosts(data);
    } catch {
      // Silently handle error
    } finally {
      setPosting(false);
    }
  };

  const displayName = user?.display_name || 'Guest';
  const avatarUrl = user?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&bg=0D0D0D&color=fff`;

  return (
    <div className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 relative z-10">
      
      {/* Left Sidebar */}
      <div className="w-full lg:w-1/4">
        <div className="sticky top-28 flex flex-col gap-6">
          <div className="glass-strong rounded-3xl p-6 border border-white/5">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full overflow-hidden border border-white/10">
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{displayName}</h3>
                <p className="text-slate-400 text-sm">{user?.branch || 'Student Developer'}</p>
              </div>
            </div>
            {user ? (
              <div className="space-y-2">
                <Link
                  to="/profile"
                  className="block w-full py-3 glass border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors text-center text-slate-300"
                >
                  View Profile
                </Link>
              </div>
            ) : (
              <button
                onClick={login}
                className="w-full py-3 glass border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-neon-blue"
              >
                <LogIn size={16} /> Sign in to join
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Feed */}
      <div className="w-full lg:w-2/4">
        {/* Post Input */}
        <div className="glass-strong rounded-3xl p-4 mb-8 border border-white/5 flex gap-4">
          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 mt-1">
             <img src={avatarUrl} alt="You" className="w-full h-full object-cover" />
          </div>
          <div className="flex-grow">
            <textarea 
              placeholder={user ? "Share an update on your project..." : "Log in to post updates..."} 
              value={newPostText}
              onChange={(e) => setNewPostText(e.target.value)}
              disabled={!user}
              className="w-full bg-transparent border-none focus:ring-0 focus:outline-none resize-none text-white placeholder-slate-500 h-14 disabled:opacity-50"
            ></textarea>
            <div className="flex justify-between items-center mt-2 border-t border-white/10 pt-3">
              <div className="flex gap-2">
                <button className="p-2 text-slate-400 hover:text-white glass rounded-lg transition-colors"><Zap size={16} /></button>
                <button className="p-2 text-slate-400 hover:text-white glass rounded-lg transition-colors"><Code size={16} /></button>
              </div>
              <button 
                onClick={user ? handlePost : login}
                disabled={posting}
                className="px-6 py-2 bg-white text-black font-semibold rounded-full hover:bg-slate-200 transition-colors text-sm disabled:opacity-50"
              >
                {user ? (posting ? 'Posting...' : 'Post Update') : 'Log In to Post'}
              </button>
            </div>
          </div>
        </div>

        {/* Feed Tabs */}
        <div className="flex items-center gap-6 mb-6 border-b border-white/10 pb-4">
          <button 
            onClick={() => setActiveTab('feed')}
            className={`font-medium pb-4 -mb-[17px] border-b-2 transition-colors ${activeTab === 'feed' ? 'text-white border-neon-blue' : 'text-slate-400 border-transparent hover:text-white'}`}
          >
            My Feed
          </button>
          <button 
            onClick={() => setActiveTab('campus')}
            className={`font-medium pb-4 -mb-[17px] border-b-2 transition-colors ${activeTab === 'campus' ? 'text-white border-neon-blue' : 'text-slate-400 border-transparent hover:text-white'}`}
          >
            Campus Global
          </button>
        </div>

        {/* Posts */}
        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-2 border-neon-blue/20 border-t-neon-blue rounded-full animate-spin mb-4"></div>
              <p className="text-sm text-slate-500">Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="glass rounded-3xl p-12 border border-white/5 text-center">
              <div className="text-4xl mb-4">✨</div>
              <h3 className="text-lg font-bold text-white mb-2">No posts yet</h3>
              <p className="text-slate-400 text-sm mb-6">
                {user ? "Be the first to share an update!" : "Sign in to post and see community updates."}
              </p>
              {!user && (
                <button onClick={login} className="px-6 py-3 bg-white text-black font-semibold rounded-full hover:bg-slate-200 transition-colors text-sm">
                  Sign In
                </button>
              )}
            </div>
          ) : (
            <AnimatePresence>
              {posts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="perf-card glass rounded-3xl p-6 border border-white/5 group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-3 items-center">
                      <img 
                        src={post.author?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.name || post.user_name || 'User')}&bg=0D0D0D&color=fff`} 
                        alt={post.author?.name || post.user_name || 'User'} 
                        className="w-10 h-10 rounded-full" 
                      />
                      <div>
                        <h4 className="font-bold text-sm">{post.author?.name || post.user_name || 'Anonymous'}</h4>
                        <p className="text-xs text-slate-400">{post.author?.role || 'Community Member'} • {post.time || 'Just now'}</p>
                      </div>
                    </div>
                    <button className="text-slate-500 hover:text-white"><Award size={18} /></button>
                  </div>
                  
                  <p className="text-slate-200 text-sm leading-relaxed mb-4">
                    {post.content}
                  </p>
                  
                  {post.tags && (
                    <div className="flex gap-2 mb-6 flex-wrap">
                      {post.tags.map(tag => (
                        <span key={tag} className="text-xs text-neon-blue bg-neon-blue/10 px-2 py-1 rounded-md">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-6 border-t border-white/5 pt-4">
                    <button 
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-2 text-sm transition-colors ${likedPosts.has(post.id) ? 'text-neon-magenta' : 'text-slate-400 hover:text-white'}`}
                    >
                      <Heart size={18} className={likedPosts.has(post.id) ? 'fill-neon-magenta' : ''} /> 
                      {(post.likes || 0) + (likedPosts.has(post.id) ? 1 : 0)}
                    </button>
                    <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
                      <MessageSquare size={18} /> {post.comments || 0}
                    </button>
                    <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors ml-auto">
                      <Share2 size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-full lg:w-1/4 hidden lg:block">
        <div className="sticky top-28 space-y-6">
          <div className="glass-strong rounded-3xl p-6 border border-white/5">
            <h4 className="font-bold mb-4 flex items-center gap-2">
              <Zap size={16} className="text-neon-purple" /> Quick Links
            </h4>
            <div className="space-y-2">
              <Link
                to="/discover"
                className="block px-4 py-3 glass rounded-xl text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
              >
                <Compass size={14} className="text-neon-teal" /> Explore Projects
              </Link>
              <Link
                to="/onboarding"
                className="block px-4 py-3 glass rounded-xl text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
              >
                <Rocket size={14} className="text-neon-purple" /> Create Profile
              </Link>
            </div>
          </div>

          {!user && (
            <div className="glass rounded-3xl p-6 border border-white/5 text-center">
              <h4 className="font-bold mb-2">Join Uni-Verse</h4>
              <p className="text-xs text-slate-400 mb-4">Connect with students, find teams, and build together.</p>
              <button 
                onClick={login}
                className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-slate-200 transition-colors text-sm"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
