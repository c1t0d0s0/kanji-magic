// --- On a big screen, the page as big as it can be without scrolling ---
// styles.css makes the root font size grow with the window (all sizes are in rem). But a screen
// with much on it would then be taller than the window. So the page is measured at that size and,
// if too tall, the root font size is made smaller till it fits, never below the browser's own size
// (on a phone the page scrolls as before). Again on a new screen, when the window changes, and when
// what is on the screen grows.
import { nextTick, onBeforeUnmount, onMounted, watch, type WatchSource } from 'vue';

// As in styles.css: what the window would allow
const GROW = 'clamp(100%, min(1.25vw, 2.1vh), 200%)';

let busy = false;

// `skip`: a screen that fits by itself (the battle: its field is sized to the window by its script,
// and measuring it here while that is done made the two go round and round, blinking)
export function fitScreen(skip = false) {
    const html = document.documentElement;
    const app = document.getElementById('app');
    if (!app || busy) return;
    html.style.fontSize = '';
    if (skip) return;
    busy = true;
    // Measured with no min-height (styles.css): the height the page needs
    html.classList.add('fit-measure');
    const room = window.innerHeight;
    for (let i = 0; i < 5; i++) {
        const need = app.getBoundingClientRect().height;
        if (need <= room + 1) break;
        const px = parseFloat(getComputedStyle(html).fontSize);
        // Not all of it grows with the font size (the lines may break elsewhere): a little less
        const fit = (px * room) / need - 0.1;
        html.style.fontSize = `max(100%, min(${GROW}, ${fit.toFixed(2)}px))`;
        if (parseFloat(getComputedStyle(html).fontSize) >= px) break;
    }
    html.classList.remove('fit-measure');
    busy = false;
}

// For the root component of a page: `screen` changes when another screen is shown, `skip` says
// which screen fits by itself
export function useFitScreen(screen?: WatchSource, skip: () => boolean = () => false) {
    let frame = 0;
    const fit = () => fitScreen(skip());
    const later = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(fit);
    };
    let observer: ResizeObserver | null = null;
    onMounted(() => {
        fit();
        window.addEventListener('resize', later);
        // The page grew (more on it, a font loaded): fit again
        const app = document.getElementById('app');
        if (app && typeof ResizeObserver === 'function') {
            observer = new ResizeObserver(later);
            observer.observe(app);
        }
        document.fonts?.ready.then(later);
    });
    if (screen) watch(screen, () => nextTick(fit));
    onBeforeUnmount(() => {
        cancelAnimationFrame(frame);
        window.removeEventListener('resize', later);
        observer?.disconnect();
    });
}
