/**
 * Kilumen fork: runtime data registry.
 * The upstream sim statically imported its full creature/move/item data set.
 * This fork ships NO data; the host game installs its own tables at runtime
 * via `installData()` (see src/battle/data/ in the Kilumen repo).
 */
export const Registry: {data: any, formats: any[]} = {data: null, formats: []};
