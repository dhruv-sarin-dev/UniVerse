import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Loader2,
  Send,
  Sparkles,
  Code2,
  GitBranch,
  Target,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import API_URL from '../api';

const CATEGORY_CONFIG = {
  Technical: {
    icon: Code2,
    color: 'from-cyan-400 to-blue-500',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    label: 'Technical Gap Analysis',
  },
  Workflow: {
    icon: GitBranch,
    color: 'from-violet-400 to-purple-500',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    label: 'Workflow Alignment',
  },
  Priority: {
    icon: Target,
    color: 'from-amber-400 to-orange-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    label: 'Priority Judgment',
  },
};

export default function ApplicantCompatibilityExam({
  projectContext,
  applicantContext,
  onComplete,
}) {
  const [phase, setPhase] = useState('idle'); // idle | generating | exam | submitting | done | error
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState(null);
  const [activeQuestion, setActiveQuestion] = useState(0);

  // ── Generate Exam ──────────────────────────────────────────────────────
  const handleStartExam = async () => {
    setPhase('generating');
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/compatibility/generate-exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: projectContext,
          applicant: applicantContext,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error ${res.status}`);
      }
      const data = await res.json();
      setQuestions(data.questions);
      // Initialize answer slots
      const initial = {};
      data.questions.forEach((q) => (initial[q.id] = ''));
      setAnswers(initial);
      setActiveQuestion(0);
      setPhase('exam');
    } catch (err) {
      setError(err.message);
      setPhase('error');
    }
  };

  // ── Submit Answers ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    // Validate all answered
    const unanswered = questions.filter((q) => !answers[q.id]?.trim());
    if (unanswered.length > 0) {
      setError(`Please answer all ${unanswered.length} remaining question(s).`);
      return;
    }
    setPhase('submitting');
    setError(null);
    try {
      const answerPayload = questions.map((q) => ({
        questionId: q.id,
        answerText: answers[q.id],
      }));

      const res = await fetch(`${API_URL}/api/compatibility/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: projectContext,
          questions,
          answers: answerPayload,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error ${res.status}`);
      }
      const evaluation = await res.json();
      setPhase('done');
      if (onComplete) onComplete(evaluation);
    } catch (err) {
      setError(err.message);
      setPhase('error');
    }
  };

  // Auto-start exam on mount
  useEffect(() => {
    if (phase === 'idle' && projectContext && applicantContext) {
      handleStartExam();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectContext, applicantContext]);

  const allAnswered = questions.every((q) => answers[q.id]?.trim());

  // ── Generating State ───────────────────────────────────────────────────
  if (phase === 'generating') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[400px] gap-6"
      >
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-600/20 to-cyan-600/20 flex items-center justify-center">
            <Brain className="w-10 h-10 text-violet-400 animate-pulse" />
          </div>
          <div className="absolute inset-0 w-20 h-20 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-white">Analyzing Compatibility Gaps</h3>
          <p className="text-sm text-slate-400 max-w-md">
            Our AI is comparing <span className="text-cyan-400">{projectContext?.name}</span>'s
            tech requirements against your profile to generate targeted questions...
          </p>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-violet-500"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </motion.div>
    );
  }

  // ── Submitting State ───────────────────────────────────────────────────
  if (phase === 'submitting') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[400px] gap-6"
      >
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-600/20 to-cyan-600/20 flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-emerald-400" />
          </div>
          <motion.div
            className="absolute inset-[-4px] rounded-full border-2 border-transparent border-t-emerald-400 border-r-cyan-400"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-white">Processing Compatibility...</h3>
          <p className="text-sm text-slate-400 max-w-sm">
            Evaluating your answers against project requirements, workflow alignment, and priority fit
          </p>
        </div>
        {/* Progress bar */}
        <div className="w-64 h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 8, ease: 'easeInOut' }}
          />
        </div>
      </motion.div>
    );
  }

  // ── Error State ────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[300px] gap-4"
      >
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <p className="text-red-400 text-sm text-center max-w-md">{error}</p>
        <button
          onClick={handleStartExam}
          className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 transition-all"
        >
          Retry
        </button>
      </motion.div>
    );
  }

  // ── Done State ─────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[300px] gap-4"
      >
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        </div>
        <h3 className="text-xl font-bold text-white">Exam Submitted!</h3>
        <p className="text-sm text-slate-400">Your compatibility report has been sent to the team lead.</p>
      </motion.div>
    );
  }

  // ── Idle (shouldn't show, auto-starts) ─────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <button
          onClick={handleStartExam}
          className="px-8 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-semibold hover:shadow-lg hover:shadow-violet-500/20 transition-all"
        >
          Start Compatibility Exam
        </button>
      </div>
    );
  }

  // ── Exam Phase — The Main UI ───────────────────────────────────────────
  const currentQ = questions[activeQuestion];
  const catConfig = CATEGORY_CONFIG[currentQ?.category] || CATEGORY_CONFIG.Technical;
  const CatIcon = catConfig.icon;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600/30 to-cyan-600/30 flex items-center justify-center">
            <Brain className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Compatibility Exam</h2>
            <p className="text-xs text-slate-500">
              Tailored for <span className="text-cyan-400">{projectContext?.name}</span>
            </p>
          </div>
        </div>
        {/* Progress dots */}
        <div className="flex gap-2">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setActiveQuestion(i)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                i === activeQuestion
                  ? 'bg-violet-500 scale-125 shadow-lg shadow-violet-500/50'
                  : answers[q.id]?.trim()
                  ? 'bg-emerald-500/60'
                  : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </motion.div>

      {/* Error banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
        >
          {error}
        </motion.div>
      )}

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeQuestion}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden"
        >
          {/* Category header */}
          <div
            className={`px-5 py-3 flex items-center gap-3 ${catConfig.bg} border-b ${catConfig.border}`}
          >
            <CatIcon className="w-4 h-4 text-white/60" />
            <span className="text-xs font-medium text-white/60 tracking-wide uppercase">
              {catConfig.label}
            </span>
            <span className="ml-auto text-xs text-white/30">
              {activeQuestion + 1} / {questions.length}
            </span>
          </div>

          {/* Question */}
          <div className="p-6 space-y-5">
            <p className="text-[15px] text-slate-200 leading-relaxed">{currentQ?.questionText}</p>

            {/* Answer textarea */}
            <div className="relative">
              <textarea
                value={answers[currentQ?.id] || ''}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [currentQ.id]: e.target.value }))
                }
                placeholder="Write your answer here..."
                rows={5}
                className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/[0.08] text-sm text-white placeholder-slate-600 resize-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/40 transition-all outline-none"
              />
              <span className="absolute bottom-3 right-3 text-xs text-slate-600">
                {(answers[currentQ?.id] || '').length} chars
              </span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation + Submit */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setActiveQuestion((p) => Math.max(0, p - 1))}
          disabled={activeQuestion === 0}
          className="px-5 py-2.5 rounded-xl border border-white/[0.06] text-sm text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          ← Previous
        </button>

        <div className="flex gap-3">
          {activeQuestion < questions.length - 1 ? (
            <button
              onClick={() => setActiveQuestion((p) => Math.min(questions.length - 1, p + 1))}
              className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/[0.08] text-sm text-white hover:bg-white/10 transition-all"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={() => { setError(null); handleSubmit(); }}
              disabled={!allAnswered}
              className="group relative px-7 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-violet-600/25 transition-all flex items-center gap-2"
            >
              <Send className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              Submit Exam
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
