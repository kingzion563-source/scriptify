// Level colors and names per spec: 1 Newcomer, 5 Script Kiddie, 10 Lua Learner, 20 Hub Dev, 35 Exploit Wizard, 50 AG Legend
const LEVEL_TIERS: { min: number; color: string; name: string }[] = [
  { min: 50, color: "var(--level-50)", name: "AG Legend" },
  { min: 35, color: "var(--level-35)", name: "Exploit Wizard" },
  { min: 20, color: "var(--level-20)", name: "Hub Dev" },
  { min: 10, color: "var(--level-10)", name: "Lua Learner" },
  { min: 5, color: "var(--level-5)", name: "Script Kiddie" },
  { min: 1, color: "var(--level-1)", name: "Newcomer" },
];

export function getLevelBadgeColor(level: number): string {
  for (const entry of LEVEL_TIERS) {
    if (level >= entry.min) return entry.color;
  }
  return "var(--level-1)";
}

export function getLevelName(level: number): string {
  for (const entry of LEVEL_TIERS) {
    if (level >= entry.min) return entry.name;
  }
  return "Newcomer";
}
