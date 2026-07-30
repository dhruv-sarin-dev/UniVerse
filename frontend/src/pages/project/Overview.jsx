import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import API_URL from '../../api';

export default function Overview() {
  const { project } = useOutletContext();
  const { user, login } = useAuth();
  
  const [matchResult, setMatchResult] = useState(null);
  const [isMatching, setIsMatching] = useState(false);

  const handleMatch = async () => {
    if (!user) return login();
    setIsMatching(true);
    try {
      const res = await fetch(`${API_URL}/api/projects/${project.id}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.uid, skills: user.skills || [] })
      });
      const data = await res.json();
      if (data.success) setMatchResult(data.match);
    } catch (err) {
      console.error("Match error", err);
    } finally {
      setIsMatching(false);
    }
  };

  const radarData = (project.required_skills || []).map(skill => ({
    subject: skill,
    A: user?.skills?.includes(skill) ? 100 : 20,
    fullMark: 100,
  }));

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Description */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 md:p-8">
          <h2 className="text-xl font-bold text-white mb-6">About this Project</h2>
          <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed text-lg">
            {project.description}
          </div>
        </div>
      </div>

      {/* AI Match & Skills */}
      <div className="space-y-6">
        {/* Required Skills Card */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 shadow-xl">
          <h4 className="text-sm font-black text-white uppercase tracking-widest mb-4">Stack Requirements</h4>
          <div className="flex flex-wrap gap-2">
            {project.required_skills?.map(skill => (
              <span key={skill} className="px-3 py-1 rounded-lg bg-black/40 text-slate-300 text-xs font-semibold border border-white/5 transition-colors">
                {skill}
              </span>
            ))}
            {(!project.required_skills || project.required_skills.length === 0) && (
              <span className="text-slate-500 text-sm italic">No specific skills listed.</span>
            )}
          </div>
        </div>

        {/* AI Match Card */}
        <div className="bg-gradient-to-br from-purple-600/10 to-blue-600/10 border border-purple-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all"></div>
          
          <h4 className="text-sm font-black text-purple-300 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <Sparkles size={16} /> AI Match Readiness
          </h4>

          {matchResult ? (
            <div className="space-y-4 relative z-10">
              {radarData.length > 0 && (
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke="#4a5568" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Radar name="Skills" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="flex justify-between items-center bg-purple-500/20 rounded-xl p-3 border border-purple-500/30">
                <span className="text-sm font-bold text-white">Probability</span>
                <span className="text-2xl font-black text-purple-400">{matchResult.score}%</span>
              </div>
              <p className="text-xs text-slate-300 italic leading-relaxed text-center">
                "{matchResult.reason}"
              </p>
            </div>
          ) : (
            <div className="py-6 text-center relative z-10">
              <p className="text-slate-400 text-xs mb-4">See how your skills stack up against this project's requirements.</p>
              <button
                onClick={handleMatch}
                disabled={isMatching}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {isMatching ? <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> Scoring...</> : 'Evaluate Compatibility'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
