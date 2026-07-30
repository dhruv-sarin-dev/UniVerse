// A short click, played on interactive elements.
//
// This used howler, which is a full audio library pulled in to play one
// sub-second pop. The native Audio element does exactly the same job here,
// so the dependency was dropped rather than shipped to every visitor.
const POP_SRC =
  'data:audio/mp3;base64,//OExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//OExEAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//OExIAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';

let pop;

export const playHaptic = () => {
  try {
    // Created lazily so the audio element is never constructed for visitors
    // who do not interact, and cloned per play so rapid clicks overlap
    // instead of restarting a single instance.
    if (!pop) {
      pop = new Audio(POP_SRC);
      pop.volume = 0.1;
    }
    const instance = pop.cloneNode();
    instance.volume = 0.1;
    // Autoplay is blocked until the first real gesture; ignore the rejection.
    instance.play?.().catch(() => {});
  } catch {
    // Audio unavailable — the click is decorative, so carry on silently.
  }
};

export const setupGlobalHaptics = () => {
  const handleGlobalClick = (e) => {
    const target = e.target.closest('button, a, [role="button"], [role="link"], .bento-card');
    if (target) playHaptic();
  };

  document.addEventListener('click', handleGlobalClick);
  return () => document.removeEventListener('click', handleGlobalClick);
};
