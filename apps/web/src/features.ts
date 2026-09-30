/**
 * Parts of the app switched off for now, to keep the focus on goals → tasks → the house.
 * Their data and logic stay in core; flip a flag to bring the screen back.
 */
export const FEATURES = {
  /** "Город" view: all goals as one city that levels up. */
  city: false,
  /** Coins, the shop and what it sells (roof colors, streak freezes). */
  shop: false,
};

/** The screen switcher is only needed when there is more than the building site. */
export const hasViews = FEATURES.city || FEATURES.shop;
