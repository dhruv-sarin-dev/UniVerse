import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Code2,
  GitBranch,
  Target,
  AlertCircle,
} from 'lucide-react';
import API_URL from '../api';

/**
 * The exam paper itself.
 *
 * Three numbered items, each with a category, each answered in a ruled box.
 * Progress is a marked-off list rather than a row of dots, so the thing you
 * read is "two of three done", not "two glowing circles". The only thing
 * drawn in signal is the count still outstanding — the one genuinely
 * unresolved value on the sheet.
 *
 * Generation, validation, submission and the evaluate payload are unchanged.
 */

const EASE = [0.16, 1, 0.3, 1];

const CATEGORY_CONFIG = {
  Technical: {
    icon: Code2,
    label: 'Technical gap analysis',
  },
  Workflow: {
    icon: GitBranch,
    label: 'Workflow alignment',
  },
  Priority: {
    icon: Target,
    label: 'Priority judgment',
  },
};

function Label({ children, className = '' }) {
  return <span className={`fm-label text-graphite ${className}`}>{children}</span>;
}

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
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="border border-ink/20 bg-paper-raised"
      >
        <div className="border-b border-ink/20 px-4 py-2">
          <Label className="!text-ink">Setting the paper</Label>
        </div>
        <div className="fm-grid flex min-h-[320px] flex-col items-center justify-center gap-5 p-8 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink/15 border-t-blueprint" />
          <h3 className="fm-condensed text-2xl font-black uppercase leading-[0.95] tracking-tight text-ink">
            Reading the gap
          </h3>
          <p className="max-w-md text-[15px] leading-relaxed text-graphite">
            Comparing <span className="font-mono text-[13px] text-blueprint">{projectContext?.name}</span>{' '}
            against the profile on file to write three questions for this exact pair.
          </p>
          <span className="fm-caret inline-block h-3 w-1.5 bg-ink/60" aria-hidden="true" />
        </div>
      </motion.div>
    );
  }

  // ── Submitting State ───────────────────────────────────────────────────
  if (phase === 'submitting') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="border border-ink/20 bg-paper-raised"
      >
        <div className="border-b border-ink/20 px-4 py-2">
          <Label className="!text-ink">Marking</Label>
        </div>
        <div className="fm-grid flex min-h-[320px] flex-col items-center justify-center gap-5 p-8 text-center">
          <h3 className="fm-condensed text-2xl font-black uppercase leading-[0.95] tracking-tight text-ink">
            Paper submitted
          </h3>
          <p className="max-w-sm text-[15px] leading-relaxed text-graphite">
            Your answers are being read against the project&apos;s requirements,
            workflow and priorities.
          </p>
          <div className="h-px w-64 bg-ink/15">
            <motion.div
              className="h-full origin-left bg-ink"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 8, ease: 'easeInOut' }}
            />
          </div>
          <Label className="!text-[10px]">Do not close this sheet</Label>
        </div>
      </motion.div>
    );
  }

  // ── Error State ────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="border border-signal/40 bg-signal/[0.05] px-6 py-16 text-center"
      >
        <AlertCircle size={32} className="mx-auto mb-4 text-signal" />
        <p className="fm-condensed text-2xl font-black uppercase text-ink">
          Paper could not be set
        </p>
        <p className="mx-auto mt-2 max-w-md font-mono text-[13px] leading-relaxed text-graphite">
          {error}
        </p>
        <button
          onClick={handleStartExam}
          className="mt-6 border border-ink px-6 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-paper"
        >
          Try again
        </button>
      </motion.div>
    );
  }

  // ── Done State ─────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="border border-ink/20 bg-paper-raised"
      >
        <div className="border-b border-ink/20 px-4 py-2">
          <Label className="!text-ink">Receipt</Label>
        </div>
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 p-8 text-center">
          <span className="border border-blueprint px-4 py-1.5">
            <Label className="!text-blueprint">Filed</Label>
          </span>
          <h3 className="fm-condensed mt-2 text-3xl font-black uppercase leading-[0.95] tracking-tight text-ink">
            Exam submitted
          </h3>
          <p className="max-w-sm text-[15px] leading-relaxed text-graphite">
            Your compatibility report has gone to the team lead.
          </p>
        </div>
      </motion.div>
    );
  }

  // ── Idle (shouldn't show, auto-starts) ─────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <button
          onClick={handleStartExam}
          className="group relative overflow-hidden bg-ink px-7 py-3 text-[11px] font-semibold uppercase tracking-wider text-paper"
        >
          <span className="absolute inset-0 origin-left scale-x-0 bg-blueprint transition-transform duration-300 ease-out group-hover:scale-x-100" />
          <span className="relative">Set the paper</span>
        </button>
      </div>
    );
  }

  // ── Exam Phase — The Main UI ───────────────────────────────────────────
  const currentQ = questions[activeQuestion];
  const catConfig = CATEGORY_CONFIG[currentQ?.category] || CATEGORY_CONFIG.Technical;
  const CatIcon = catConfig.icon;
  const answered = questions.filter((q) => answers[q.id]?.trim()).length;
  const outstanding = questions.length - answered;
  const currentText = answers[currentQ?.id] || '';

  return (
    <div className="space-y-5">
      {/* Paper head */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="flex items-baseline justify-between gap-3 border-b border-ink pb-2"
      >
        <Label className="!text-ink">
          Paper — {projectContext?.name || 'project'}
        </Label>
        <Label className="!text-[10px]">
          {answered} of {questions.length} answered
        </Label>
      </motion.div>

      {/* Marked-off item list */}
      <ol className="border-b border-rule">
        {questions.map((q, i) => {
          const isAnswered = !!answers[q.id]?.trim();
          const isCurrent = i === activeQuestion;
          return (
            <li key={q.id} className="border-t border-rule first:border-t-0">
              <button
                type="button"
                onClick={() => setActiveQuestion(i)}
                className="group flex w-full items-baseline gap-3 py-2 text-left"
              >
                <span
                  className={`flex h-3.5 w-3.5 shrink-0 translate-y-0.5 items-center justify-center border ${
                    isAnswered
                      ? 'border-ink bg-ink'
                      : isCurrent
                      ? 'border-blueprint'
                      : 'border-rule'
                  }`}
                  aria-hidden="true"
                >
                  {isAnswered && (
                    <svg viewBox="0 0 10 10" className="h-2 w-2 stroke-paper" fill="none" strokeWidth="1.8">
                      <path d="M1.5 5.2 L4 7.6 L8.5 2.4" />
                    </svg>
                  )}
                </span>
                <Label className={`w-7 shrink-0 !text-[10px] ${isCurrent ? '!text-ink' : ''}`}>
                  {String(i + 1).padStart(2, '0')}
                </Label>
                <span
                  className={`flex-1 truncate font-mono text-[12px] transition-colors ${
                    isCurrent ? 'text-ink' : 'text-graphite group-hover:text-ink'
                  }`}
                >
                  {q.questionText}
                </span>
                <Label className="shrink-0 !text-[10px]">{q.category}</Label>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Error banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="flex items-baseline gap-3 border border-signal/40 bg-signal/[0.05] px-4 py-3"
        >
          <Label className="!text-signal">Incomplete</Label>
          <span className="font-mono text-[13px] text-ink">{error}</span>
        </motion.div>
      )}

      {/* Question sheet */}
      <AnimatePresence mode="wait">
        <motion.section
          key={activeQuestion}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25, ease: EASE }}
          className="border border-ink/20 bg-paper-raised"
        >
          <div className="flex items-baseline justify-between gap-3 border-b border-ink/20 px-4 py-2">
            <span className="flex items-center gap-2">
              <CatIcon size={12} className="shrink-0 translate-y-px text-graphite" />
              <Label className="!text-ink">
                Item {String(activeQuestion + 1).padStart(2, '0')} — {catConfig.label}
              </Label>
            </span>
            <Label className="whitespace-nowrap !text-[10px]">
              {activeQuestion + 1} / {questions.length}
            </Label>
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            <p className="text-[15px] leading-relaxed text-ink">{currentQ?.questionText}</p>

            {/* Ruled answer box */}
            <div className="border border-ink/25 bg-paper focus-within:border-blueprint">
              <div className="flex items-baseline justify-between border-b border-ink/15 px-3 py-1.5">
                <Label className="!text-[10px]">Answer</Label>
                <Label className="!text-[10px]">{currentText.length} chars</Label>
              </div>
              <textarea
                value={currentText}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [currentQ.id]: e.target.value }))
                }
                placeholder="Write your answer here…"
                rows={6}
                className="w-full resize-none bg-transparent px-3 py-2.5 font-mono text-[13px] leading-relaxed text-ink placeholder:text-graphite focus:outline-none"
              />
            </div>
          </div>
        </motion.section>
      </AnimatePresence>

      {/* Navigation + Submit */}
      <div className="flex items-center justify-between gap-3 border-t border-ink pt-4">
        <button
          onClick={() => setActiveQuestion((p) => Math.max(0, p - 1))}
          disabled={activeQuestion === 0}
          className="border border-ink px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink"
        >
          Previous
        </button>

        <div className="flex items-center gap-4">
          {outstanding > 0 && (
            <Label className="hidden !text-[10px] !text-signal sm:inline">
              {outstanding} outstanding
            </Label>
          )}
          {activeQuestion < questions.length - 1 ? (
            <button
              onClick={() => setActiveQuestion((p) => Math.min(questions.length - 1, p + 1))}
              className="border border-ink px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-paper"
            >
              Next
            </button>
          ) : (
            <button
              onClick={() => { setError(null); handleSubmit(); }}
              disabled={!allAnswered}
              className="group relative flex items-center gap-2 overflow-hidden bg-ink px-6 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-paper disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="absolute inset-0 origin-left scale-x-0 bg-blueprint transition-transform duration-300 ease-out group-hover:scale-x-100" />
              <span className="relative">Hand in</span>
              <ArrowRight size={14} className="relative transition-transform group-hover:translate-x-1" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
