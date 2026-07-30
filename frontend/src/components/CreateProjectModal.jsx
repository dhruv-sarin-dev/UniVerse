import { useState } from 'react';
import { X } from 'lucide-react';

/**
 * New project form, drawn as a requisition sheet. Behaviour is unchanged —
 * same fields, same payload shape, same submit contract.
 */
export default function CreateProjectModal({ isOpen, onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Web');
  const [skills, setSkills] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);
    const skillArray = skills.split(',').map((s) => s.trim()).filter(Boolean);

    await onSubmit({ title, description, category, required_skills: skillArray, members: [] });

    setIsSubmitting(false);
    setTitle('');
    setDescription('');
    setCategory('Web');
    setSkills('');
    onClose();
  };

  const field =
    'w-full border border-ink/25 bg-paper px-3 py-2.5 font-mono text-[13px] text-ink placeholder:text-graphite focus:border-blueprint focus:outline-none';

  return (
    <div className="fm-scope fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative w-full max-w-xl border border-ink bg-paper-raised shadow-2xl">
        <div className="flex items-baseline justify-between border-b border-ink px-5 py-3">
          <span className="fm-label !text-ink">Requisition — new project</span>
          <button
            onClick={onClose}
            className="text-graphite transition-colors hover:text-signal"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-5">
          <div>
            <label htmlFor="proj-title" className="fm-label mb-1.5 block text-graphite">
              Project name
            </label>
            <input
              id="proj-title" type="text" required value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={field} placeholder="AI financial advisor"
            />
          </div>

          <div>
            <label htmlFor="proj-desc" className="fm-label mb-1.5 block text-graphite">
              Brief
            </label>
            <textarea
              id="proj-desc" required rows={4} value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${field} resize-none`}
              placeholder="What you are building, and why it is worth building."
            />
          </div>

          <div>
            <label htmlFor="proj-cat" className="fm-label mb-1.5 block text-graphite">
              Category
            </label>
            <select
              id="proj-cat" value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`${field} cursor-pointer`}
            >
              <option value="Web">Web</option>
              <option value="Mobile App">Mobile App</option>
              <option value="Blockchain">Blockchain</option>
              <option value="AI/ML">AI/ML</option>
              <option value="Open Innovation">Open Innovation</option>
            </select>
          </div>

          <div>
            <label htmlFor="proj-skills" className="fm-label mb-1.5 block text-graphite">
              Skills needed <span className="normal-case tracking-normal">(comma separated)</span>
            </label>
            <input
              id="proj-skills" type="text" value={skills}
              onChange={(e) => setSkills(e.target.value)}
              className={field} placeholder="React, Machine Learning, UI Design"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-rule pt-4">
            <button
              type="button" onClick={onClose}
              className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-graphite transition-colors hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={isSubmitting}
              className="group relative overflow-hidden bg-ink px-6 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-paper disabled:opacity-50"
            >
              <span className="absolute inset-0 origin-left scale-x-0 bg-blueprint transition-transform duration-300 ease-out group-hover:scale-x-100" />
              <span className="relative">{isSubmitting ? 'Filing…' : 'File project'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
