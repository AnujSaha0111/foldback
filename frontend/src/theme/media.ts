/** Hover styles live inside this: on touch a tap would leave them stuck on. */
export const HOVER = "@media (hover: hover)";

/** The same for small nudges that only make sense with a mouse. A separate key, so the two can sit in one object. */
export const HOVER_FINE = "@media (hover: hover) and (pointer: fine)";

/** Touch screens: a control grows to a 44 px target there, whatever it looks like with a mouse. */
export const COARSE = "@media (pointer: coarse)";
export const TOUCH_TARGET = "2.75rem";
