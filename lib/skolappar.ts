// Anonymous usage counts for skolappar.org (kotten.js, loaded in index.html).
// Only event names and numbers are sent – never anything the child typed.
declare global { interface Window { skolappar?: { event: (name: string, value?: number) => void } } }
export const report = (name: 'round_start' | 'round_done' | 'level' | 'hint' | 'sound_off', value?: number) => window.skolappar?.event(name, value);
