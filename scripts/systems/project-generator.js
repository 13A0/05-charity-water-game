import { projectArchetypes as projects } from "../../data/project-archetypes.js";
import {
  projectTiers,
  projectObjectives,
  projectConditions,
  generationRules as rules,
} from "../../data/project-generation.js";
const pick = (items, random) =>
  items[
    Math.min(items.length - 1, Math.max(0, Math.floor(random() * items.length)))
  ];
const round = (n) => Math.round(n * 100) / 100;
export const signature = (p) =>
  `${p.templateId}|${p.objectiveId}|${p.conditionIds.join("+")}`;
export function buildProject(
  template,
  tierIndex,
  stage,
  objective,
  conditions,
) {
  conditions = [...conditions].sort((a, b) => a.id.localeCompare(b.id));
  const tier = projectTiers[tierIndex],
    ids = conditions.map((c) => c.id).sort();
  const modifiers = { manual: 1, auto: 1, cost: 1, eventEvery: 1, severity: 1 };
  for (const condition of conditions)
    for (const [key, value] of Object.entries(condition.effect))
      modifiers[key] *= value;
  const minPumps = ["manual", "both"].includes(objective.kind)
    ? Math.min(200, 16 + tierIndex * 8 + stage * 3)
    : 0;
  const minUpgrades = ["equipment", "both"].includes(objective.kind)
    ? Math.min(12, 2 + tierIndex + Math.floor(stage / 4))
    : 0;
  const goal =
    Math.ceil((tier.goal * (1 + rules.growthPerCompletion * stage)) / 25) * 25;
  const manual = round(Math.max(0.7, modifiers.manual)),
    auto = round(Math.max(0.65, modifiers.auto)),
    cost = round(Math.min(1.35, modifiers.cost));
  const eventEvery = round(
    Math.max(
      tierIndex === 0 ? 32 : 20,
      (tier.eventEvery * modifiers.eventEvery) /
        (1 + 0.015 * Math.min(stage, 30)),
    ),
  );
  const severity = round(
    Math.min(
      1.65,
      tier.severity * modifiers.severity + 0.01 * Math.min(stage, 30),
    ),
  );
  const requirements = [`Deliver ${goal.toLocaleString("en-US")} L`];
  if (minPumps) requirements.push(`make ${minPumps} manual pumps`);
  if (minUpgrades) requirements.push(`install ${minUpgrades} equipment levels`);
  const changes = [];
  for (const [name, value] of [
    ["manual", manual],
    ["automation", auto],
    ["equipment cost", cost],
  ])
    if (value !== 1)
      changes.push(
        `${value > 1 ? "+" : ""}${Math.round((value - 1) * 100)}% ${name}`,
      );
  return {
    id: `expedition-${stage}-${tierIndex}-${template.id}-${objective.id}-${ids.join("-")}`,
    templateId: template.id,
    stage,
    tierIndex,
    objectiveId: objective.id,
    conditionIds: ids,
    name: template.name,
    location: template.location,
    description: template.description,
    color: template.color,
    difficulty: tier.name,
    goal,
    kp: tier.kp + Math.floor(stage / 4),
    manual,
    auto,
    cost,
    eventEvery,
    severity,
    minPumps,
    minUpgrades,
    objective: requirements.join(" + "),
    condition: `${conditions.map((c) => c.name).join(" + ")} · ${changes.join(" · ") || "standard production"} · events every ${eventEvery}s · incident duration ×${severity}`,
  };
}
export function generateOffers(state, random) {
  const stage = state.completed,
    history = state.recentProjects || [],
    usedTypes = new Set(),
    usedConditions = new Set();
  const templates = projects.filter(
    (p) =>
      (!p.unlock || stage >= p.unlock) &&
      (!p.skill || state.skills.includes(p.skill)),
  );
  const offers = projectTiers.map((tier, tierIndex) => {
    const level = stage + tierIndex * 2,
      budget = Math.min(4, Math.max(1, Math.floor(stage / 3) + tierIndex));
    const available = projectConditions.filter(
      (c) =>
        c.minLevel <= level &&
        c.weight <= budget &&
        (level === 0 ? c.id === "stable" : c.id !== "stable"),
    );
    let sets = available.map((c) => [c]);
    if (stage >= rules.secondConditionAt && tierIndex > 0) {
      const pairs = [];
      for (let i = 0; i < available.length; i++)
        for (let j = i + 1; j < available.length; j++)
          if (available[i].weight + available[j].weight <= budget)
            pairs.push([available[i], available[j]]);
      if (pairs.length) sets = pairs;
    }
    const objectives = projectObjectives.filter(
      (o) => o.minLevel <= level && (level === 0 ? o.id === "supply" : true),
    );
    let candidates = [];
    for (const t of templates.filter((t) => !usedTypes.has(t.id)))
      for (const o of objectives)
        for (const c of sets)
          candidates.push(buildProject(t, tierIndex, stage, o, c));
    // Prefer never/recently unoffered combinations. When exhausted, retire the oldest first.
    const fresh = candidates.filter((p) => !history.includes(signature(p)));
    if (fresh.length) candidates = fresh;
    else {
      const oldest = Math.min(
        ...candidates.map((p) => history.lastIndexOf(signature(p))),
      );
      candidates = candidates.filter(
        (p) => history.lastIndexOf(signature(p)) === oldest,
      );
    }
    const varied = candidates.filter(
      (p) => !usedConditions.has(p.conditionIds.join("+")),
    );
    if (varied.length) candidates = varied;
    const choice = pick(candidates, random);
    usedTypes.add(choice.templateId);
    usedConditions.add(choice.conditionIds.join("+"));
    return choice;
  });
  state.recentProjects = [...history, ...offers.map(signature)].slice(
    -rules.recentLimit,
  );
  return offers;
}
// Reconstruct trusted display strings and exact numeric requirements from a compact recipe.
export function validateGenerated(p) {
  const template = projects.find((t) => t.id === p?.templateId),
    objective = projectObjectives.find((o) => o.id === p?.objectiveId);
  if (
    !template ||
    !objective ||
    !Number.isSafeInteger(p.stage) ||
    p.stage < 0 ||
    p.stage > 1e8 ||
    ![0, 1, 2].includes(p.tierIndex) ||
    !Array.isArray(p.conditionIds) ||
    p.conditionIds.length < 1 ||
    p.conditionIds.length > 2 ||
    new Set(p.conditionIds).size !== p.conditionIds.length
  )
    throw Error("Invalid generated project");
  const conditions = p.conditionIds.map((id) =>
    projectConditions.find((c) => c.id === id),
  );
  if (conditions.some((c) => !c)) throw Error("Unknown project condition");
  const expected = buildProject(
    template,
    p.tierIndex,
    p.stage,
    objective,
    conditions,
  );
  if (
    Object.keys(expected).some(
      (key) => JSON.stringify(p[key]) !== JSON.stringify(expected[key]),
    )
  )
    throw Error("Project requirements were corrupted");
  return expected;
}
