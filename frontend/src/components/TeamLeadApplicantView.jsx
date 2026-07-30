import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * The marked paper — a score sheet.
 *
 * The gauge and the bars are readouts on an instrument rather than dashboard
 * chrome: a hairline track, a single measured arc, ticks you can read a value
 * against. Only a failing score is drawn in signal, because that is the one
 * result the lead has to act on.
 */

const EASE = [0.16, 1, 0.3, 1];

/** Bands are read off the same scale the backend scores against. */
const BANDS = [
  { min: 75, stroke: 'var(--color-blueprint)', text: '!text-blueprint', label: 'Strong fit' },
  { min: 50, stroke: 'var(--color-ink)', text: '!text-ink', label: 'Moderate fit' },
  { min: 30, stroke: 'var(--color-graphite)', text: '!text-graphite', label: 'Weak fit' },
  { min: -Infinity, stroke: 'var(--color-signal)', text: '!text-signal', label: 'Low fit' },
];

function Label({ children, className = '' }) {
  return <span className={`fm-label text-graphite ${className}`}>{children}</span>;
}

/** Counts up to a value once. */
function CountUp({ to, delay = 0, className = '' }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const unsub = rounded.on('change', setDisplay);
    const controls = animate(count, to, { duration: 1.4, delay, ease: 'easeOut' });
    return () => { controls.stop(); unsub(); };
  }, [count, rounded, to, delay]);

  return <span className={className}>{display}</span>;
}

/**
 * Circular progress ring SVG component.
 * Renders a score as a large animated gauge.
 */
function ScoreRing({ score, size = 168, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(circumference - (score / 100) * circumference);
    }, 300);
    return () => clearTimeout(timer);
  }, [score, circumference]);

  const band = BANDS.find((b) => score >= b.min);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-ink)"
          strokeOpacity="0.12"
          strokeWidth={strokeWidth}
        />
        {/* Quarter ticks, so the arc can be read as a measurement */}
        {[0, 25, 50, 75].map((t) => {
          const angle = (t / 100) * 2 * Math.PI;
          const inner = radius - strokeWidth / 2 - 4;
          const outer = radius + strokeWidth / 2 + 4;
          return (
            <line
              key={t}
              x1={size / 2 + Math.cos(angle) * inner}
              y1={size / 2 + Math.sin(angle) * inner}
              x2={size / 2 + Math.cos(angle) * outer}
              y2={size / 2 + Math.sin(angle) * outer}
              stroke="var(--color-ink)"
              strokeOpacity="0.25"
              strokeWidth="1"
            />
          );
        })}
        {/* Measured arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={band.stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="fm-condensed text-5xl font-black leading-none tabular-nums text-ink">
          <CountUp to={score} delay={0.3} />
        </span>
        <span className="mt-2">
          <Label className={`!text-[10px] ${band.text}`}>{band.label}</Label>
        </span>
      </div>
    </div>
  );
}

/**
 * A single measured readout: value in mono, bar against a ticked track.
 */
function MetricBar({ label, value, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4, ease: EASE }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <Label>{label}</Label>
        <span className="font-mono text-[13px] tabular-nums text-ink">{value}%</span>
      </div>
      <div className="relative mt-1.5 h-2 border-b border-ink/20">
        <div className="absolute inset-x-0 bottom-0 h-1.5 bg-ink/[0.06]" />
        {[25, 50, 75].map((t) => (
          <span
            key={t}
            className="absolute bottom-0 h-1.5 w-px bg-ink/20"
            style={{ left: `${t}%` }}
            aria-hidden="true"
          />
        ))}
        <motion.div
          className="absolute bottom-0 left-0 h-1.5 origin-left bg-ink"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: value / 100 }}
          style={{ width: '100%' }}
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="space-y-5"
    >
      {/* ── Running head ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 border-b border-ink pb-2 sm:flex-row sm:items-baseline sm:justify-between">
        <Label className="!text-ink">Marked — compatibility report</Label>
        <Label className="!text-[10px]">
          {applicantName} → {projectName}
        </Label>
      </div>

      {/* ── Score + measured metrics ─────────────────────────────────────── */}
      <section className="border border-ink/20 bg-paper-raised">
        <div className="flex items-baseline justify-between gap-3 border-b border-ink/20 px-4 py-2">
          <Label className="!text-ink">Result — total compatibility</Label>
          <Label className="!text-[10px]">scale 0–100</Label>
        </div>
        <div className="fm-grid flex flex-col items-center gap-8 p-5 sm:p-6 md:flex-row">
          <div className="shrink-0">
            <ScoreRing score={totalCompatibilityScore} />
          </div>

          <div className="w-full flex-1 space-y-4">
            <MetricBar label="Technical fit" value={radarMetrics.techFit} delay={0.1} />
            <MetricBar label="Culture fit" value={radarMetrics.cultureFit} delay={0.2} />
            <MetricBar label="Speed to productivity" value={radarMetrics.speed} delay={0.3} />
          </div>
        </div>
      </section>

      {/* ── Assessor's note ─────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4, ease: EASE }}
        className="border border-ink/20 bg-paper-raised"
      >
        <div className="border-b border-ink/20 px-4 py-2">
          <Label className="!text-ink">Assessor&apos;s note</Label>
        </div>
        <p className="p-4 text-[15px] leading-relaxed text-ink sm:p-5">{summary}</p>
      </motion.section>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        className="text-center"
      >
        <Label className="!text-[10px]">
          Marked against {projectName}&apos;s current requirements and team dynamics
        </Label>
      </motion.p>

      {/* ── Full Answers Toggle ─────────────────────────────────────────── */}
      {answers && answers.length > 0 && (
        <section className="border border-ink/20 bg-paper-raised">
          <button
            onClick={() => setShowAnswers((p) => !p)}
            className="flex w-full items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-paper-deep"
          >
            <span className="flex items-center gap-2">
              {showAnswers ? (
                <EyeOff size={13} className="text-graphite" />
              ) : (
                <Eye size={13} className="text-graphite" />
              )}
              <Label className="!text-ink">
                {showAnswers ? 'Hide' : 'View'} scripts as written
              </Label>
            </span>
            {showAnswers ? (
              <ChevronUp size={14} className="text-graphite" />
            ) : (
              <ChevronDown size={14} className="text-graphite" />
            )}
          </button>

          <AnimatePresence>
            {showAnswers && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="overflow-hidden"
              >
                <div className="border-t border-ink/20 px-4 py-4 sm:px-5">
                  <ol className="border-t border-rule">
                    {answers.map((a, i) => (
                      <li key={i} className="border-b border-rule py-3">
                        <div className="flex items-baseline gap-3">
                          <Label className="w-7 shrink-0 !text-[10px]">
                            {String(i + 1).padStart(2, '0')}
                          </Label>
                          <p className="flex-1 text-[13px] leading-relaxed text-graphite">
                            {a.questionText || `Question ${a.questionId}`}
                          </p>
                        </div>
                        <p className="mt-2 ml-10 border-l border-ink/20 pl-3 font-mono text-[13px] leading-relaxed text-ink">
                          {a.answerText || '(No answer provided)'}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}
    </motion.div>
  );
}
