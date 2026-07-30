import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  ArrowLeft,
  Sparkles,
  Users,
  Rocket,
  Settings2,
  Play,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ApplicantCompatibilityExam from '../components/ApplicantCompatibilityExam';
import TeamLeadApplicantView from '../components/TeamLeadApplicantView';

/**
 * CompatibilityExam page — orchestrates the full exam flow.
 *
 * Query params or props can supply projectContext; otherwise, a demo mode
 * allows the user to fill in context manually.
 */
export default function CompatibilityExam() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('setup'); // setup | exam | results
  const [evaluation, setEvaluation] = useState(null);
  const [submittedAnswers, setSubmittedAnswers] = useState(null);
  const [savedQuestions, setSavedQuestions] = useState(null);

  // ── Project Context Form ──────────────────────────────────────────────
  const [projectForm, setProjectForm] = useState({
    id: 'proj_demo_001',
    name: '',
    techStack: '',
    currentPhase: 'prototyping',
    recentChallenges: '',
  });

  // ── Applicant Context (auto-filled from auth) ─────────────────────────
  const applicantContext = {
    id: user?.uid || 'applicant_001',
    name: user?.display_name || 'Demo Applicant',
    knownSkills: user?.skills || ['JavaScript', 'React'],
    bio: user?.bio || 'A passionate student developer.',
  };

  const projectContext = {
    id: projectForm.id,
    name: projectForm.name,
    techStack: projectForm.techStack
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    currentPhase: projectForm.currentPhase,
    recentChallenges: projectForm.recentChallenges,
  };

  const canStart =
    projectForm.name.trim() && projectForm.techStack.trim();

  const handleExamComplete = useCallback((evalResult) => {
    setEvaluation(evalResult);
    setMode('results');
  }, []);

  const handleStartExam = () => {
    setMode('exam');
  };

  const phases = [
    { value: 'prototyping', label: 'Prototyping' },
    { value: 'mvp', label: 'MVP Build' },
    { value: 'debugging', label: 'Debugging' },
    { value: 'scaling', label: 'Scaling' },
    { value: 'polishing', label: 'Polishing' },
    { value: 'pre-launch', label: 'Pre-Launch' },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Back button */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </motion.button>

        {/* ── Hero Banner ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium mb-4">
            <Brain className="w-3.5 h-3.5" />
            AI-Powered Compatibility Analysis
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 text-gradient">
              Compatibility Exam
            </span>
          </h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Our AI analyzes the gap between a project's needs and an applicant's skills,
            then generates a targeted 3-question exam to verify compatibility.
          </p>
        </motion.div>

        {/* ── Phase Indicator ──────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {[
            { key: 'setup', label: 'Setup', icon: Settings2 },
            { key: 'exam', label: 'Exam', icon: Play },
            { key: 'results', label: 'Results', icon: Sparkles },
          ].map((step, i) => {
            const StepIcon = step.icon;
            const isActive = step.key === mode;
            const isCompleted =
              (step.key === 'setup' && (mode === 'exam' || mode === 'results')) ||
              (step.key === 'exam' && mode === 'results');
            return (
              <div key={step.key} className="flex items-center gap-2">
                {i > 0 && (
                  <div
                    className={`w-8 h-px ${
                      isCompleted || isActive ? 'bg-violet-500/50' : 'bg-white/10'
                    }`}
                  />
                )}
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all ${
                    isActive
                      ? 'bg-violet-500/20 border border-violet-500/30 text-violet-300'
                      : isCompleted
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      : 'bg-white/[0.02] border border-white/[0.06] text-slate-500'
                  }`}
                >
                  <StepIcon className="w-3.5 h-3.5" />
                  {step.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Content Phases ───────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {/* SETUP PHASE */}
          {mode === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Two-column: Project + Applicant */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Project Context Card */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Rocket className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-semibold text-white">Project Context</h3>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Project Name *</label>
                      <input
                        type="text"
                        value={projectForm.name}
                        onChange={(e) =>
                          setProjectForm((p) => ({ ...p, name: e.target.value }))
                        }
                        placeholder="e.g. Uni-Verse Platform"
                        className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/[0.08] text-sm text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-violet-500/30"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">
                        Tech Stack * <span className="text-slate-600">(comma-separated)</span>
                      </label>
                      <input
                        type="text"
                        value={projectForm.techStack}
                        onChange={(e) =>
                          setProjectForm((p) => ({ ...p, techStack: e.target.value }))
                        }
                        placeholder="React, FastAPI, Firebase, WebRTC"
                        className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/[0.08] text-sm text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-violet-500/30"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Current Phase</label>
                      <select
                        value={projectForm.currentPhase}
                        onChange={(e) =>
                          setProjectForm((p) => ({ ...p, currentPhase: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/[0.08] text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/30"
                      >
                        {phases.map((ph) => (
                          <option key={ph.value} value={ph.value} className="bg-gray-900">
                            {ph.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">
                        Recent Challenges
                      </label>
                      <textarea
                        value={projectForm.recentChallenges}
                        onChange={(e) =>
                          setProjectForm((p) => ({
                            ...p,
                            recentChallenges: e.target.value,
                          }))
                        }
                        placeholder="e.g. WebSocket disconnections, slow API response times..."
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/[0.08] text-sm text-white placeholder-slate-600 resize-none outline-none focus:ring-2 focus:ring-violet-500/30"
                      />
                    </div>
                  </div>
                </div>

                {/* Applicant Context Card (auto-filled) */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-violet-400" />
                    <h3 className="text-sm font-semibold text-white">Applicant Profile</h3>
                    <span className="ml-auto text-[10px] text-emerald-400/60 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      Auto-filled
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Name</label>
                      <div className="px-3 py-2 rounded-lg bg-black/20 border border-white/[0.04] text-sm text-slate-300">
                        {applicantContext.name}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Known Skills</label>
                      <div className="flex flex-wrap gap-1.5">
                        {applicantContext.knownSkills.map((skill) => (
                          <span
                            key={skill}
                            className="px-2 py-0.5 text-xs rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Bio</label>
                      <div className="px-3 py-2 rounded-lg bg-black/20 border border-white/[0.04] text-sm text-slate-300">
                        {applicantContext.bio || 'No bio set'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Start Button */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleStartExam}
                  disabled={!canStart}
                  className="group relative px-8 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-600 text-sm font-semibold text-white disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-xl hover:shadow-violet-600/20 transition-all flex items-center gap-2"
                >
                  <Brain className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Generate AI Compatibility Exam
                </button>
              </div>
            </motion.div>
          )}

          {/* EXAM PHASE */}
          {mode === 'exam' && (
            <motion.div
              key="exam"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ApplicantCompatibilityExam
                projectContext={projectContext}
                applicantContext={applicantContext}
                onComplete={handleExamComplete}
              />
            </motion.div>
          )}

          {/* RESULTS PHASE */}
          {mode === 'results' && evaluation && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <TeamLeadApplicantView
                evaluation={evaluation}
                applicantName={applicantContext.name}
                projectName={projectContext.name}
                answers={submittedAnswers}
              />

              {/* Restart */}
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => {
                    setMode('setup');
                    setEvaluation(null);
                    setSubmittedAnswers(null);
                  }}
                  className="px-6 py-2.5 rounded-xl border border-white/[0.08] text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  Run Another Exam
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
