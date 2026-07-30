import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import API_URL from '../api';
import { Github, Plus, X } from 'lucide-react';

/**
 * Profile — the enrolment record, already filed.
 *
 * Same sheet as Onboarding, but for a record that exists: every field is a
 * line on a form, skills are numbered entries on a list rather than pills, and
 * the GitHub sync is an annotation on the repository line instead of a button
 * floating in its own card.
 *
 * Behaviour is untouched — same fetch, same payload, same signed-out and
 * loading branches.
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

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    // display_name is bound to an input below. Leaving it out of the initial
    // state makes that input start uncontrolled and flip to controlled once
    // the profile loads, which React warns about and which drops whatever the
    // user typed in the meantime.
    display_name: '',
    branch: '',
    year: '',
    github: '',
    bio: ''
  });
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingGithub, setSyncingGithub] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!user) {
      // Nothing to fetch. Leaving loading true pinned signed-out visitors on
      // "Loading profile..." forever, since nothing else ever cleared it.
      setLoading(false);
      return;
    }
    fetch(`${API_URL}/api/users/${user.uid}`)
      .then(res => res.json())
      .then(data => {
        if (data.id) { // Existing profile — new users come back without one
          setFormData({
            display_name: data.display_name || user.display_name || '',
            branch: data.branch || '',
            year: data.year || '',
            github: data.github || '',
            bio: data.bio || ''
          });
          setSkills(data.skills || []);
        } else {
          // No saved profile yet: seed the name from the signed-in account so
          // the field is not blank on a first visit.
          setFormData(prev => ({ ...prev, display_name: user.display_name || '' }));
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [user]);

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

  const handleGithubSync = async () => {
    if (!formData.github) return;

    // Extract username from URL or raw input
    let username = formData.github.trim();
    if (username.includes('github.com/')) {
        username = username.split('github.com/')[1].split('/')[0];
    }

    if (!username) return;

    setSyncingGithub(true);
    try {
      const res = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`);
      if (!res.ok) throw new Error("Could not fetch repos");
      const repos = await res.json();

      const languages = new Set();
      repos.forEach(repo => {
        if (repo.language) languages.add(repo.language);
      });

      const newSkills = Array.from(languages);
      const combined = new Set([...skills, ...newSkills]);

      setSkills(Array.from(combined));
      setSuccessMsg(`Synced ${newSkills.length} programming languages from GitHub!`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error(err);
      alert("Failed to sync GitHub. Make sure the username is correct.");
    } finally {
      setSyncingGithub(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');

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
        // Update the Navbar name/avatar immediately without reload
        updateUser({ display_name: formData.display_name });
        setSuccessMsg('Profile updated successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      console.error("Failed to save profile", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="mx-auto flex max-w-3xl flex-col items-center justify-center px-4 pt-40 pb-20">
      <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-ink/15 border-t-blueprint" />
      <Label>Retrieving record</Label>
    </div>
  );

  // /profile is not behind an auth guard, so a signed-out visitor could reach
  // an empty form whose submit handler dereferences user.uid and throws.
  if (!user) return (
    <div className="mx-auto max-w-3xl px-4 pt-24 pb-20 sm:px-6 sm:pt-28">
      <div className="flex items-baseline justify-between border-b border-ink pb-2">
        <Label className="!text-ink">§ Record — personal file</Label>
        <Label>No holder</Label>
      </div>
      <div className="mt-10 border border-dashed border-ink/30 px-6 py-20 text-center">
        <h2 className="fm-condensed text-3xl font-black uppercase leading-[0.9] tracking-tight text-ink">
          Sign in to view
          <br />
          <span className="text-blueprint">your record</span>
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-graphite">
          You need an account before you can edit your details.
        </p>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 pt-24 pb-20 sm:px-6 sm:pt-28">
      {/* Running head */}
      <div className="flex items-baseline justify-between border-b border-ink pb-2">
        <Label className="!text-ink">§ Record — personal file</Label>
        <Label>
          {skills.length} {skills.length === 1 ? 'skill' : 'skills'} declared
        </Label>
      </div>

      <div className="pt-8">
        <h1 className="fm-condensed text-5xl font-black uppercase leading-[0.9] tracking-tight text-ink sm:text-6xl">
          Personal
          <br />
          <span className="text-blueprint">record</span>
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-graphite">
          Your details, your skills and your pitch. This is what team leads read
          before they read anything else.
        </p>
      </div>

      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="mt-8 flex items-baseline gap-3 border border-blueprint/40 bg-blueprint/[0.06] px-4 py-3"
        >
          <Label className="!text-blueprint">Filed</Label>
          <span className="font-mono text-[13px] text-ink">{successMsg}</span>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Panel caption="Section A — Identity">
          <div>
            <label htmlFor="pf-name" className="fm-label mb-1.5 block text-graphite">
              Display name
            </label>
            <input
              id="pf-name" required type="text" placeholder="Your name"
              value={formData.display_name}
              onChange={e => setFormData({ ...formData, display_name: e.target.value })}
              className={FIELD}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="pf-branch" className="fm-label mb-1.5 block text-graphite">
                Branch / major
              </label>
              <input
                id="pf-branch" required type="text" placeholder="e.g. Computer Science"
                value={formData.branch}
                onChange={e => setFormData({ ...formData, branch: e.target.value })}
                className={FIELD}
              />
            </div>
            <div>
              <label htmlFor="pf-year" className="fm-label mb-1.5 block text-graphite">
                Year of study
              </label>
              <select
                id="pf-year" required value={formData.year}
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
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <label htmlFor="pf-github" className="fm-label flex items-center gap-1.5 text-graphite">
                <Github size={12} /> GitHub URL or username
              </label>
              {formData.github && (
                <button
                  type="button"
                  onClick={handleGithubSync}
                  disabled={syncingGithub}
                  className="group relative overflow-hidden border border-ink px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink transition-colors hover:text-paper disabled:opacity-50"
                >
                  <span className="absolute inset-0 origin-left scale-x-0 bg-ink transition-transform duration-300 ease-out group-hover:scale-x-100" />
                  <span className="relative">
                    {syncingGithub ? 'Syncing…' : 'Auto-sync skills'}
                  </span>
                </button>
              )}
            </div>
            <input
              id="pf-github" type="text" placeholder="username or https://github.com/…"
              value={formData.github}
              onChange={e => setFormData({ ...formData, github: e.target.value })}
              className={FIELD}
            />
            <p className="mt-2 text-[13px] leading-relaxed text-graphite">
              Syncing reads your public repositories and adds every language it
              finds to the list below.
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
            <label htmlFor="pf-skill" className="fm-label mb-1.5 block text-graphite">
              Add an entry
            </label>
            <div className="flex gap-2">
              <input
                id="pf-skill" type="text" placeholder="React, UX, Python…"
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
            <label htmlFor="pf-bio" className="fm-label mb-1.5 block text-graphite">
              Short bio
            </label>
            <textarea
              id="pf-bio" required rows="3" placeholder="I am highly passionate about…"
              value={formData.bio}
              onChange={e => setFormData({ ...formData, bio: e.target.value })}
              className={`${FIELD} resize-none`}
            />
          </div>
        </Panel>

        <div className="flex items-center justify-between gap-4 border-t border-ink pt-5">
          <Label className="!text-[10px]">Uni-Verse — Field Manual · Rev 02</Label>
          <button
            disabled={saving}
            type="submit"
            className="group relative overflow-hidden bg-ink px-7 py-3 text-[11px] font-semibold uppercase tracking-wider text-paper disabled:opacity-50"
          >
            <span className="absolute inset-0 origin-left scale-x-0 bg-blueprint transition-transform duration-300 ease-out group-hover:scale-x-100" />
            <span className="relative">{saving ? 'Filing…' : 'File changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
