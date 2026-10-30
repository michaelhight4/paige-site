const pet = (fx, fy, face) => `const f = s.follower; if (f) { f.x = ${fx}; f.y = ${fy}; f.facing = '${face}'; f.stepping = false; } s._dirty = true; return f && { sp: f.species, x: f.x, y: f.y, cell: f.sheet && f.sheet.naturalWidth / 5 };`;
export const VIEWS = [
  ['p_shop_pet', 'shop_int', 7, 5, 'up', pet(6, 5, 'left'), 800, 0],
];
