// --- While a kanji is written: no text selection and no long-press menu (iPhone Safari) ---
// The square already has user-select: none (styles.css), but Safari starts a selection on the text
// around it (the phrase, the time, the message) when a finger rests on the square, and shows its
// menu. So the whole writing screen gets the .no-select class (styles.css), and here:
//   - selectstart and contextmenu are stopped in it;
//   - a touch that starts on the square is not given to the page (preventDefault), which is what
//     stops Safari's long press. WritingPad listens to pointer events: they still come.
import { onBeforeUnmount, onMounted, type Ref } from 'vue';

const stop = (e: Event) => e.preventDefault();

function onTouchStart(e: TouchEvent) {
    if ((e.target as Element | null)?.closest?.('.tegaki-pad')) e.preventDefault();
}

export function useNoSelect(root: Ref<HTMLElement | null>) {
    let el: HTMLElement | null = null;
    onMounted(() => {
        el = root.value;
        if (!el) return;
        el.addEventListener('selectstart', stop);
        el.addEventListener('contextmenu', stop);
        // Not passive: else preventDefault does nothing
        el.addEventListener('touchstart', onTouchStart, { passive: false });
    });
    onBeforeUnmount(() => {
        el?.removeEventListener('selectstart', stop);
        el?.removeEventListener('contextmenu', stop);
        el?.removeEventListener('touchstart', onTouchStart);
    });
}
