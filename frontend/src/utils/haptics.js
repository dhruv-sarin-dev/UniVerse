import { Howl } from 'howler';

// Small subtle click sound (base64 encoded short pop to avoid external asset loading issues)
const popSound = new Howl({
  src: ['data:audio/mp3;base64,//OExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//OExEAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//OExIAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq'],
  volume: 0.1, // Very subtle by default
});

export const playHaptic = () => {
    // We try to play, but ignore errors if browser blocks autoplay before user interaction
    try {
        popSound.play();
    } catch (e) {
        // ignore
    }
};

export const setupGlobalHaptics = () => {
    const handleGlobalClick = (e) => {
        // Check if the clicked element is a button, a tag, or has a role of button/link
        const target = e.target.closest('button, a, [role="button"], [role="link"], .bento-card');
        if (target) {
            playHaptic();
        }
    };
    
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
};
