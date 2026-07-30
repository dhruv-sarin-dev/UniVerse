import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/**
 * Landing — "Field Manual".
 *
 * The product's own vocabulary is technical documentation: projects declare
 * required skills, applicants are vetted against a spec, commits are parsed
 * into syntax trees and scored. So the page is the manual for that process
 * rather than a generic product splash — drafting stock, a visible grid,
 * monospace annotation, figures that measure what they describe.
 *
 * Motion follows the same idea. Nothing floats or drifts; the page is
 * *drawn*. Rules extend from their origin, display type prints in behind a
 * mask, the parse tree types out, and the score counts up. One orchestrated
 * load sequence rather than effects scattered per element.
 *
 * Every scroll reveal uses whileInView with an explicit viewport, never a
 * bare observer hook — content must never be invisible because an observer
 * failed to fire. Reduced motion is honoured globally via .fm-scope.
 */

const SECTIONS = [
  {
    no: '01',
    title: 'Discovery',
    lede: 'Browse what is already being built.',
    body: 'Every open project lists the skills it still needs and who is already on board. Filter by field, or search the whole catalogue.',
    spec: [
      ['Listed', 'Title, brief, category'],
      ['Declared', 'Required skills, open seats'],
      ['Visible', 'Members, pending requests'],
    ],
  },
  {
    no: '02',
    title: 'Vetting',
    lede: 'Prove the fit before you join.',
    body: 'The gap between a project’s stack and your profile is read, then three questions are written for that exact pair. The lead sees a compatibility score instead of a cover letter.',
    spec: [
      ['Input', 'Stack, phase, open problems'],
      ['Output', '3 questions · technical, workflow, priority'],
      ['Scored', 'Tech fit, culture fit, ramp-up'],
    ],
  },
  {
    no: '03',
    title: 'War Room',
    lede: 'One room for the whole build.',
    body: 'Video, shared notes and the team’s repository in a single view. Talk a problem through and the minutes get written for you.',
    spec: [
      ['Live', 'Group video, screen share'],
      ['Shared', 'Notes sync as you type'],
      ['Linked', 'Commits, open pull requests'],
    ],
  },
  {
    no: '04',
    title: 'Proof of work',
    lede: 'Contribution you cannot fake.',
    body: 'Commits are parsed into a syntax tree and scored on the functions, classes and branches they actually add. Volume does not count. Structure does.',
    spec: [
      ['Parsed', 'tree-sitter, per commit diff'],
      ['Weighted', 'class 20 · function 10 · branch 5'],
      ['Filtered', 'Low-density diffs penalised'],
    ],
  },
];

const EASE = [0.16, 1, 0.3, 1];

const REVEAL = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.5, ease: EASE },
};

function Label({ children, className = '' }) {
  return <span className={`fm-label text-graphite ${className}`}>{children}</span>;
}

/** A rule that draws itself from its origin, like a plotter pass. */
function DrawRule({ delay = 0, className = '', inView = false }) {
  const anim = inView
    ? { whileInView: { scaleX: 1 }, viewport: { once: true, amount: 0.4 } }
    : { animate: { scaleX: 1 } };
  return (
    <motion.div
      initial={{ scaleX: 0 }}
      {...anim}
      transition={{ duration: 0.7, delay, ease: EASE }}
      className={`h-px origin-left bg-ink ${className}`}
      aria-hidden="true"
    />
  );
}

/** Display type printing in from behind a mask. */
function PrintLine({ children, delay = 0, className = '' }) {
  return (
    <span className="block overflow-hidden">
      <motion.span
        initial={{ y: '108%' }}
        animate={{ y: '0%' }}
        transition={{ duration: 0.75, delay, ease: EASE }}
        className={`block ${className}`}
      >
        {children}
      </motion.span>
    </span>
  );
}

/** Counts up to a value once, when scrolled into view. */
function CountUp({ to, delay = 0, className = '' }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const unsub = rounded.on('change', setDisplay);
    const controls = animate(count, to, { duration: 1.1, delay, ease: 'easeOut' });
    return () => { controls.stop(); unsub(); };
  }, [count, rounded, to, delay]);

  return <span className={className}>{display}</span>;
}

function DimensionLine({ label, delay = 0 }) {
  return (
    <div className="flex items-center gap-2" aria-hidden="true">
      <span className="h-2.5 w-px bg-ink/40" />
      <motion.span
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, delay, ease: EASE }}
        className="h-px flex-1 origin-right bg-ink/25"
      />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: delay + 0.5 }}
      >
        <Label className="whitespace-nowrap !text-[10px]">{label}</Label>
      </motion.span>
      <motion.span
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, delay, ease: EASE }}
        className="h-px flex-1 origin-left bg-ink/25"
      />
      <span className="h-2.5 w-px bg-ink/40" />
    </div>
  );
}

function Figure({ no, title, meta, children }) {
  return (
    <figure className="border border-ink/25 bg-paper-raised">
      <figcaption className="flex items-baseline justify-between gap-3 border-b border-ink/20 px-3 py-2">
        <Label className="!text-ink">Fig. {no} — {title}</Label>
        <Label className="whitespace-nowrap !text-[10px]">{meta}</Label>
      </figcaption>
      {children}
    </figure>
  );
}

/** Fig. 1 — a team drawn as a spec. The open seat is the only unresolved
 *  value on the sheet, so it is the only thing using signal, and the only
 *  thing still moving once the page settles. */
function TeamFigure() {
  const seats = [
    { role: 'Backend', detail: 'python · fastapi', filled: true },
    { role: 'Frontend', detail: 'react · css', filled: true },
    { role: 'Design', detail: 'figma · research', filled: true },
    { role: 'Open seat', detail: 'ml · data', filled: false },
  ];

  return (
    <Figure no="1" title="Team composition" meta="4 seats · 1 open">
      <div className="fm-grid p-3">
        <div className="grid grid-cols-4 gap-2">
          {seats.map((seat, i) => (
            <motion.div
              key={seat.role}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 + i * 0.09, duration: 0.4, ease: EASE }}
              className={`relative p-2 ${seat.filled ? 'border border-ink/20 bg-paper' : 'bg-signal/[0.07]'}`}
            >
              {!seat.filled && (
                <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
                  <rect
                    x="0.5" y="0.5" width="99%" height="99%"
                    fill="none" stroke="var(--color-signal)" strokeWidth="1"
                    strokeDasharray="6 4" className="fm-march"
                  />
                </svg>
              )}
              <div
                className={`mb-4 h-6 w-6 rounded-full border ${
                  seat.filled ? 'border-ink/30 bg-ink/10' : 'border-dashed border-signal'
                }`}
              />
              <p className={`fm-condensed text-[13px] font-bold leading-none ${seat.filled ? 'text-ink' : 'text-signal'}`}>
                {seat.role}
              </p>
              <p className="fm-label mt-1 !text-[9px] !tracking-normal text-graphite">{seat.detail}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-3">
          <DimensionLine label="one team · four disciplines" delay={1.0} />
        </div>
      </div>
    </Figure>
  );
}

/**
 * Fig. 2 — the parse tree, typed out line by line. This is the most
 * distinctive artifact the product owns: a commit turned into structure and
 * scored on it. Showing the real weights makes section 04's claim checkable.
 */
function ParseFigure() {
  const nodes = [
    { depth: 0, text: 'class Matcher:', kind: 'class', pts: 20 },
    { depth: 1, text: 'def score(self, a, b):', kind: 'function', pts: 10 },
    { depth: 2, text: 'if overlap(a, b):', kind: 'branch', pts: 5 },
    { depth: 3, text: 'return weight * 1.5', kind: null, pts: 0 },
  ];
  const kindColor = { class: 'text-blueprint', function: 'text-ink', branch: 'text-graphite' };
  const START = 0.95;
  const STEP = 0.16;

  return (
    <Figure no="2" title="Commit, parsed" meta="tree-sitter">
      <div className="p-3">
        <div className="space-y-1 font-mono text-[11px] leading-relaxed">
          {nodes.map((n, i) => (
            <motion.div
              key={n.text}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: START + i * STEP, duration: 0.01 }}
              className="flex items-baseline gap-2"
              style={{ paddingLeft: `${n.depth * 14}px` }}
            >
              <span className="select-none text-ink/30">{n.depth === 0 ? '▸' : '└'}</span>
              <motion.span
                initial={{ clipPath: 'inset(0 100% 0 0)' }}
                animate={{ clipPath: 'inset(0 0% 0 0)' }}
                transition={{ delay: START + i * STEP, duration: 0.3, ease: 'linear' }}
                className={`flex-1 truncate ${n.kind ? kindColor[n.kind] : 'text-graphite'}`}
              >
                {n.text}
              </motion.span>
              {n.pts > 0 && (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: START + i * STEP + 0.32, duration: 0.25 }}
                  className="fm-label shrink-0 !text-[9px] !tracking-wider text-signal"
                >
                  +{n.pts}
                </motion.span>
              )}
            </motion.div>
          ))}
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: START + nodes.length * STEP }}
            className="fm-caret inline-block h-3 w-1.5 translate-y-0.5 bg-ink/60"
            aria-hidden="true"
          />
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-ink/15 pt-2">
          <Label className="!text-[9px]">1 class · 1 function · 1 branch</Label>
          <span className="fm-condensed text-xl font-black leading-none text-ink">
            +<CountUp to={35} delay={START + nodes.length * STEP} />
          </span>
        </div>
      </div>
    </Figure>
  );
}

function SpecSection({ section, index }) {
  return (
    <section className="py-12 sm:py-16">
      <DrawRule inView className="mb-8 !bg-rule" />

      <motion.div {...REVEAL} className="mb-8 flex items-baseline justify-between">
        <Label className="!text-[10px]">§ {section.no} / {String(SECTIONS.length).padStart(2, '0')}</Label>
        <Label className="!text-[10px]">Uni-Verse — Field Manual</Label>
      </motion.div>

      <div className="grid gap-8 md:grid-cols-12">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="md:col-span-1"
        >
          <span className="fm-condensed block text-5xl font-black leading-none text-ink/15 sm:text-6xl">
            {section.no}
          </span>
        </motion.div>

        <motion.div {...REVEAL} transition={{ ...REVEAL.transition, delay: 0.05 }} className="md:col-span-5">
          <h2 className="fm-condensed text-3xl font-black uppercase leading-[0.92] tracking-tight text-ink sm:text-4xl">
            {section.title}
          </h2>
          <p className="mt-3 text-lg font-medium leading-snug text-ink sm:text-xl">{section.lede}</p>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-graphite">{section.body}</p>
        </motion.div>

        <div className="md:col-span-6">
          <dl className="border-t border-ink/20">
            {section.spec.map(([term, value], i) => (
              <motion.div
                key={term}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.45, delay: 0.1 + i * 0.08, ease: EASE }}
                className="flex flex-col gap-1 border-b border-rule py-3 sm:flex-row sm:items-baseline sm:gap-6"
              >
                <dt className="w-24 shrink-0"><Label>{term}</Label></dt>
                <dd className="font-mono text-[13px] leading-snug text-ink">{value}</dd>
              </motion.div>
            ))}
          </dl>
          <p className="mt-2 text-right">
            <Label className="!text-[10px]">Sheet {index + 1} of {SECTIONS.length}</Label>
          </p>
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="fm-scope fm-paper relative min-h-screen font-sans text-ink">
      <div className="fm-crop relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* ── Cover ─────────────────────────────────────────────────── */}
        <header className="pt-24 pb-10 sm:pt-32 sm:pb-14">
          <div className="flex items-baseline justify-between pb-2">
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <Label className="!text-ink">Uni-Verse — Field Manual</Label>
            </motion.span>
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.1 }}>
              <Label>Rev 02 · 2026</Label>
            </motion.span>
          </div>
          <DrawRule />

          <div className="grid gap-10 pt-8 md:grid-cols-12 md:gap-8">
            <div className="md:col-span-7">
              <h1 className="fm-condensed text-[14vw] font-black uppercase leading-[0.82] tracking-[-0.03em] text-ink sm:text-[9.5vw] lg:text-[104px]">
                <PrintLine delay={0.15}>Build the team</PrintLine>
                <PrintLine delay={0.26}>before you build</PrintLine>
                <PrintLine delay={0.37} className="text-blueprint">the project.</PrintLine>
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.62, duration: 0.5 }}
                className="mt-6 max-w-md text-lg leading-relaxed text-graphite"
              >
                Find students across every department, check they actually fit the
                work, then build somewhere that records who did what.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.72, duration: 0.5 }}
                className="mt-8 flex flex-col gap-3 sm:flex-row"
              >
                <button
                  onClick={() => navigate('/onboarding')}
                  className="group relative inline-flex items-center justify-center gap-2 overflow-hidden bg-ink px-7 py-4 text-sm font-semibold uppercase tracking-wider text-paper"
                >
                  <span className="absolute inset-0 origin-left scale-x-0 bg-blueprint transition-transform duration-300 ease-out group-hover:scale-x-100" />
                  <span className="relative">Start building</span>
                  <ArrowRight size={16} className="relative transition-transform group-hover:translate-x-1" />
                </button>
                <button
                  onClick={() => navigate('/discover')}
                  className="group relative inline-flex items-center justify-center overflow-hidden border border-ink px-7 py-4 text-sm font-semibold uppercase tracking-wider text-ink transition-colors hover:text-paper"
                >
                  <span className="absolute inset-0 origin-bottom scale-y-0 bg-ink transition-transform duration-300 ease-out group-hover:scale-y-100" />
                  <span className="relative">Browse projects</span>
                </button>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.55, ease: EASE }}
              className="flex flex-col gap-4 md:col-span-5"
            >
              <TeamFigure />
              <ParseFigure />
            </motion.div>
          </div>
        </header>

        {/* ── Contents ──────────────────────────────────────────────── */}
        <nav aria-label="Contents" className="pt-4 pb-2">
          <DrawRule inView />
          <div className="mt-4">
            <Label className="!text-[10px]">Contents</Label>
          </div>
          <ul className="mt-3">
            {SECTIONS.map((s, i) => (
              <motion.li
                key={s.no}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.4, delay: i * 0.07, ease: EASE }}
                className="border-b border-rule last:border-b-0"
              >
                <a
                  href={`#section-${s.no}`}
                  className="group flex items-baseline gap-4 py-2.5 transition-colors hover:text-blueprint"
                >
                  <Label className="w-8 shrink-0 transition-colors group-hover:!text-blueprint">{s.no}</Label>
                  <span className="fm-condensed text-lg font-bold uppercase tracking-tight transition-transform duration-300 group-hover:translate-x-1">
                    {s.title}
                  </span>
                  <span className="relative mx-2 h-px flex-1 self-center bg-rule" aria-hidden="true">
                    <span className="absolute inset-0 origin-left scale-x-0 bg-blueprint transition-transform duration-500 ease-out group-hover:scale-x-100" />
                  </span>
                  <Label className="shrink-0 !text-[10px] transition-colors group-hover:!text-blueprint">
                    Sheet {i + 1}
                  </Label>
                </a>
              </motion.li>
            ))}
          </ul>
        </nav>

        {/* ── Sections ──────────────────────────────────────────────── */}
        <main>
          {SECTIONS.map((section, i) => (
            <div key={section.no} id={`section-${section.no}`} className="scroll-mt-24">
              <SpecSection section={section} index={i} />
            </div>
          ))}
        </main>

        {/* ── Closing ───────────────────────────────────────────────── */}
        <section className="py-16 sm:py-20">
          <DrawRule inView />
          <div className="grid gap-8 pt-12 md:grid-cols-12">
            <div className="md:col-span-8">
              <h2 className="fm-condensed text-4xl font-black uppercase leading-[0.9] text-ink sm:text-6xl">
                <PrintLine delay={0}>Your project needs</PrintLine>
                <PrintLine delay={0.1} className="text-blueprint">three more people.</PrintLine>
              </h2>
              <motion.p {...REVEAL} className="mt-4 max-w-md text-[15px] leading-relaxed text-graphite">
                Post what you are building and what it still needs. Applicants
                arrive with a compatibility score already attached.
              </motion.p>
            </div>
            <motion.div {...REVEAL} className="flex items-end md:col-span-4">
              <button
                onClick={() => navigate('/onboarding')}
                className="group relative inline-flex w-full items-center justify-between gap-2 overflow-hidden bg-signal px-6 py-5 text-sm font-semibold uppercase tracking-wider text-paper"
              >
                <span className="absolute inset-0 origin-left scale-x-0 bg-ink transition-transform duration-300 ease-out group-hover:scale-x-100" />
                <span className="relative">Create your profile</span>
                <ArrowRight size={16} className="relative transition-transform group-hover:translate-x-1" />
              </button>
            </motion.div>
          </div>
        </section>

        {/* ── Colophon ──────────────────────────────────────────────── */}
        <footer className="flex flex-col gap-2 border-t border-rule py-8 sm:flex-row sm:items-center sm:justify-between">
          <Label>Uni-Verse · Built for university teams</Label>
          <Label className="!text-[10px]">© 2026 · Rev 02</Label>
        </footer>
      </div>
    </div>
  );
}
