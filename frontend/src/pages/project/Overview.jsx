import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import API_URL from '../../api';

/**
 * Overview — the brief and the stack it declares.
 *
 * The compatibility read-out is a measurement, so it is drawn as a numbered
 * figure: the radar keeps recharts but wears the token palette, and the score
 * is set in display type with its reasoning as the figure's footnote.
 */

const EASE = [0.16, 1, 0.3, 1];

function Label({ children, className = '' }) {
  return <span className={`fm-label text-graphite ${className}`}>{children}</span>;
}

function Panel({ caption, meta, children, className = '' }) {
  return (
    <section className={`border border-ink/20 bg-paper-raised ${className}`}>
      <div className="flex items-baseline justify-between gap-3 border-b border-ink/15 px-3 py-2">
        <Label className="!text-ink">{caption}</Label>
        {meta && <Label className="whitespace-nowrap !text-[10px]">{meta}</Label>}
      </div>
      {children}
    </section>
  );
}

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

  const skills = project.required_skills || [];
  const held = skills.filter((s) => user?.skills?.includes(s)).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="grid gap-6 lg:grid-cols-3"
    >
      {/* Brief */}
      <Panel caption="Brief" meta="§ 01" className="lg:col-span-2">
        <div className="p-5 sm:p-6">
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink">
            {project.description}
          </p>
        </div>
      </Panel>

      <div className="flex flex-col gap-6">
        {/* Declared stack */}
        <Panel caption="Stack declared" meta={`${skills.length} listed`}>
          <div className="p-4">
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {skills.map(skill => (
                  <span
                    key={skill}
                    className="border border-ink/20 px-2 py-0.5 font-mono text-[11px] text-ink"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="font-mono text-[12px] text-graphite">— none specified</p>
            )}
          </div>
        </Panel>

        {/* Fig. 1 — compatibility */}
        <figure className="border border-ink/25 bg-paper-raised">
          <figcaption className="flex items-baseline justify-between gap-3 border-b border-ink/20 px-3 py-2">
            <Label className="!text-ink">Fig. 1 — Compatibility</Label>
            <Label className="whitespace-nowrap !text-[10px]">
              {matchResult ? 'measured' : 'unmeasured'}
            </Label>
          </figcaption>

          {matchResult ? (
            <div className="fm-grid p-3">
              {radarData.length > 0 && (
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke="var(--color-rule)" />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: 'var(--color-graphite)', fontSize: 10, fontFamily: 'IBM Plex Mono, ui-monospace, monospace' }}
                      />
                      <Radar
                        name="Skills"
                        dataKey="A"
                        stroke="var(--color-blueprint)"
                        fill="var(--color-blueprint)"
                        fillOpacity={0.15}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <dl className="border-t border-ink/15 pt-2">
                <div className="flex items-baseline justify-between gap-3">
                  <dt><Label className="!text-[10px]">Probability</Label></dt>
                  <dd className="fm-condensed text-3xl font-black leading-none text-ink">
                    {matchResult.score}<span className="text-ink/30">%</span>
                  </dd>
                </div>
                <div className="mt-1.5 flex items-baseline justify-between gap-3">
                  <dt><Label className="!text-[10px]">Skills held</Label></dt>
                  <dd className="font-mono text-[12px] text-ink">{held} / {skills.length}</dd>
                </div>
              </dl>

              <p className="mt-3 border-t border-ink/15 pt-2 text-[12px] leading-relaxed text-graphite">
                {matchResult.reason}
              </p>
            </div>
          ) : (
            <div className="p-4">
              <p className="text-[13px] leading-relaxed text-graphite">
                Read your profile against the declared stack and return a score.
              </p>
              <button
                onClick={handleMatch}
                disabled={isMatching}
                className="group relative mt-4 flex w-full items-center justify-center gap-2 overflow-hidden bg-ink px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-paper disabled:opacity-60"
              >
                <span className="absolute inset-0 origin-left scale-x-0 bg-blueprint transition-transform duration-300 ease-out group-hover:scale-x-100" />
                {isMatching ? (
                  <>
                    <span className="relative h-3 w-3 animate-spin rounded-full border border-paper/30 border-t-paper" />
                    <span className="relative">Scoring</span>
                  </>
                ) : (
                  <span className="relative">Evaluate compatibility</span>
                )}
              </button>
            </div>
          )}
        </figure>
      </div>
    </motion.div>
  );
}
