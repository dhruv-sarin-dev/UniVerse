import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Zap,
  Users,
  Code2,
  Eye,
  EyeOff,
  Sparkles,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

/**
 * Circular progress ring SVG component.
 * Renders a score as a large animated gauge.
 */
function ScoreRing({ score, size = 180, strokeWidth = 10 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(circumference - (score / 100) * circumference);
    }, 300);
    return () => clearTimeout(timer);
  }, [score, circumference]);

  // Color based on score
  const getColor = (s) => {
    if (s >= 75) return { stroke: '#10b981', glow: 'rgba(16, 185, 129, 0.3)', label: 'Strong Fit' };
    if (s >= 50) return { stroke: '#f59e0b', glow: 'rgba(245, 158, 11, 0.3)', label: 'Moderate Fit' };
    if (s >= 30) return { stroke: '#f97316', glow: 'rgba(249, 115, 22, 0.3)', label: 'Weak Fit' };
    return { stroke: '#ef4444', glow: 'rgba(239, 68, 68, 0.3)', label: 'Low Fit' };
  };

  const colorConfig = getColor(score);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colorConfig.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            filter: `drop-shadow(0 0 12px ${colorConfig.glow})`,
          }}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-5xl font-bold text-white tabular-nums"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.6, type: 'spring' }}
        >
          {score}
        </motion.span>
        <span className="text-xs text-slate-400 mt-1 tracking-wider uppercase">{colorConfig.label}</span>
      </div>
    </div>
  );
}

/**
 * Animated progress bar for radar metrics.
 */
function MetricBar({ label, value, icon: Icon, color, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color }} />
          <span className="text-sm text-slate-300">{label}</span>
        </div>
        <span className="text-sm font-semibold text-white tabular-nums">{value}%</span>
      </div>
      <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: '0%' }}
          animate={{ width: `${value}%` }}
          transition={{ delay: delay + 0.3, duration: 1, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  );
}

export default function TeamLeadApplicantView({
  evaluation,
  applicantName = 'Applicant',
  projectName = 'Project',
  answers = null, // Optional: raw answers for toggle
}) {
  const [showAnswers, setShowAnswers] = useState(false);

  if (!evaluation) return null;

  const { totalCompatibilityScore, radarMetrics, summary } = evaluation;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600/30 to-teal-600/30 flex items-center justify-center">
          <Shield className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Compatibility Report</h2>
          <p className="text-xs text-slate-500">
            <span className="text-cyan-400">{applicantName}</span>
            {' → '}
            <span className="text-violet-400">{projectName}</span>
          </p>
        </div>
      </div>

      {/* ── Score + Radar — Side by Side ─────────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-6">
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Score Ring */}
          <div className="flex-shrink-0">
            <ScoreRing score={totalCompatibilityScore} />
          </div>

          {/* Radar Metrics */}
          <div className="flex-1 w-full space-y-4">
            <MetricBar
              label="Technical Fit"
              value={radarMetrics.techFit}
              icon={Code2}
              color="#06b6d4"
              delay={0.1}
            />
            <MetricBar
              label="Culture Fit"
              value={radarMetrics.cultureFit}
              icon={Users}
              color="#8b5cf6"
              delay={0.2}
            />
            <MetricBar
              label="Speed-to-Productivity"
              value={radarMetrics.speed}
              icon={Zap}
              color="#f59e0b"
              delay={0.3}
            />
          </div>
        </div>
      </div>

      {/* ── AI Insight Block ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="rounded-2xl border border-violet-500/10 bg-gradient-to-br from-violet-500/[0.04] to-cyan-500/[0.04] p-5"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h4 className="text-xs font-medium text-violet-400 tracking-wider uppercase mb-2">
              AI Insight
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed">{summary}</p>
          </div>
        </div>
      </motion.div>

      {/* ── Trending Indicator ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex items-center justify-center gap-2 text-xs text-slate-500"
      >
        <TrendingUp className="w-3.5 h-3.5" />
        <span>
          Evaluated against {projectName}'s current requirements and team dynamics
        </span>
      </motion.div>

      {/* ── Full Answers Toggle ─────────────────────────────────────────── */}
      {answers && answers.length > 0 && (
        <div className="rounded-2xl border border-white/[0.04] overflow-hidden">
          <button
            onClick={() => setShowAnswers((p) => !p)}
            className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              {showAnswers ? (
                <EyeOff className="w-4 h-4 text-slate-500" />
              ) : (
                <Eye className="w-4 h-4 text-slate-500" />
              )}
              <span className="text-sm text-slate-400">
                {showAnswers ? 'Hide' : 'View'} full answers
              </span>
            </div>
            {showAnswers ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>

          <AnimatePresence>
            {showAnswers && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 space-y-4 border-t border-white/[0.04] pt-4">
                  {answers.map((a, i) => (
                    <div key={i} className="space-y-1.5">
                      <p className="text-xs text-slate-500 font-medium">
                        Q{a.questionId}: {a.questionText || `Question ${a.questionId}`}
                      </p>
                      <p className="text-sm text-slate-300 bg-black/20 rounded-lg px-3 py-2 leading-relaxed">
                        {a.answerText || '(No answer provided)'}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
