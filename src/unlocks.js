// unlock table (ui/data/unlocks.json) loaded once by the adapter (or tests) via setUnlocks
let U = [];
export const setUnlocks = (u) => { U = u; };
export const readUnlocks = () => U;
