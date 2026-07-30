import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Github, Plus, X, LogIn } from 'lucide-react';
import API_URL from '../api';

/**
 * Onboarding — the blank enrolment sheet.
 *
 * Same record as Profile, filled in for the first time: numbered sections, a
 * skills list rather than pills, and one filing action at the foot of the
 * form. Behaviour is untouched — the has_profile redirect, the signed-out
 * prompt and the submit payload all stay as they were.
 */

const EASE = [0.16, 1, 0.3, 1];

const FIELD =
  'w-full border border-ink/25 bg-paper px-3 py-2.5 font-mono text-[13px] text-ink placeholder:text-graphite focus:border-blueprint focus:outline-none';

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
      <div className="space-y-5 p-4 sm:p-5">{children}</div>
    </motion.section>
  );
}

export default function Onboarding() {
  const { user, updateUser, login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    branch: '',
    year: '',
    github: '',
    bio: ''
  });
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.has_profile) navigate('/discover');
  }, [user, navigate]);

  // Show login prompt for unauthenticated users
  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-24 pb-20 sm:px-6 sm:pt-28">
        <div className="flex items-baseline justify-between border-b border-ink pb-2">
          <Label className="!text-ink">§ Enrolment — new record</Label>
          <Label>Not signed in</Label>
        </div>

        <div className="mt-10 border border-ink/20 bg-paper-raised">
          <div className="border-b border-ink/20 px-4 py-2">
            <Label className="!text-ink">Authorisation required</Label>
          </div>
          <div className="p-6 sm:p-8">
            <h2 className="fm-condensed text-4xl font-black uppercase leading-[0.9] tracking-tight text-ink">
              Join
              <br />
              <span className="text-blueprint">Uni-Verse</span>
            </h2>
            <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-graphite">
              Sign in with Google to open a record and start browsing project
              teams.
            </p>
            <button
              onClick={login}
              className="group relative mt-8 inline-flex w-full items-center justify-center gap-2 overflow-hidden bg-ink px-7 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-paper sm:w-auto"
            >
              <span className="absolute inset-0 origin-left scale-x-0 bg-blueprint transition-transform duration-300 ease-out group-hover:scale-x-100" />
              <LogIn size={14} className="relative" />
              <span className="relative">Sign in with Google</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleAddSkill = (e) => {
    e.preventDefault();
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      uid: user.uid,
      email: user.email,
      display_name: user.display_name,
      photo_url: user.photo_url || "",
      ...formData,
      skills
    };

    try {
      const res = await fetch(`${API_URL}/api/users/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        // Push skills into context so matchmaking works without reload
        updateUser({ skills, ...formData, has_profile: true });
        navigate('/discover');
      }
    } catch (err) {
      console.error("Failed to save profile", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-24 pb-20 sm:px-6 sm:pt-28">
      {/* Running head */}
      <div className="flex items-baseline justify-between border-b border-ink pb-2">
        <Label className="!text-ink">§ Enrolment — new record</Label>
        <Label>{user.display_name || 'Applicant'}</Label>
      </div>

      <div className="pt-8">
        <h1 className="fm-condensed text-5xl font-black uppercase leading-[0.9] tracking-tight text-ink sm:text-6xl">
          Complete
          <br />
          <span className="text-blueprint">your record</span>
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-graphite">
          Four sections. What you study, where your code lives, what you can
          build, and what you are after.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Panel caption="Section A — Standing">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="ob-branch" className="fm-label mb-1.5 block text-graphite">
                Branch / major
              </label>
              <input
                id="ob-branch" required type="text" placeholder="e.g. Computer Science"
                value={formData.branch}
                onChange={e => setFormData({ ...formData, branch: e.target.value })}
                className={FIELD}
              />
            </div>
            <div>
              <label htmlFor="ob-year" className="fm-label mb-1.5 block text-graphite">
                Year of study
              </label>
              <select
                id="ob-year" required value={formData.year}
                onChange={e => setFormData({ ...formData, year: e.target.value })}
                className={`${FIELD} cursor-pointer`}
              >
                <option value="" disabled>Select year</option>
                <option value="1">1st year</option>
                <option value="2">2nd year</option>
                <option value="3">3rd year</option>
                <option value="4">4th year</option>
                <option value="Alumni">Alumni</option>
              </select>
            </div>
          </div>
        </Panel>

        <Panel caption="Section B — Repository" meta="optional" delay={0.05}>
          <div>
            <label htmlFor="ob-github" className="fm-label mb-1.5 flex items-center gap-1.5 text-graphite">
              <Github size={12} /> GitHub URL
            </label>
            <input
              id="ob-github" type="url" placeholder="https://github.com/username"
              value={formData.github}
              onChange={e => setFormData({ ...formData, github: e.target.value })}
              className={FIELD}
            />
            <p className="mt-2 text-[13px] leading-relaxed text-graphite">
              Add it now and your commits can be scored later. You can sync your
              languages into the skills list from your profile at any time.
            </p>
          </div>
        </Panel>

        <Panel
          caption="Section C — Skills declared"
          meta={String(skills.length).padStart(2, '0')}
          delay={0.1}
        >
          <ol className="border-t border-rule">
            {skills.map((skill, i) => (
              <li
                key={skill}
                className="flex items-baseline gap-3 border-b border-rule py-2"
              >
                <Label className="w-7 shrink-0 !text-[10px]">
                  {String(i + 1).padStart(2, '0')}
                </Label>
                <span className="flex-1 font-mono text-[13px] text-ink">{skill}</span>
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  aria-label={`Remove ${skill}`}
                  className="shrink-0 text-graphite transition-colors hover:text-signal"
                >
                  <X size={13} />
                </button>
              </li>
            ))}
            {skills.length === 0 && (
              <li className="border-b border-rule py-2 font-mono text-[13px] text-graphite">
                — none declared yet
              </li>
            )}
          </ol>

          <div>
            <label htmlFor="ob-skill" className="fm-label mb-1.5 block text-graphite">
              Add an entry
            </label>
            <div className="flex gap-2">
              <input
                id="ob-skill" type="text" placeholder="React, UX, Python…"
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddSkill(e)}
                className={FIELD}
              />
              <button
                type="button"
                onClick={handleAddSkill}
                disabled={!skillInput.trim()}
                aria-label="Add skill"
                className="shrink-0 border border-ink px-3 text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink"
              >
                <Plus size={16} />
              </button>
            </div>
            <p className="mt-2">
              <Label className="!text-[10px]">Press enter to add several</Label>
            </p>
          </div>
        </Panel>

        <Panel caption="Section D — Statement" delay={0.15}>
          <div>
            <label htmlFor="ob-bio" className="fm-label mb-1.5 block text-graphite">
              Short bio
            </label>
            <textarea
              id="ob-bio" required rows="3" placeholder="I am highly passionate about…"
              value={formData.bio}
              onChange={e => setFormData({ ...formData, bio: e.target.value })}
              className={`${FIELD} resize-none`}
            />
          </div>
        </Panel>

        <div className="flex items-center justify-between gap-4 border-t border-ink pt-5">
          <Label className="!text-[10px]">Uni-Verse — Field Manual · Rev 02</Label>
          <button
            disabled={loading}
            type="submit"
            className="group relative overflow-hidden bg-ink px-7 py-3 text-[11px] font-semibold uppercase tracking-wider text-paper disabled:opacity-50"
          >
            <span className="absolute inset-0 origin-left scale-x-0 bg-blueprint transition-transform duration-300 ease-out group-hover:scale-x-100" />
            <span className="relative">{loading ? 'Filing…' : 'File record'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
