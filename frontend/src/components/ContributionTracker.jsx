import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import API_URL from '../api';

/**
 * ContributionTracker — the proof-of-work sheet.
 *
 * The backend parses each commit into a syntax tree and scores it on the
 * structure it adds (class 20 · function 10 · branch 5, low-density diffs
 * penalised). So the read-out is drawn as measurement, not as progress:
 * a ruled scale with ticks, shares read off the end in mono, and the same
 * parse-tree vocabulary the Landing sheet uses for the weights legend.
 *
 * Signal appears once, on the scan — the only control here that commits
 * work rather than reporting it.
 */

const EASE = [0.16, 1, 0.3, 1];

const WEIGHTS = [
  { kind: 'class', pts: 20, tone: 'text-blueprint' },
  { kind: 'function', pts: 10, tone: 'text-ink' },
  { kind: 'branch', pts: 5, tone: 'text-graphite' },
];

const TICKS = [0, 25, 50, 75, 100];

function Label({ children, className = '' }) {
    return <span className={`fm-label text-graphite ${className}`}>{children}</span>;
}

/** A quantity measured against a ruled scale, not a progress bar. */
function Measure({ percentage, lead, delay = 0 }) {
    return (
        <div className="relative h-3 border border-ink/20 bg-paper">
            {TICKS.slice(1, -1).map((t) => (
                <span
                    key={t}
                    className="absolute inset-y-0 w-px bg-ink/15"
                    style={{ left: `${t}%` }}
                    aria-hidden="true"
                />
            ))}
            <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: Math.min(percentage, 100) / 100 }}
                transition={{ duration: 0.9, delay, ease: EASE }}
                className={`absolute inset-y-0 left-0 w-full origin-left ${lead ? 'bg-blueprint' : 'bg-ink'}`}
            />
        </div>
    );
}

export default function ContributionTracker({ projectId, isOwner }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState(null);
    const [showCommitLog, setShowCommitLog] = useState(false);

    const fetchContributions = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/api/vetting/contributions/${projectId}`);
            const json = await res.json();
            if (json.success && json.has_data) {
                setData(json);
            } else {
                setData(null);
            }
        } catch (err) {
            console.error("Failed to fetch contributions", err);
        } finally {
            setLoading(false);
        }
    };

    const triggerScan = async () => {
        setScanning(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/api/vetting/scan/${projectId}`, {
                method: 'POST',
            });
            const json = await res.json();
            if (json.success) {
                // Re-fetch the cached data
                await fetchContributions();
            } else {
                setError(json.detail || 'Scan failed');
            }
        } catch {
            setError('Failed to connect. Make sure the project has a GitHub URL linked.');
        } finally {
            setScanning(false);
        }
    };

    useEffect(() => {
        fetchContributions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    // Sort contributors by score descending
    const contributors = data?.contributors
        ? Object.entries(data.contributors)
            .sort((a, b) => b[1].total_score - a[1].total_score)
        : [];

    const grandTotal = data?.grand_total || 0;

    return (
        <section className="border border-ink/20 bg-paper-raised">
            {/* Caption bar */}
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-ink/15 px-3 py-2">
                <Label className="!text-ink">Proof of work — parsed contribution</Label>
                <div className="flex items-center gap-3">
                    {data && (
                        <button
                            onClick={fetchContributions}
                            disabled={loading}
                            className="fm-label text-graphite transition-colors hover:text-blueprint disabled:opacity-50"
                        >
                            {loading ? 'Refreshing' : 'Refresh'}
                        </button>
                    )}
                    {isOwner && (
                        <button
                            onClick={triggerScan}
                            disabled={scanning}
                            className="group relative overflow-hidden bg-signal px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-paper disabled:opacity-70"
                        >
                            <span className="absolute inset-0 origin-left scale-x-0 bg-ink transition-transform duration-300 ease-out group-hover:scale-x-100" />
                            <span className="relative">
                                {scanning ? 'Scanning' : data ? 'Re-scan repo' : 'Scan repo'}
                            </span>
                        </button>
                    )}
                </div>
            </div>

            <div className="p-4 sm:p-5">
                {/* Weights legend — the same vocabulary as the Landing parse figure */}
                <dl className="mb-5 flex flex-wrap items-baseline gap-x-5 gap-y-1 border-b border-rule pb-3">
                    <dt><Label className="!text-[10px]">Weights</Label></dt>
                    {WEIGHTS.map((w) => (
                        <dd key={w.kind} className={`font-mono text-[12px] ${w.tone}`}>
                            {w.kind} <span className="text-graphite">+{w.pts}</span>
                        </dd>
                    ))}
                    <dd className="font-mono text-[12px] text-graphite">low density — penalised</dd>
                </dl>

                {error && (
                    <div className="mb-5 border border-ink/25 bg-paper p-3">
                        <Label className="!text-[10px] !text-ink">
                            {data ? 'Re-scan skipped' : 'Scan failed'}
                        </Label>
                        <p className="mt-1 font-mono text-[12px] leading-relaxed text-graphite">
                            {data ? `${error}. Showing the cached reading.` : error}
                        </p>
                    </div>
                )}

                {!data && !loading && !scanning && (
                    <div className="border border-dashed border-ink/30 px-6 py-14 text-center">
                        <p className="fm-condensed text-2xl font-black uppercase text-ink">Nothing measured yet</p>
                        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-graphite">
                            {isOwner
                                ? 'Link a GitHub repo, then scan it to parse every commit and score the structure it adds.'
                                : 'The project lead can scan the repository to parse and score contributions.'}
                        </p>
                    </div>
                )}

                {(loading || scanning) && !data && (
                    <div className="flex flex-col items-center justify-center gap-3 py-14">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink/15 border-t-blueprint" />
                        <Label>
                            {scanning ? 'Parsing commits · AST engine' : 'Loading reading'}
                        </Label>
                        {scanning && (
                            <span className="fm-caret inline-block h-3 w-1.5 bg-ink/60" aria-hidden="true" />
                        )}
                    </div>
                )}

                {data && (
                    <AnimatePresence mode="wait">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: EASE }}
                        >
                            {/* Scan record */}
                            <dl className="grid border-t border-ink/20 sm:grid-cols-3">
                                {[
                                    ['Commits read', data.commits_total
                                        ? `${data.commits_analyzed || 0} / ${data.commits_total}`
                                        : String(data.commits_analyzed || 0)],
                                    ['Total score', grandTotal.toLocaleString()],
                                    ['Repository', data.repo || '—'],
                                ].map(([term, value]) => (
                                    <div key={term} className="border-b border-rule py-2.5 sm:border-r sm:pr-3 sm:last:border-r-0">
                                        <dt><Label className="!text-[10px]">{term}</Label></dt>
                                        <dd className="mt-1 truncate font-mono text-[13px] text-ink">{value}</dd>
                                    </div>
                                ))}
                            </dl>

                            {data.truncated && (
                                <p className="mt-2 font-mono text-[11px] leading-relaxed text-graphite">
                                    Reading covers the {data.commits_analyzed} most recently analysed commits
                                    (deep-scan cap {data.deep_scan_limit}), not the repo&apos;s full{' '}
                                    {data.commits_total}-commit history.
                                </p>
                            )}

                            {/* Fig. 1 — share of measured structure */}
                            <figure className="mt-6 border border-ink/25 bg-paper-raised">
                                <figcaption className="flex items-baseline justify-between gap-3 border-b border-ink/20 px-3 py-2">
                                    <Label className="!text-ink">Fig. 1 — Share of measured structure</Label>
                                    <Label className="whitespace-nowrap !text-[10px]">
                                        {contributors.length} {contributors.length === 1 ? 'author' : 'authors'}
                                    </Label>
                                </figcaption>

                                <div className="fm-grid p-3">
                                    {/* Scale */}
                                    <div className="mb-3 flex justify-between" aria-hidden="true">
                                        {TICKS.map((t) => (
                                            <Label key={t} className="!text-[9px] !tracking-normal">{t}</Label>
                                        ))}
                                    </div>

                                    <ul className="space-y-4">
                                        {contributors.map(([username, info], idx) => {
                                            const pct = grandTotal > 0
                                                ? ((info.total_score / grandTotal) * 100).toFixed(1)
                                                : 0;
                                            const isStripped = parseFloat(pct) < 5;

                                            return (
                                                <motion.li
                                                    key={username}
                                                    initial={{ opacity: 0, x: -12 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: Math.min(idx * 0.08, 0.4), duration: 0.4, ease: EASE }}
                                                >
                                                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                                                        <div className="flex min-w-0 items-baseline gap-2">
                                                            <span className="font-mono text-[11px] text-graphite">
                                                                {String(idx + 1).padStart(2, '0')}
                                                            </span>
                                                            <span className="fm-condensed truncate text-[15px] font-bold uppercase leading-none tracking-tight text-ink">
                                                                {username}
                                                            </span>
                                                            {grandTotal > 0 && (
                                                                <Label className="shrink-0 !text-[9px]">
                                                                    {isStripped ? 'low density' : 'verified'}
                                                                </Label>
                                                            )}
                                                        </div>
                                                        <span className="fm-condensed shrink-0 text-lg font-black leading-none tabular-nums text-ink">
                                                            {pct}<span className="text-ink/30">%</span>
                                                        </span>
                                                    </div>

                                                    <Measure
                                                        percentage={parseFloat(pct)}
                                                        lead={idx === 0}
                                                        delay={Math.min(idx * 0.08, 0.4)}
                                                    />

                                                    <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 font-mono text-[11px] text-graphite">
                                                        <span>{info.commits} commit{info.commits !== 1 ? 's' : ''}</span>
                                                        <span>+{(info.additions || 0).toLocaleString()}</span>
                                                        <span>−{(info.deletions || 0).toLocaleString()}</span>
                                                        <span className="ml-auto">score {info.total_score.toLocaleString()}</span>
                                                    </div>
                                                </motion.li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            </figure>

                            {/* Commit manifest */}
                            {data.commit_log && data.commit_log.length > 0 && (
                                <div className="mt-6">
                                    <button
                                        onClick={() => setShowCommitLog(!showCommitLog)}
                                        className="flex w-full items-baseline justify-between gap-3 border-y border-ink/20 py-2.5 transition-colors hover:text-blueprint"
                                    >
                                        <Label className="!text-ink">
                                            Manifest — commits read ({data.commit_log.length})
                                        </Label>
                                        <motion.span
                                            animate={{ rotate: showCommitLog ? 180 : 0 }}
                                            className="text-graphite"
                                        >
                                            <ChevronDown size={14} />
                                        </motion.span>
                                    </button>

                                    <AnimatePresence>
                                        {showCommitLog && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3, ease: EASE }}
                                                className="overflow-hidden"
                                            >
                                                <ul className="max-h-[300px] overflow-y-auto">
                                                    {data.commit_log.map((commit, idx) => (
                                                        <li
                                                            key={commit.sha + idx}
                                                            className="flex items-baseline gap-3 border-b border-rule py-2"
                                                        >
                                                            <code className="shrink-0 font-mono text-[11px] text-blueprint">
                                                                {commit.sha}
                                                            </code>
                                                            <span className="flex-1 truncate text-[13px] text-ink">
                                                                {commit.message}
                                                            </span>
                                                            <span className="shrink-0 font-mono text-[11px] text-graphite">
                                                                {commit.author}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                )}
            </div>
        </section>
    );
}
