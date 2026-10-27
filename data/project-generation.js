// Settings and objectives are independent of the location templates.
export const projectTiers = [
  { name: "Easy", goal: 1000, kp: 1, eventEvery: 48, severity: 1 },
  { name: "Medium", goal: 3000, kp: 3, eventEvery: 30, severity: 1.15 },
  { name: "Hard", goal: 6000, kp: 5, eventEvery: 25, severity: 1.3 },
];
export const projectObjectives = [
  {
    id: "supply",
    name: "Deliver the water target",
    minLevel: 0,
    kind: "supply",
  },
  { id: "hands", name: "Community participation", minLevel: 1, kind: "manual" },
  {
    id: "equipment",
    name: "Build reliable infrastructure",
    minLevel: 1,
    kind: "equipment",
  },
  {
    id: "balanced",
    name: "Train and equip the team",
    minLevel: 4,
    kind: "both",
  },
];
export const projectConditions = [
  { id: "stable", name: "Stable ground", minLevel: 0, weight: 0, effect: {} },
  {
    id: "uphill",
    name: "Uphill distribution",
    minLevel: 1,
    weight: 1,
    effect: { manual: 0.88 },
  },
  {
    id: "clouds",
    name: "Cloud cover",
    minLevel: 1,
    weight: 1,
    effect: { auto: 0.85 },
  },
  {
    id: "remote",
    name: "Long supply route",
    minLevel: 1,
    weight: 1,
    effect: { cost: 1.12 },
  },
  {
    id: "maintenance",
    name: "Aging infrastructure",
    minLevel: 2,
    weight: 2,
    effect: { eventEvery: 0.85, severity: 1.1 },
  },
  {
    id: "sun",
    name: "Hot, sunny days",
    minLevel: 2,
    weight: 1,
    effect: { manual: 0.9, auto: 1.15 },
  },
  {
    id: "volunteers",
    name: "Volunteer-led operation",
    minLevel: 2,
    weight: 1,
    effect: { manual: 1.12, auto: 0.9 },
  },
  {
    id: "sediment",
    name: "Sediment-heavy intake",
    minLevel: 4,
    weight: 2,
    effect: { manual: 0.9, auto: 0.9 },
  },
  {
    id: "fragile",
    name: "Fragile supply chain",
    minLevel: 5,
    weight: 2,
    effect: { cost: 1.2, severity: 1.08 },
  },
];
export const generationRules = {
  growthPerCompletion: 0.14,
  secondConditionAt: 6,
  recentLimit: 18,
};
