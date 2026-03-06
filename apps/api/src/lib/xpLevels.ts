// XP thresholds for each level (index 0 = level 1, index 49 = level 50).
// Milestones from spec: L5=500, L10=1500, L20=4000, L35=8000, L50=15000.
const XP_FOR_LEVEL: number[] = (() => {
  const out: number[] = [];
  const milestones: [number, number][] = [
    [1, 0],
    [5, 500],
    [10, 1500],
    [20, 4000],
    [35, 8000],
    [50, 15000],
  ];
  for (let i = 0; i < milestones.length - 1; i++) {
    const [levelA, xpA] = milestones[i];
    const [levelB, xpB] = milestones[i + 1];
    for (let L = levelA; L < levelB; L++) {
      const t = (L - levelA) / (levelB - levelA);
      out[L - 1] = Math.round(xpA + t * (xpB - xpA));
    }
  }
  out[49] = 15000;
  return out;
})();

export function getLevelFromXp(xp: number): number {
  if (xp < 0) return 1;
  for (let level = 50; level >= 1; level--) {
    if (xp >= XP_FOR_LEVEL[level - 1]) return level;
  }
  return 1;
}
