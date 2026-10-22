// Контуры иконок 24×24 для components/Icon.astro
export type IconName = 'play' | 'gamepad' | 'arrow' | 'chevron' | 'chat' | 'heart' | 'book' | 'sun' | 'moon' | 'clock' | 'plate' | 'leaf' | 'menu' | 'check' | 'cross'

export const iconPaths: Record<IconName, string> = {
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>',
  gamepad: '<rect x="2.5" y="7" width="19" height="11" rx="5.5"/><path d="M7.5 10.5v4M5.5 12.5h4"/><circle cx="15.5" cy="11.5" r="0.6" fill="currentColor"/><circle cx="17.5" cy="13.5" r="0.6" fill="currentColor"/>',
  arrow: '<path d="M4 12h15M13.5 6.5 19 12l-5.5 5.5"/>',
  chevron: '<path d="m6 9.5 6 6 6-6"/>',
  chat: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5z"/><path d="M8.5 10h.01M12 10h.01M15.5 10h.01" stroke-width="2.6"/>',
  heart: '<path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z" fill="currentColor"/>',
  book: '<path d="M3.5 5.5c3-1 6-1 8.5.8v13c-2.5-1.8-5.5-1.8-8.5-.8zM20.5 5.5c-3-1-6-1-8.5.8v13c2.5-1.8 5.5-1.8 8.5-.8z"/>',
  sun: '<circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
  moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" fill="currentColor"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  plate: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M12 12h8.5"/>',
  leaf: '<path d="M5 19c0-8 5-13.5 14.5-14-.5 9.5-6 14.5-14 14zM5 19l7-7"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  cross: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
}
