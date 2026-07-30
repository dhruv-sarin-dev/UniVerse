import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ApplicantCompatibilityExam from '../components/ApplicantCompatibilityExam';
import TeamLeadApplicantView from '../components/TeamLeadApplicantView';

/**
 * CompatibilityExam page — orchestrates the full exam flow.
 *
 * Drawn as an examination paper: a cover sheet declaring what is being
 * examined and against what, then the paper itself, then the marked result.
 * The three stages are a marked-off list along the top rather than a row of
 * pills, so at a glance you can see how much of the paper is done.
 *
 * Query params or props can supply projectContext; otherwise, a demo mode
 * allows the user to fill in context manually.
 */

const EASE = [0.16, 1, 0.3, 1];

const FIELD =
  'w-full border border-ink/25 bg-paper px-3 py-2.5 font-mono text-[13px] text-ink placeholder:text-graphite focus:border-blueprint focus:outline-none';

const STAGES = [
  { key: 'setup', no: '01', label: 'Set paper' },
  { key: 'exam', no: '02', label: 'Sit paper' },
  { key: 'results', no: '03', label: 'Marked' },
];

function Label({ children, className = '' }) {
  return <span className={`fm-label text-graphite ${className}`}>{children}</span>;
}

function Panel({ caption, meta, children, delay = 0 }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45, delay, ease: EASE }}
      className="border border-ink/20 bg-paper-raised"
    >
      <div className="flex items-baseline justify-between gap-3 border-b border-ink/20 px-4 py-2">
        <Label className="!text-ink">{caption}</Label>
        {meta && <Label className="whitespace-nowrap !text-[10px]">{meta}</Label>}
      </div>
      <div className="space-y-4 p-4 sm:p-5">{children}</div>
    </motion.section>
  );
}

/** The three stages as a marked-off list: done stages carry a filled mark. */
function StageList({ mode }) {
  const activeIndex = STAGES.findIndex((s) => s.key === mode);

  return (
    <ol className="mt-8 grid grid-cols-3 border-y border-rule">
      {STAGES.map((stage, i) => {
        const isActive = i === activeIndex;
        const isDone = i < activeIndex;
        return (
          <li
            key={stage.key}
            className={`flex items-center gap-2.5 px-3 py-2.5 ${
              i > 0 ? 'border-l border-rule' : ''
            }`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
                isDone
                  ? 'border-ink bg-ink'
                  : isActive
                  ? 'border-blueprint'
                  : 'border-rule'
              }`}
              aria-hidden="true"
            >
              {isDone && (
                <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 stroke-paper" fill="none" strokeWidth="1.6">
                  <path d="M1.5 5.2 L4 7.6 L8.5 2.4" />
                </svg>
              )}
              {isActive && <span className="h-1.5 w-1.5 bg-blueprint" />}
            </span>
            <Label className={`!text-[10px] ${isActive ? '!text-ink' : ''}`}>
              {stage.no} {stage.label}
            </Label>
          </li>
        );
      })}
    </ol>
  );
}

export default function CompatibilityExam() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('setup'); // setup | exam | results
  const [evaluation, setEvaluation] = useState(null);
  const [submittedAnswers, setSubmittedAnswers] = useState(null);

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
    <div className="mx-auto max-w-3xl px-4 pt-24 pb-20 sm:px-6 sm:pt-28">
      {/* Running head */}
      <div className="flex items-baseline justify-between border-b border-ink pb-2">
        <Label className="!text-ink">§ Examination — compatibility</Label>
        <Label>3 items · no time limit</Label>
      </div>

      <motion.button
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        onClick={() => navigate(-1)}
        className="fm-label mt-4 flex items-center gap-1.5 text-graphite transition-colors hover:text-blueprint"
      >
        <ArrowLeft size={12} />
        Back
      </motion.button>

      {/* Cover */}
      <div className="pt-6">
        <h1 className="fm-condensed text-5xl font-black uppercase leading-[0.9] tracking-tight text-ink sm:text-6xl">
          Compatibility
          <br />
          <span className="text-blueprint">examination</span>
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-graphite">
          The gap between what a project needs and what an applicant has is read,
          then three questions are written for that exact pair. The lead gets a
          score instead of a cover letter.
        </p>
      </div>

      <StageList mode={mode} />

      {/* ── Content Phases ───────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {/* SETUP PHASE */}
        {mode === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="mt-8 space-y-5"
          >
            <Panel caption="Sheet A — Project examined">
              <div>
                <label htmlFor="ce-name" className="fm-label mb-1.5 block text-graphite">
                  Project name <span className="text-signal">*</span>
                </label>
                <input
                  id="ce-name"
                  type="text"
                  value={projectForm.name}
                  onChange={(e) =>
                    setProjectForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. Uni-Verse Platform"
                  className={FIELD}
                />
              </div>

              <div>
                <label htmlFor="ce-stack" className="fm-label mb-1.5 block text-graphite">
                  Tech stack <span className="text-signal">*</span>{' '}
                  <span className="normal-case tracking-normal">(comma separated)</span>
                </label>
                <input
                  id="ce-stack"
                  type="text"
                  value={projectForm.techStack}
                  onChange={(e) =>
                    setProjectForm((p) => ({ ...p, techStack: e.target.value }))
                  }
                  placeholder="React, FastAPI, Firebase, WebRTC"
                  className={FIELD}
                />
              </div>

              <div>
                <label htmlFor="ce-phase" className="fm-label mb-1.5 block text-graphite">
                  Current phase
                </label>
                <select
                  id="ce-phase"
                  value={projectForm.currentPhase}
                  onChange={(e) =>
                    setProjectForm((p) => ({ ...p, currentPhase: e.target.value }))
                  }
                  className={`${FIELD} cursor-pointer`}
                >
                  {phases.map((ph) => (
                    <option key={ph.value} value={ph.value}>
                      {ph.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="ce-challenges" className="fm-label mb-1.5 block text-graphite">
                  Recent challenges
                </label>
                <textarea
                  id="ce-challenges"
                  value={projectForm.recentChallenges}
                  onChange={(e) =>
                    setProjectForm((p) => ({
                      ...p,
                      recentChallenges: e.target.value,
                    }))
                  }
                  placeholder="e.g. WebSocket disconnections, slow API response times…"
                  rows={3}
                  className={`${FIELD} resize-none`}
                />
              </div>
            </Panel>

            <Panel caption="Sheet B — Candidate on file" meta="auto-filled" delay={0.05}>
              <dl className="border-t border-rule">
                <div className="flex flex-col gap-1 border-b border-rule py-2.5 sm:flex-row sm:items-baseline sm:gap-6">
                  <dt className="w-24 shrink-0"><Label>Name</Label></dt>
                  <dd className="font-mono text-[13px] text-ink">{applicantContext.name}</dd>
                </div>
                <div className="flex flex-col gap-1.5 border-b border-rule py-2.5 sm:flex-row sm:items-baseline sm:gap-6">
                  <dt className="w-24 shrink-0"><Label>Declared</Label></dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {applicantContext.knownSkills.map((skill) => (
                      <span
                        key={skill}
                        className="border border-ink/20 px-2 py-0.5 font-mono text-[11px] text-ink"
                      >
                        {skill}
                      </span>
                    ))}
                  </dd>
                </div>
                <div className="flex flex-col gap-1 border-b border-rule py-2.5 sm:flex-row sm:items-baseline sm:gap-6">
                  <dt className="w-24 shrink-0"><Label>Statement</Label></dt>
                  <dd className="flex-1 text-[13px] leading-relaxed text-graphite">
                    {applicantContext.bio || 'No bio set'}
                  </dd>
                </div>
              </dl>
            </Panel>

            <div className="flex flex-col items-stretch justify-between gap-4 border-t border-ink pt-5 sm:flex-row sm:items-center">
              <Label className="!text-[10px]">
                {canStart ? 'Ready to set' : 'Both starred fields required'}
              </Label>
              <button
                onClick={handleStartExam}
                disabled={!canStart}
                className="group relative overflow-hidden bg-ink px-7 py-3 text-[11px] font-semibold uppercase tracking-wider text-paper disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="absolute inset-0 origin-left scale-x-0 bg-blueprint transition-transform duration-300 ease-out group-hover:scale-x-100" />
                <span className="relative">Set the paper</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* EXAM PHASE */}
        {mode === 'exam' && (
          <motion.div
            key="exam"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="mt-8"
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
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="mt-8"
          >
            <TeamLeadApplicantView
              evaluation={evaluation}
              applicantName={applicantContext.name}
              projectName={projectContext.name}
              answers={submittedAnswers}
            />

            {/* Restart */}
            <div className="mt-8 flex justify-end border-t border-ink pt-5">
              <button
                onClick={() => {
                  setMode('setup');
                  setEvaluation(null);
                  setSubmittedAnswers(null);
                }}
                className="group relative overflow-hidden border border-ink px-6 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink transition-colors hover:text-paper"
              >
                <span className="absolute inset-0 origin-left scale-x-0 bg-ink transition-transform duration-300 ease-out group-hover:scale-x-100" />
                <span className="relative">Set another paper</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
