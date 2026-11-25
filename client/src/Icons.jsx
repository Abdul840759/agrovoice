// Small line icons used across the app. They inherit the text color.
const base = {
  width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
}

export const Mic = (p) => (
  <svg {...base} {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3" /></svg>
)
export const Camera = (p) => (
  <svg {...base} {...p}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
)
export const Send = (p) => (
  <svg {...base} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)
export const Clock = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
)
export const Leaf = (p) => (
  <svg {...base} {...p}><path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z" /><path d="M5 19c3-4 6-6 9-8" /></svg>
)
export const Chevron = (p) => (
  <svg {...base} {...p}><path d="M9 6l6 6-6 6" /></svg>
)
export const Back = (p) => (
  <svg {...base} {...p}><path d="M15 5l-7 7 7 7" /></svg>
)
export const Logout = (p) => (
  <svg {...base} {...p}><path d="M10 5H5v14h5M15 8l4 4-4 4M19 12H9" /></svg>
)
export const Close = (p) => (
  <svg {...base} {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>
)
export const Bug = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="14" r="5" /><path d="M12 9V6M10 6l-1-2M14 6l1-2M8 11L5 9M16 11l3-2M7 14H4M17 14h3M8 18l-3 2M16 18l3 2" /></svg>
)
export const Basket = (p) => (
  <svg {...base} {...p}><path d="M4 10h16l-1.5 9h-13z" /><path d="M8 10l3-6M16 10l-3-6" /></svg>
)
export const Sprout = (p) => (
  <svg {...base} {...p}><path d="M12 21v-8" /><path d="M12 13c0-4-3-6-7-6 0 4 3 6 7 6zM12 15c0-3 2-5 6-5 0 3-2 5-6 5z" /></svg>
)
export const Speaker = (p) => (
  <svg {...base} {...p}><path d="M5 10v4h3l4 3V7l-4 3z" /><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11" /></svg>
)
export const Lines = (p) => (
  <svg {...base} {...p}><path d="M5 7h14M5 12h14M5 17h9" /></svg>
)
