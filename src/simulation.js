export const SIM_SPEED_MIN = 1
export const SIM_SPEED_MAX = 6

export const DEFAULT_CONFIG = {
  initialPreyPopulation: 48,
  initialPredatorPopulation: 3,
  foodDensity: 0.72,
  mutationRate: 0.08,
  climateSeverity: 0.24,
  terrainRoughness: 0.46,
  vegetationDensity: 0.66,
  generationLength: 760,
  simSpeed: SIM_SPEED_MIN,
}

export const TERRAIN_BOUNDS = {
  cols: 40,
  rows: 26,
}

const WATER_BLOCK_LEVEL = 0.12
const SHORE_MOISTURE_LEVEL = 0.34
const TARGET_PREDATOR_SHARE = 0.25
const MIN_WORLD_X = 0.3
const MAX_WORLD_X = TERRAIN_BOUNDS.cols - 1.3
const MIN_WORLD_Y = 0.3
const MAX_WORLD_Y = TERRAIN_BOUNDS.rows - 1.3

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function clampWorldX(value) {
  return clamp(value, MIN_WORLD_X, MAX_WORLD_X)
}

function clampWorldY(value) {
  return clamp(value, MIN_WORLD_Y, MAX_WORLD_Y)
}

function lerp(min, max, amount) {
  return min + (max - min) * amount
}

function fract(value) {
  return value - Math.floor(value)
}

function hashNoise(x, y, seed) {
  return fract(Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123)
}

function smoothNoise(x, y, seed) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const tx = x - x0
  const ty = y - y0

  const v1 = hashNoise(x0, y0, seed)
  const v2 = hashNoise(x0 + 1, y0, seed)
  const v3 = hashNoise(x0, y0 + 1, seed)
  const v4 = hashNoise(x0 + 1, y0 + 1, seed)

  const sx = tx * tx * (3 - 2 * tx)
  const sy = ty * ty * (3 - 2 * ty)
  const ix1 = lerp(v1, v2, sx)
  const ix2 = lerp(v3, v4, sx)
  return lerp(ix1, ix2, sy)
}

function randomInRange(min, max) {
  return min + Math.random() * (max - min)
}

function distanceBetween(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function normalizeAngle(angle) {
  let nextAngle = angle

  while (nextAngle <= -Math.PI) {
    nextAngle += Math.PI * 2
  }

  while (nextAngle > Math.PI) {
    nextAngle -= Math.PI * 2
  }

  return nextAngle
}

function rotateTowardsAngle(currentAngle, targetAngle, maxTurn) {
  const delta = normalizeAngle(targetAngle - currentAngle)

  if (Math.abs(delta) <= maxTurn) {
    return normalizeAngle(targetAngle)
  }

  return normalizeAngle(currentAngle + Math.sign(delta) * maxTurn)
}

function createTraitHistogram(values, buckets = 5) {
  const histogram = new Array(buckets).fill(0)

  values.forEach((value) => {
    const index = clamp(Math.floor(value * buckets), 0, buckets - 1)
    histogram[index] += 1
  })

  return histogram
}

export const TRAIT_GUIDE_BY_SPECIES = {
  prey: {
    coat: {
      label: 'Camouflage',
      impact: 'helpful',
      description: 'Closer coat match to the ground and vegetation lowers detection by predators.',
      reason: 'camouflage changed how often predators noticed prey in different terrain',
    },
    speed: {
      label: 'Speed',
      impact: 'helpful',
      description: 'Raises normal movement speed and helps prey open a gap early in a chase.',
      reason: 'speed changed how quickly prey could open distance during escapes',
    },
    stamina: {
      label: 'Stamina',
      impact: 'helpful',
      description: 'Slows reserve loss on rough ground and keeps prey moving after the first sprint.',
      reason: 'stamina changed how long prey could keep running before slowing down',
    },
    recovery: {
      label: 'Recovery',
      impact: 'helpful',
      description: 'Refills sprint reserve faster after running and helps prey recover between threats.',
      reason: 'recovery changed how quickly prey regained sprint reserve after hard movement',
    },
    efficiency: {
      label: 'Food efficiency',
      impact: 'helpful',
      description: 'Gets more energy from each patch of food and reduces the cost of day-to-day movement.',
      reason: 'food efficiency changed how well prey coped when food was limited',
    },
    instinct: {
      label: 'Vigilance',
      impact: 'helpful',
      description: 'Improves predator detection and shifts movement toward cover earlier.',
      reason: 'vigilance changed how early prey reacted to predators',
    },
    boldness: {
      label: 'Risk taking',
      impact: 'tradeoff',
      description: 'Keeps feeding and moving in exposed areas longer. It can help in food-poor habitats but often gets prey caught.',
      reason: 'risk taking changed whether prey kept feeding under danger or broke away early',
    },
  },
  predator: {
    coat: {
      label: 'Camouflage',
      impact: 'helpful',
      description: 'Helps predators stay hidden while closing on prey.',
      reason: 'camouflage changed how easily predators could approach without being noticed',
    },
    speed: {
      label: 'Speed',
      impact: 'helpful',
      description: 'Improves chase speed and helps close the final gap to prey.',
      reason: 'speed changed how often predators could close the distance before prey escaped',
    },
    stamina: {
      label: 'Stamina',
      impact: 'helpful',
      description: 'Slows reserve loss during chases and across rough ground.',
      reason: 'stamina changed how long predators could keep hunting before tiring',
    },
    recovery: {
      label: 'Recovery',
      impact: 'helpful',
      description: 'Refills chase reserve faster between hunts so predators can attempt more chases.',
      reason: 'recovery changed how quickly predators were ready to chase again',
    },
    efficiency: {
      label: 'Efficiency',
      impact: 'helpful',
      description: 'Reduces energy loss between kills and improves survival during quiet periods.',
      reason: 'efficiency changed how well predators retained energy between successful hunts',
    },
    instinct: {
      label: 'Tracking',
      impact: 'helpful',
      description: 'Improves detection of prey and helps follow scent activity near water and food.',
      reason: 'tracking changed how reliably predators found prey to pursue',
    },
    boldness: {
      label: 'Overcommitment',
      impact: 'tradeoff',
      description: 'Makes predators stick with hard chases longer. It can pay off on slow prey but often wastes energy on unwinnable pursuits.',
      reason: 'overcommitment changed whether predators gave up on difficult prey or burned energy chasing too long',
    },
  },
}

const TRAIT_LABELS = {
  prey: Object.fromEntries(
    Object.entries(TRAIT_GUIDE_BY_SPECIES.prey).map(([trait, entry]) => [trait, entry.label]),
  ),
  predator: Object.fromEntries(
    Object.entries(TRAIT_GUIDE_BY_SPECIES.predator).map(([trait, entry]) => [trait, entry.label]),
  ),
}

const TRAIT_REASONS = {
  prey: Object.fromEntries(
    Object.entries(TRAIT_GUIDE_BY_SPECIES.prey).map(([trait, entry]) => [trait, entry.reason]),
  ),
  predator: Object.fromEntries(
    Object.entries(TRAIT_GUIDE_BY_SPECIES.predator).map(([trait, entry]) => [trait, entry.reason]),
  ),
}

function createGenerationPerformance() {
  return {
    survivalTicks: 0,
    foodConsumed: 0,
    escapePressure: 0,
    predatorEscapes: 0,
    kills: 0,
    abandonedChases: 0,
    generationFitness: 0,
  }
}

function averageMetric(organisms, metric) {
  if (organisms.length === 0) {
    return 0
  }

  return organisms.reduce((sum, organism) => sum + (organism[metric] ?? 0), 0) / organisms.length
}

function getTraitEntriesForSpecies(traits, species = 'prey') {
  const labels = TRAIT_LABELS[species] ?? TRAIT_LABELS.prey

  return [
    [labels.coat, traits.coat],
    [labels.speed, traits.speed],
    [labels.stamina, traits.stamina],
    [labels.recovery, traits.recovery],
    [labels.efficiency, traits.efficiency],
    [labels.instinct, traits.instinct],
    [labels.boldness, traits.boldness],
  ]
}

function getLeadingTraitShift(shiftProfile = {}, species = 'prey') {
  return Object.entries(shiftProfile)
    .filter(([, value]) => Math.abs(value ?? 0) >= 0.005)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .map(([trait, value]) => ({
      trait,
      label: TRAIT_LABELS[species]?.[trait] ?? trait,
      reason: TRAIT_REASONS[species]?.[trait] ?? '',
      value,
    }))
}

let organismId = 1

function nextOrganismId() {
  organismId += 1
  return organismId
}

function getWaterStateAtCell(x, y, waterSources) {
  let water = 0
  let moisture = 0
  let primaryWaterSourceId = waterSources[0]?.id ?? null
  let strongestContribution = -Infinity

  waterSources.forEach((source) => {
    const remainingRatio = source.unlimited ? 1 : source.remainingLiters / source.capacityLiters
    const waterDistance =
      ((x - source.x) / source.radiusX) ** 2 +
      ((y - source.y) / source.radiusY) ** 2
    const waterContribution = clamp(1 - waterDistance, 0, 1) * remainingRatio
    const moistureContribution = clamp(1 - Math.sqrt(Math.max(waterDistance, 0)) / 2.4, 0, 1) * remainingRatio
    water = Math.max(water, waterContribution)
    moisture = Math.max(moisture, moistureContribution)

    if (moistureContribution > strongestContribution) {
      strongestContribution = moistureContribution
      primaryWaterSourceId = source.id
    }
  })

  return {
    water,
    moisture,
    primaryWaterSourceId,
  }
}

function makeTerrain(config, previousWaterSources = null) {
  const cells = []
  const seed = 10.37
  const sourceDefinitions = [
    {
      id: 'main-lake',
      label: 'Main lake',
      x: TERRAIN_BOUNDS.cols * 0.22,
      y: TERRAIN_BOUNDS.rows * 0.7,
      radiusX: TERRAIN_BOUNDS.cols * 0.13,
      radiusY: TERRAIN_BOUNDS.rows * 0.12,
      unlimited: true,
      capacityLiters: null,
    },
    {
      id: 'seasonal-pond',
      label: 'Seasonal pond',
      x: TERRAIN_BOUNDS.cols * 0.74,
      y: TERRAIN_BOUNDS.rows * 0.34,
      radiusX: TERRAIN_BOUNDS.cols * 0.08,
      radiusY: TERRAIN_BOUNDS.rows * 0.09,
      unlimited: false,
      capacityLiters: 950,
    },
  ]
  const previousById = new Map((previousWaterSources ?? []).map((source) => [source.id, source]))
  const waterSources = sourceDefinitions.map((source) => {
    const previous = previousById.get(source.id)
    return {
      ...source,
      remainingLiters: source.unlimited
        ? null
        : clamp(previous?.remainingLiters ?? source.capacityLiters, 0, source.capacityLiters),
      preyActivity: previous?.preyActivity ?? 0,
      predatorActivity: previous?.predatorActivity ?? 0,
    }
  })

  for (let y = 0; y < TERRAIN_BOUNDS.rows; y += 1) {
    for (let x = 0; x < TERRAIN_BOUNDS.cols; x += 1) {
      const nx = x / TERRAIN_BOUNDS.cols
      const ny = y / TERRAIN_BOUNDS.rows
      const { water, moisture, primaryWaterSourceId } = getWaterStateAtCell(x, y, waterSources)

      const broadHeight = smoothNoise(nx * 3.4, ny * 3.4, seed)
      const sharpHeight = smoothNoise(nx * 8.6, ny * 8.6, seed + 4)
      const ridge = Math.sin(nx * Math.PI * 1.5 + 0.5) * 0.15 + Math.cos(ny * Math.PI * 1.1) * 0.08
      const height = clamp(
        broadHeight * 0.58 + sharpHeight * 0.3 + ridge + config.terrainRoughness * 0.2 - water * 0.22,
        0,
        1,
      )

      const rockiness = clamp(
        height * 0.75 + smoothNoise(nx * 11.5, ny * 9.4, seed + 8) * 0.3 - water * 0.55,
        0,
        1,
      )
      const vegetationBase = clamp(
        config.vegetationDensity * 0.58 +
          smoothNoise(nx * 7.4, ny * 6.8, seed + 12) * 0.45 +
          moisture * 0.4 -
          rockiness * 0.24,
        0,
        1,
      )
      const foodCapacity = clamp(
        config.foodDensity * 0.48 + vegetationBase * 0.38 + moisture * 0.28 - config.climateSeverity * 0.18,
        0.02,
        1,
      )

      cells.push({
        x,
        y,
        height,
        rockiness,
        vegetation: vegetationBase,
        moisture,
        water,
        primaryWaterSourceId,
        foodCapacity,
        food: clamp(foodCapacity * randomInRange(0.72, 1), 0, 1),
        preyScent: 0,
        slope: 0,
      })
    }
  }

  for (let y = 0; y < TERRAIN_BOUNDS.rows; y += 1) {
    for (let x = 0; x < TERRAIN_BOUNDS.cols; x += 1) {
      const cell = cells[y * TERRAIN_BOUNDS.cols + x]
      const right = cells[y * TERRAIN_BOUNDS.cols + Math.min(x + 1, TERRAIN_BOUNDS.cols - 1)]
      const down = cells[Math.min(y + 1, TERRAIN_BOUNDS.rows - 1) * TERRAIN_BOUNDS.cols + x]
      cell.slope = clamp(Math.abs(cell.height - right.height) + Math.abs(cell.height - down.height), 0, 1)
    }
  }

  return {
    cols: TERRAIN_BOUNDS.cols,
    rows: TERRAIN_BOUNDS.rows,
    cells,
    waterSources,
  }
}

function createPrey() {
  return {
    id: nextOrganismId(),
    species: 'prey',
    x: randomInRange(1, TERRAIN_BOUNDS.cols - 2),
    y: randomInRange(TERRAIN_BOUNDS.rows * 0.35, TERRAIN_BOUNDS.rows - 2),
    z: 0,
    energy: randomInRange(0.72, 1.05),
    hydration: randomInRange(0.74, 1.04),
    age: 0,
    alive: true,
    homeX: randomInRange(TERRAIN_BOUNDS.cols * 0.08, TERRAIN_BOUNDS.cols * 0.92),
    homeY: randomInRange(TERRAIN_BOUNDS.rows * 0.18, TERRAIN_BOUNDS.rows * 0.92),
    wanderAngle: randomInRange(0, Math.PI * 2),
    facingAngle: randomInRange(0, Math.PI * 2),
    targetX: null,
    targetY: null,
    targetTimer: 0,
    preferredWaterSourceId: null,
    waterSourceCommitment: 0,
    staminaReserve: randomInRange(0.78, 1.04),
    ...createGenerationPerformance(),
    traits: {
      coat: randomInRange(0.18, 0.82),
      speed: randomInRange(0.24, 0.82),
      stamina: randomInRange(0.26, 0.82),
      recovery: randomInRange(0.24, 0.82),
      efficiency: randomInRange(0.22, 0.88),
      instinct: randomInRange(0.32, 0.92),
      boldness: randomInRange(0.1, 0.86),
    },
  }
}

function createPredator() {
  return {
    id: nextOrganismId(),
    species: 'predator',
    x: randomInRange(1, TERRAIN_BOUNDS.cols - 2),
    y: randomInRange(1, TERRAIN_BOUNDS.rows - 2),
    z: 0,
    energy: randomInRange(0.76, 1.02),
    hydration: randomInRange(0.72, 1),
    age: 0,
    alive: true,
    patrolBias: randomInRange(0.7, 1.2),
    homeX: randomInRange(TERRAIN_BOUNDS.cols * 0.14, TERRAIN_BOUNDS.cols * 0.9),
    homeY: randomInRange(TERRAIN_BOUNDS.rows * 0.1, TERRAIN_BOUNDS.rows * 0.9),
    wanderAngle: randomInRange(0, Math.PI * 2),
    facingAngle: randomInRange(0, Math.PI * 2),
    targetX: null,
    targetY: null,
    targetTimer: 0,
    preferredWaterSourceId: null,
    waterSourceCommitment: 0,
    focusId: null,
    focusTicks: 0,
    avoidPreyId: null,
    avoidPreyTicks: 0,
    chaseTicks: 0,
    failedChaseTicks: 0,
    staminaReserve: randomInRange(0.74, 1),
    ...createGenerationPerformance(),
    traits: {
      coat: randomInRange(0.42, 0.72),
      speed: randomInRange(0.55, 0.9),
      stamina: randomInRange(0.5, 0.84),
      recovery: randomInRange(0.28, 0.76),
      efficiency: randomInRange(0.2, 0.72),
      instinct: randomInRange(0.36, 0.92),
      boldness: randomInRange(0.14, 0.88),
    },
  }
}

function averageTraitValue(organisms, trait) {
  if (organisms.length === 0) {
    return 0
  }

  return organisms.reduce((sum, organism) => sum + organism.traits[trait], 0) / organisms.length
}

function averageEnergy(organisms) {
  if (organisms.length === 0) {
    return 0
  }

  return organisms.reduce((sum, organism) => sum + organism.energy, 0) / organisms.length
}

function averageTraitProfile(organisms) {
  return {
    coat: averageTraitValue(organisms, 'coat'),
    speed: averageTraitValue(organisms, 'speed'),
    stamina: averageTraitValue(organisms, 'stamina'),
    recovery: averageTraitValue(organisms, 'recovery'),
    efficiency: averageTraitValue(organisms, 'efficiency'),
    instinct: averageTraitValue(organisms, 'instinct'),
    boldness: averageTraitValue(organisms, 'boldness'),
  }
}

function summarizeSelection(species, shiftProfile, reproductionStats) {
  const leadingShift = getLeadingTraitShift(shiftProfile, species)[0] ?? null
  const topQuartileShare = Math.round((reproductionStats.topQuartileShare ?? 0) * 100)
  const averageFitness = (reproductionStats.averageFitness ?? 0).toFixed(2)

  if (!leadingShift) {
    return `${species === 'prey' ? 'Prey' : 'Predator'} survivors still reproduced unequally: the fittest quarter produced ${topQuartileShare}% of offspring, with average fitness ${averageFitness}. Selection acted on overall fitness even without one dominant trait shift.`
  }

  const direction = leadingShift.value >= 0 ? 'Higher' : 'Lower'

  return `${direction} ${leadingShift.label.toLowerCase()} shaped survival: ${leadingShift.reason}. The fittest quarter of ${species === 'prey' ? 'survivors' : 'predator survivors'} produced ${topQuartileShare}% of offspring, with average fitness ${averageFitness}.`
}

function traitDeltaProfile(fromTraits, toTraits) {
  return {
    coat: (toTraits?.coat ?? 0) - (fromTraits?.coat ?? 0),
    speed: (toTraits?.speed ?? 0) - (fromTraits?.speed ?? 0),
    stamina: (toTraits?.stamina ?? 0) - (fromTraits?.stamina ?? 0),
    recovery: (toTraits?.recovery ?? 0) - (fromTraits?.recovery ?? 0),
    efficiency: (toTraits?.efficiency ?? 0) - (fromTraits?.efficiency ?? 0),
    instinct: (toTraits?.instinct ?? 0) - (fromTraits?.instinct ?? 0),
    boldness: (toTraits?.boldness ?? 0) - (fromTraits?.boldness ?? 0),
  }
}

function weightedPick(items, getWeight) {
  const totalWeight = items.reduce((sum, item) => sum + getWeight(item), 0)
  if (totalWeight <= 0) {
    return items[Math.floor(Math.random() * items.length)]
  }

  let threshold = Math.random() * totalWeight
  for (const item of items) {
    threshold -= getWeight(item)
    if (threshold <= 0) {
      return item
    }
  }

  return items[items.length - 1]
}

function inheritTrait(a, b, mutationRate) {
  const inherited = (a + b) / 2
  const mutation = randomInRange(-mutationRate, mutationRate)
  return clamp(inherited + mutation, 0, 1)
}

function createOffspring(species, parentA, parentB, mutationRate) {
  return {
    id: nextOrganismId(),
    species,
    x: clamp((parentA.x + parentB.x) / 2 + randomInRange(-0.7, 0.7), 0.5, TERRAIN_BOUNDS.cols - 1.5),
    y: clamp((parentA.y + parentB.y) / 2 + randomInRange(-0.7, 0.7), 0.5, TERRAIN_BOUNDS.rows - 1.5),
    z: 0,
    energy: randomInRange(0.64, 0.88),
    hydration: randomInRange(0.68, 0.9),
    age: 0,
    alive: true,
    homeX: clamp((parentA.homeX + parentB.homeX) / 2 + randomInRange(-1.3, 1.3), 1, TERRAIN_BOUNDS.cols - 2),
    homeY: clamp((parentA.homeY + parentB.homeY) / 2 + randomInRange(-1.1, 1.1), 1, TERRAIN_BOUNDS.rows - 2),
    wanderAngle: randomInRange(0, Math.PI * 2),
    facingAngle: randomInRange(0, Math.PI * 2),
    targetX: null,
    targetY: null,
    targetTimer: 0,
    preferredWaterSourceId: null,
    waterSourceCommitment: 0,
    focusId: null,
    focusTicks: 0,
    avoidPreyId: null,
    avoidPreyTicks: 0,
    chaseTicks: 0,
    failedChaseTicks: 0,
    staminaReserve: randomInRange(0.76, 0.98),
    ...createGenerationPerformance(),
    patrolBias: clamp(
      (((parentA.patrolBias ?? 1) + (parentB.patrolBias ?? 1)) / 2) + randomInRange(-0.05, 0.05),
      0.6,
      1.3,
    ),
    traits: {
      coat: inheritTrait(parentA.traits.coat, parentB.traits.coat, mutationRate),
      speed: inheritTrait(parentA.traits.speed, parentB.traits.speed, mutationRate),
      stamina: inheritTrait(parentA.traits.stamina, parentB.traits.stamina, mutationRate),
      recovery: inheritTrait(parentA.traits.recovery, parentB.traits.recovery, mutationRate * 0.9),
      efficiency: inheritTrait(parentA.traits.efficiency, parentB.traits.efficiency, mutationRate * 0.85),
      instinct: inheritTrait(parentA.traits.instinct, parentB.traits.instinct, mutationRate),
      boldness: inheritTrait(parentA.traits.boldness, parentB.traits.boldness, mutationRate * 0.92),
    },
  }
}

export class NaturalSelectionSimulation {
  constructor(config = DEFAULT_CONFIG) {
    this.reset(config)
  }

  reset(config = this.config ?? DEFAULT_CONFIG) {
    organismId = 1
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    }
    this.config.simSpeed = clamp(this.config.simSpeed, SIM_SPEED_MIN, SIM_SPEED_MAX)

    this.generation = 1
    this.ticksInGeneration = 0
    this.stepAccumulator = 0
    this.terrainHydrologyDirty = false
    this.history = []
    this.lastGenerationReport = null
    this.prey = Array.from({ length: this.config.initialPreyPopulation }, () => createPrey())
    this.predators = Array.from({ length: this.config.initialPredatorPopulation }, () => createPredator())
    this.terrain = makeTerrain(this.config, this.terrain?.waterSources)
    this.prey.forEach((organism) => this.placeOrganismOnLand(organism, { prefer: 'prey' }))
    this.predators.forEach((organism) => this.placeOrganismOnLand(organism, { prefer: 'predator' }))
    this.generationStats = this.createGenerationStats()
    this.recordHistory()
  }

  createGenerationStats() {
    const preyAlive = this.prey.filter((organism) => organism.alive)
    const predatorsAlive = this.predators.filter((organism) => organism.alive)

    return {
      preyStart: preyAlive.length,
      predatorStart: predatorsAlive.length,
      preyStartTraits: averageTraitProfile(preyAlive),
      predatorStartTraits: averageTraitProfile(predatorsAlive),
      preyDeathsFromPredation: 0,
      preyDeathsFromStarvation: 0,
      predatorDeaths: 0,
      totalFoodConsumed: 0,
      totalPredatorEnergy: 0,
      preySurvivalRate: this.history.at(-1)?.preySurvivalRate ?? 1,
      predationRate: this.history.at(-1)?.predationRate ?? 0,
    }
  }

  updateConfig(patch) {
    const previousConfig = { ...this.config }
    this.config = {
      ...this.config,
      ...patch,
    }
    this.config.simSpeed = clamp(this.config.simSpeed, SIM_SPEED_MIN, SIM_SPEED_MAX)

    const terrainSettingsChanged =
      previousConfig.foodDensity !== this.config.foodDensity ||
      previousConfig.climateSeverity !== this.config.climateSeverity ||
      previousConfig.terrainRoughness !== this.config.terrainRoughness ||
      previousConfig.vegetationDensity !== this.config.vegetationDensity

    if (terrainSettingsChanged) {
      this.terrain = makeTerrain(this.config, this.terrain?.waterSources)
      this.prey.forEach((organism) => {
        if (this.isWaterCell(this.getCellAt(organism.x, organism.y))) {
          this.placeOrganismOnLand(organism, { prefer: 'prey', nearX: organism.homeX, nearY: organism.homeY, maxDistance: 8 })
        } else {
          this.syncHeight(organism)
        }
      })
      this.predators.forEach((organism) => {
        if (this.isWaterCell(this.getCellAt(organism.x, organism.y))) {
          this.placeOrganismOnLand(organism, { prefer: 'predator', nearX: organism.homeX, nearY: organism.homeY, maxDistance: 10 })
        } else {
          this.syncHeight(organism)
        }
      })
    }

    if (previousConfig.initialPredatorPopulation !== this.config.initialPredatorPopulation) {
      const livePredators = this.predators.filter((organism) => organism.alive)
      const delta = Math.round(this.config.initialPredatorPopulation - livePredators.length)

      if (delta > 0) {
        for (let index = 0; index < delta; index += 1) {
          const predator = createPredator()
          this.placeOrganismOnLand(predator, { prefer: 'predator' })
          this.predators.push(predator)
        }
      } else if (delta < 0) {
        livePredators.slice(0, Math.abs(delta)).forEach((organism) => {
          organism.alive = false
        })
      }
    }

    if (previousConfig.initialPreyPopulation !== this.config.initialPreyPopulation) {
      const livePrey = this.prey.filter((organism) => organism.alive)
      const delta = Math.round(this.config.initialPreyPopulation - livePrey.length)

      if (delta > 0) {
        for (let index = 0; index < delta; index += 1) {
          const prey = createPrey()
          this.placeOrganismOnLand(prey, { prefer: 'prey' })
          this.prey.push(prey)
        }
      } else if (delta < 0) {
        livePrey.slice(0, Math.abs(delta)).forEach((organism) => {
          organism.alive = false
        })
      }
    }
  }

  getCellAt(x, y) {
    const clampedX = clamp(Math.floor(x), 0, TERRAIN_BOUNDS.cols - 1)
    const clampedY = clamp(Math.floor(y), 0, TERRAIN_BOUNDS.rows - 1)
    return this.terrain.cells[clampedY * TERRAIN_BOUNDS.cols + clampedX]
  }

  getWaterSourceById(sourceId) {
    return this.terrain.waterSources.find((source) => source.id === sourceId) ?? null
  }

  syncTerrainHydrology() {
    this.terrain.cells.forEach((cell) => {
      const waterState = getWaterStateAtCell(cell.x, cell.y, this.terrain.waterSources)
      cell.water = waterState.water
      cell.moisture = waterState.moisture
      cell.primaryWaterSourceId = waterState.primaryWaterSourceId
    })
  }

  syncHeight(organism) {
    const cell = this.getCellAt(organism.x, organism.y)
    organism.z = cell?.height ?? 0
  }

  chooseSpawnCell(options = {}) {
    const { prefer = 'prey', nearX = null, nearY = null, maxDistance = Infinity, distanceWeight = null } = options
    let bestCell = null
    let bestScore = -Infinity
    const effectiveDistanceWeight = distanceWeight ?? (prefer === 'predator' ? 0.06 : 0.08)

    this.terrain.cells.forEach((cell) => {
      if (this.isWaterCell(cell)) {
        return
      }

      const distancePenalty =
        nearX === null || nearY === null ? 0 : Math.hypot(cell.x + 0.5 - nearX, cell.y + 0.5 - nearY)
      if (distancePenalty > maxDistance) {
        return
      }

      const preyScore =
        cell.foodCapacity * 1.1 +
        cell.moisture * 0.95 +
        cell.vegetation * 0.35 -
        cell.slope * 0.62 -
        cell.rockiness * 0.14 -
        distancePenalty * effectiveDistanceWeight
      const predatorScore =
        cell.moisture * 0.82 +
        cell.foodCapacity * 0.54 +
        cell.height * 0.2 -
        cell.slope * 0.42 -
        cell.rockiness * 0.08 -
        distancePenalty * effectiveDistanceWeight

      const score = (prefer === 'predator' ? predatorScore : preyScore) + randomInRange(-0.05, 0.05)
      if (score > bestScore) {
        bestScore = score
        bestCell = cell
      }
    })

    return bestCell ?? this.terrain.cells.find((cell) => !this.isWaterCell(cell)) ?? this.terrain.cells[0]
  }

  placeOrganismOnLand(organism, options = {}) {
    const cell = this.chooseSpawnCell(options)
    organism.x = clampWorldX(cell.x + randomInRange(0.18, 0.82))
    organism.y = clampWorldY(cell.y + randomInRange(0.18, 0.82))

    if (organism.homeX !== undefined) {
      const homeCell = this.chooseSpawnCell({
        prefer: organism.species,
        nearX: organism.x,
        nearY: organism.y,
        maxDistance: organism.species === 'predator' ? 9 : 7,
      })
      organism.homeX = clamp(homeCell.x + 0.5, 1, TERRAIN_BOUNDS.cols - 2)
      organism.homeY = clamp(homeCell.y + 0.5, 1, TERRAIN_BOUNDS.rows - 2)
    }

    this.syncHeight(organism)
  }

  forceOrganismToLand(organism, maxRadius = 8) {
    const currentCell = this.getCellAt(organism.x, organism.y)
    if (!currentCell || !this.isWaterCell(currentCell)) {
      return false
    }

    let bestCell = null
    let bestScore = -Infinity

    for (let offsetY = -maxRadius; offsetY <= maxRadius; offsetY += 1) {
      for (let offsetX = -maxRadius; offsetX <= maxRadius; offsetX += 1) {
        const cell = this.getCellAt(organism.x + offsetX, organism.y + offsetY)
        if (!cell || this.isWaterCell(cell)) {
          continue
        }

        const distance = Math.hypot(offsetX, offsetY)
        const score =
          (organism.species === 'predator'
            ? cell.moisture * 0.7 + cell.foodCapacity * 0.35
            : cell.moisture * 0.85 + cell.foodCapacity * 0.8 + cell.vegetation * 0.18) -
          distance * 0.14 -
          cell.slope * 0.4

        if (score > bestScore) {
          bestScore = score
          bestCell = cell
        }
      }
    }

    if (!bestCell) {
      this.placeOrganismOnLand(organism, { prefer: organism.species, nearX: organism.x, nearY: organism.y, maxDistance: maxRadius + 2 })
      return true
    }

    organism.x = clampWorldX(bestCell.x + randomInRange(0.22, 0.78))
    organism.y = clampWorldY(bestCell.y + randomInRange(0.22, 0.78))
    this.syncHeight(organism)
    return true
  }

  getBoundaryRepulsion(organism, margin = 1.4) {
    const repulsion = { x: 0, y: 0 }

    if (organism.x < MIN_WORLD_X + margin) {
      repulsion.x += (MIN_WORLD_X + margin - organism.x) / margin
    } else if (organism.x > MAX_WORLD_X - margin) {
      repulsion.x -= (organism.x - (MAX_WORLD_X - margin)) / margin
    }

    if (organism.y < MIN_WORLD_Y + margin) {
      repulsion.y += (MIN_WORLD_Y + margin - organism.y) / margin
    } else if (organism.y > MAX_WORLD_Y - margin) {
      repulsion.y -= (organism.y - (MAX_WORLD_Y - margin)) / margin
    }

    return repulsion
  }

  getBoundaryPenalty(x, y, margin = 1.1) {
    const nearestEdge = Math.min(x - MIN_WORLD_X, MAX_WORLD_X - x, y - MIN_WORLD_Y, MAX_WORLD_Y - y)
    if (nearestEdge >= margin) {
      return 0
    }

    return ((margin - nearestEdge) / margin) * 0.8
  }

  setTargetWithinBounds(organism, x, y, padding = 0.45) {
    organism.targetX = clamp(x, MIN_WORLD_X + padding, MAX_WORLD_X - padding)
    organism.targetY = clamp(y, MIN_WORLD_Y + padding, MAX_WORLD_Y - padding)
  }

  tick(elapsedMs = 16) {
    this.stepAccumulator += (elapsedMs / 16.67) * this.config.simSpeed * 0.42

    while (this.stepAccumulator >= 1) {
      this.step()
      this.stepAccumulator -= 1

      if (this.ticksInGeneration >= this.config.generationLength) {
        this.finishGeneration()
      }
    }
  }

  completeGeneration() {
    while (this.ticksInGeneration < this.config.generationLength) {
      this.step()
    }
    this.finishGeneration()
  }

  step() {
    const livePrey = this.prey.filter((organism) => organism.alive)
    const livePredators = this.predators.filter((organism) => organism.alive)
    this.terrainHydrologyDirty = false

    this.regrowFood()
    livePrey.forEach((organism) => this.updatePrey(organism, livePredators, livePrey))
    if (this.terrainHydrologyDirty) {
      this.syncTerrainHydrology()
      this.terrainHydrologyDirty = false
    }
    const refreshedLivePrey = this.prey.filter((organism) => organism.alive)
    this.updateWaterSourceActivity(refreshedLivePrey, livePredators)
    this.updatePreyScent(refreshedLivePrey)
    const claimedPreyById = new Map()
    this.predators
      .filter((organism) => organism.alive)
      .forEach((organism) => this.updatePredator(organism, refreshedLivePrey, claimedPreyById))
    if (this.terrainHydrologyDirty) {
      this.syncTerrainHydrology()
      this.terrainHydrologyDirty = false
    }

    this.ticksInGeneration += 1
  }

  regrowFood() {
    const regrowthRate = 0.0024 * (1 - this.config.climateSeverity * 0.55)

    this.terrain.cells.forEach((cell) => {
      cell.food = clamp(
        cell.food + cell.foodCapacity * (regrowthRate + cell.moisture * 0.0018 + cell.water * 0.0025),
        0,
        cell.foodCapacity,
      )
    })
  }

  updateWaterSourceActivity(preyPopulation, predatorPopulation) {
    this.terrain.waterSources.forEach((source) => {
      source.preyActivity *= 0.9
      source.predatorActivity *= 0.9
      source.preyActivity += this.getPopulationNearWaterSource(source, preyPopulation) * 0.22
      source.predatorActivity += this.getPopulationNearWaterSource(source, predatorPopulation) * 0.22
    })
  }

  updatePreyScent(preyPopulation) {
    this.terrain.cells.forEach((cell) => {
      cell.preyScent *= this.isWaterCell(cell) ? 0.8 : 0.92
    })

    preyPopulation.forEach((prey) => {
      if (!prey.alive) {
        return
      }

      const centerX = Math.floor(prey.x)
      const centerY = Math.floor(prey.y)
      const intensity =
        0.14 +
        prey.energy * 0.14 +
        prey.traits.speed * 0.05 +
        (1 - prey.traits.efficiency) * 0.18 +
        prey.traits.boldness * 0.12 -
        prey.traits.recovery * 0.05

      for (let offsetY = -2; offsetY <= 2; offsetY += 1) {
        for (let offsetX = -2; offsetX <= 2; offsetX += 1) {
          const cell = this.getCellAt(centerX + offsetX, centerY + offsetY)
          if (!cell || this.isWaterCell(cell)) {
            continue
          }

          const distance = Math.hypot(offsetX, offsetY)
          if (distance > 2.3) {
            continue
          }

          const deposit = intensity * clamp(1 - distance / 2.5, 0.12, 1)
          cell.preyScent = clamp(cell.preyScent + deposit, 0, 2.4)
        }
      }
    })
  }

  isWaterCell(cell) {
    return Boolean(cell && cell.water > WATER_BLOCK_LEVEL)
  }

  isDrinkableCell(cell) {
    return Boolean(cell && cell.water <= WATER_BLOCK_LEVEL && cell.moisture >= SHORE_MOISTURE_LEVEL)
  }

  rehydrate(organism, cell) {
    if (!cell) {
      return
    }

    const shoreGain = this.isDrinkableCell(cell) ? 0.007 + cell.moisture * 0.008 : cell.moisture * 0.0012
    organism.hydration = clamp((organism.hydration ?? 1) + shoreGain, 0, 1.2)

    if (this.isDrinkableCell(cell)) {
      const source = this.getWaterSourceById(cell.primaryWaterSourceId)
      if (source && !source.unlimited) {
        const usageLiters = organism.species === 'predator' ? 0.24 : 0.14
        const nextRemainingLiters = clamp(source.remainingLiters - usageLiters, 0, source.capacityLiters)
        if (nextRemainingLiters !== source.remainingLiters) {
          source.remainingLiters = nextRemainingLiters
          this.terrainHydrologyDirty = true
        }
      }
    }
  }

  updateStaminaReserve(organism, { exertion = 0, recoveryBias = 1 } = {}) {
    const drain =
      Math.max(0, exertion) *
        (0.0032 +
          (1 - organism.traits.stamina) * 0.0036 +
          organism.traits.speed * 0.0013 +
          organism.traits.boldness * (organism.species === 'predator' ? 0.0011 : 0.00055)) +
      this.config.climateSeverity * 0.0015
    const recovery =
      Math.max(0, recoveryBias) *
      Math.max(
        0,
        0.0018 +
          organism.traits.recovery * 0.0041 +
          organism.traits.stamina * 0.0014 -
          this.config.climateSeverity * 0.0007,
      )

    organism.staminaReserve = clamp((organism.staminaReserve ?? 0.82) + recovery - drain, 0.04, 1.18)
    return organism.staminaReserve
  }

  getReserveSpeedFactor(organism, urgency = 0) {
    const reserve = clamp(organism.staminaReserve ?? 0.78, 0, 1.2)
    const reservePenalty = reserve < 0.28 ? lerp(0.58, 1, reserve / 0.28) : 1

    return clamp(
      (0.54 +
        reserve * 0.62 +
        organism.traits.stamina * 0.08 +
        organism.traits.recovery * 0.05 +
        urgency * 0.08) *
        reservePenalty,
      0.38,
      1.18,
    )
  }

  abandonPredatorChase(predator, preyId = null) {
    predator.focusId = null
    predator.focusTicks = 0
    predator.targetX = null
    predator.targetY = null
    predator.targetTimer = 0
    predator.chaseTicks = 0
    predator.failedChaseTicks = 0

    if (preyId !== null) {
      predator.avoidPreyId = preyId
      predator.avoidPreyTicks = Math.round(28 + (1 - predator.traits.boldness) * 38)
      predator.abandonedChases += 1
    }
  }

  moveOrganism(organism, desired, speed) {
    if (this.forceOrganismToLand(organism)) {
      return
    }

    const wallRepulsion = this.getBoundaryRepulsion(organism)
    const adjustedDesired = {
      x: desired.x + wallRepulsion.x * (0.9 + speed * 12),
      y: desired.y + wallRepulsion.y * (0.9 + speed * 12),
    }

    const magnitude = Math.hypot(adjustedDesired.x, adjustedDesired.y)
    if (magnitude < 0.0001) {
      return
    }

    const baseAngle = Math.atan2(adjustedDesired.y, adjustedDesired.x)
    const currentFacing = organism.facingAngle ?? baseAngle
    const maxTurn = organism.species === 'predator' ? 0.17 : 0.21
    const preferredAngle = rotateTowardsAngle(currentFacing, baseAngle, maxTurn)
    const offsets = [0, Math.PI / 10, -Math.PI / 10, Math.PI / 5, -Math.PI / 5, Math.PI / 2.6, -Math.PI / 2.6]
    let bestMove = null

    offsets.forEach((offset) => {
      const angle = preferredAngle + offset
      const nextX = clampWorldX(organism.x + Math.cos(angle) * speed)
      const nextY = clampWorldY(organism.y + Math.sin(angle) * speed)
      const nextCell = this.getCellAt(nextX, nextY)
      const movementDistance = Math.hypot(nextX - organism.x, nextY - organism.y)

      if (!nextCell || this.isWaterCell(nextCell) || movementDistance < speed * 0.45) {
        return
      }

      const score =
        -Math.abs(offset) * 0.85 -
        Math.abs(normalizeAngle(angle - preferredAngle)) * 0.38 -
        nextCell.slope * 0.68 -
        nextCell.rockiness * 0.18 +
        nextCell.moisture * 0.05 -
        this.getBoundaryPenalty(nextX, nextY)

      if (!bestMove || score > bestMove.score) {
        bestMove = { x: nextX, y: nextY, angle, score }
      }
    })

    if (bestMove) {
      organism.facingAngle = rotateTowardsAngle(currentFacing, bestMove.angle, maxTurn)
      organism.x = bestMove.x
      organism.y = bestMove.y
      return
    }

    const rememberedTarget =
      organism.targetX !== null && organism.targetY !== null
        ? { x: organism.targetX - organism.x, y: organism.targetY - organism.y }
        : { x: 0, y: 0 }
    const rememberedMagnitude = Math.hypot(rememberedTarget.x, rememberedTarget.y)
    if (rememberedMagnitude > 0.001) {
      const nextX = clampWorldX(organism.x + (rememberedTarget.x / rememberedMagnitude) * speed * 0.4)
      const nextY = clampWorldY(organism.y + (rememberedTarget.y / rememberedMagnitude) * speed * 0.4)
      const nextCell = this.getCellAt(nextX, nextY)
      if (nextCell && !this.isWaterCell(nextCell) && Math.hypot(nextX - organism.x, nextY - organism.y) >= speed * 0.25) {
        const targetAngle = Math.atan2(nextY - organism.y, nextX - organism.x)
        organism.facingAngle = rotateTowardsAngle(currentFacing, targetAngle, maxTurn)
        organism.x = nextX
        organism.y = nextY
        return
      }

      organism.targetX = null
      organism.targetY = null
      organism.targetTimer = 0
    }

    const shoreVector = this.findWaterVector(organism, 5)
    const shoreMagnitude = Math.hypot(shoreVector.x, shoreVector.y)
    if (shoreMagnitude > 0.001) {
      const nextX = clampWorldX(organism.x + (shoreVector.x / shoreMagnitude) * speed * 0.35)
      const nextY = clampWorldY(organism.y + (shoreVector.y / shoreMagnitude) * speed * 0.35)
      const nextCell = this.getCellAt(nextX, nextY)
      if (nextCell && !this.isWaterCell(nextCell) && Math.hypot(nextX - organism.x, nextY - organism.y) >= speed * 0.2) {
        const targetAngle = Math.atan2(nextY - organism.y, nextX - organism.x)
        organism.facingAngle = rotateTowardsAngle(currentFacing, targetAngle, maxTurn)
        organism.x = nextX
        organism.y = nextY
      }
    }
  }

  findResourceHotspot(organism, options = {}) {
    const {
      prefer = 'prey',
      nearX = organism.x,
      nearY = organism.y,
      scope = 'regional',
      distanceWeight = null,
    } = options

    const radius = scope === 'global' ? Infinity : prefer === 'predator' ? 12 : 10
    return this.chooseSpawnCell({
      prefer,
      nearX,
      nearY,
      maxDistance: radius,
      distanceWeight,
    })
  }

  getFoodAvailabilityNearWaterSource(source) {
    let total = 0
    let weightTotal = 0

    this.terrain.cells.forEach((cell) => {
      if (this.isWaterCell(cell)) {
        return
      }

      const normalizedDistance = Math.hypot((cell.x + 0.5 - source.x) / source.radiusX, (cell.y + 0.5 - source.y) / source.radiusY)
      if (normalizedDistance > 2.7) {
        return
      }

      const weight = clamp(1 - normalizedDistance / 2.7, 0.08, 1)
      total += (cell.food * 0.65 + cell.foodCapacity * 0.35 + cell.vegetation * 0.22) * weight
      weightTotal += weight
    })

    return weightTotal > 0 ? total / weightTotal : 0
  }

  getPopulationNearWaterSource(source, population) {
    return population.reduce((count, organism) => {
      if (!organism.alive) {
        return count
      }

      const distance = Math.hypot((organism.x - source.x) / source.radiusX, (organism.y - source.y) / source.radiusY)
      return distance <= 2.4 ? count + 1 : count
    }, 0)
  }

  chooseWaterSourceFor(organism, oppositePopulation = [], samePopulation = []) {
    const rankedSources = this.terrain.waterSources.map((source) => {
      const remainingRatio = source.unlimited ? 1 : source.remainingLiters / source.capacityLiters
      const distance = Math.hypot(organism.x - source.x, organism.y - source.y)
      const oppositeCount = this.getPopulationNearWaterSource(source, oppositePopulation)
      const sameCount = this.getPopulationNearWaterSource(source, samePopulation)
      const nearbyFood = this.getFoodAvailabilityNearWaterSource(source)
      const commitmentBonus = organism.preferredWaterSourceId === source.id ? 0.12 + (organism.waterSourceCommitment ?? 0) * 0.007 : 0

      const score = organism.species === 'prey'
        ? nearbyFood * 1.28 +
          remainingRatio * 0.36 -
          source.predatorActivity * 1.34 -
          oppositeCount * 0.28 -
          sameCount * 0.34 -
          distance * 0.028 +
          commitmentBonus
        : source.preyActivity * 1.42 +
          oppositeCount * 0.62 +
          nearbyFood * 0.12 +
          remainingRatio * 0.08 -
          source.predatorActivity * 0.28 -
          sameCount * 0.52 -
          distance * 0.03 +
          (source.id === 'seasonal-pond' ? source.preyActivity * 0.24 : 0) +
          commitmentBonus

      return { source, score }
    })
    rankedSources.sort((a, b) => b.score - a.score)

    const bestOption = rankedSources[0]
    const committedOption = rankedSources.find((entry) => entry.source.id === organism.preferredWaterSourceId)

    if (organism.species === 'predator' && committedOption && bestOption) {
      const committedSource = committedOption.source
      const committedPreyCount = this.getPopulationNearWaterSource(committedSource, oppositePopulation)
      const bestPreyCount = this.getPopulationNearWaterSource(bestOption.source, oppositePopulation)
      const sourceHasGoneCold = committedPreyCount === 0 && committedSource.preyActivity < 0.28
      const strongerAlternativeExists =
        bestOption.source.id !== committedSource.id &&
        (bestOption.source.preyActivity > committedSource.preyActivity + 0.18 || bestPreyCount > committedPreyCount)

      if (sourceHasGoneCold && strongerAlternativeExists) {
        organism.waterSourceCommitment = 0
      }
    }

    let selectedSource = bestOption.source
    if (
      committedOption &&
      (organism.waterSourceCommitment ?? 0) > 0 &&
      committedOption.score >= bestOption.score - 0.08
    ) {
      selectedSource = committedOption.source
      organism.waterSourceCommitment = Math.max(0, (organism.waterSourceCommitment ?? 0) - 1)
    } else if (organism.preferredWaterSourceId === bestOption.source.id) {
      organism.waterSourceCommitment = Math.min((organism.waterSourceCommitment ?? 0) + 1, 8)
    } else {
      organism.preferredWaterSourceId = bestOption.source.id
      organism.waterSourceCommitment = 5
    }

    return selectedSource
  }

  findPredatorThreat(prey, predators) {
    let bestThreat = null
    const awarenessBase =
      2.55 +
      prey.traits.instinct * 2.3 +
      prey.traits.speed * 0.82 +
      prey.traits.recovery * 0.38 -
      prey.traits.boldness * 0.72

    predators.forEach((predator) => {
      if (!predator.alive) {
        return
      }

      const predatorCell = this.getCellAt(predator.x, predator.y)
      const predatorConcealment = this.calculateConcealment(predator, predatorCell)
      const awarenessRadius = awarenessBase + (1 - predatorConcealment) * 1.8
      const distance = distanceBetween(prey, predator)

      if (distance > awarenessRadius) {
        return
      }

      const threat = clamp(
        (1 - distance / awarenessRadius) *
          (0.68 +
            predator.traits.speed * 0.28 +
            predator.traits.instinct * 0.26 +
            predator.energy * 0.08 +
            predator.staminaReserve * 0.12),
        0,
        1.5,
      )

      if (!bestThreat || threat > bestThreat.threat) {
        bestThreat = { predator, threat, distance }
      }
    })

    return bestThreat
  }

  updatePrey(prey, predators, neighbours) {
    if (!prey.alive) {
      return
    }

    this.forceOrganismToLand(prey)

    const cell = this.getCellAt(prey.x, prey.y)
    if (!cell) {
      return
    }

    prey.hydration = clamp(
      (prey.hydration ?? 1) - (0.0008 + this.config.climateSeverity * 0.0009 + cell.slope * 0.00025),
      0,
      1.2,
    )

    const predatorThreat = this.findPredatorThreat(prey, predators)
    const nearestPredator = predatorThreat?.predator ?? null
    const threatDistanceBeforeMove = predatorThreat?.distance ?? null
    const perceivedThreat = clamp((predatorThreat?.threat ?? 0) - prey.traits.boldness * 0.18, 0, 1.5)
    const isFleeing = Boolean(nearestPredator && perceivedThreat > 0.06)
    const thirst = clamp(1 - prey.hydration, 0, 1)
    const foodVector = this.findFoodVector(prey, predatorThreat ? 3 : 4)
    const waterVector = this.findWaterVector(prey, 6, predators, neighbours, thirst)
    const coverVector = predatorThreat ? this.findCoverVector(prey, 3) : { x: 0, y: 0 }
    const crowdVector = this.findCrowdingVector(prey, neighbours)
    const localConcealment = this.calculateConcealment(prey, cell)
    const homeVector = {
      x: prey.homeX - prey.x,
      y: prey.homeY - prey.y,
    }
    const fleeVector = nearestPredator
      ? {
          x: prey.x - nearestPredator.x,
          y: prey.y - nearestPredator.y,
        }
      : { x: 0, y: 0 }

    prey.wanderAngle += randomInRange(-0.2, 0.2)
    const jitter = {
      x: Math.cos(prey.wanderAngle) * 0.18 + randomInRange(-0.05, 0.05),
      y: Math.sin(prey.wanderAngle) * 0.18 + randomInRange(-0.05, 0.05),
    }

    const waterNeed = 0.015 + thirst * (0.74 - prey.traits.efficiency * 0.22)
    const homeNeed = predatorThreat ? 0.02 : prey.energy > 0.78 ? 0.12 : 0.06
    const crowdNeed = 0.4 + prey.traits.instinct * 0.32
    const fleeNeed = nearestPredator ? 0.92 + perceivedThreat * 1.12 + prey.traits.instinct * 0.28 : 0
    const coverNeed = predatorThreat ? 0.22 + prey.traits.instinct * 0.18 + (1 - localConcealment) * 0.34 : 0.06
    const foodWeight =
      (thirst > 0.5 ? 0.82 : 1.08) +
      prey.traits.efficiency * 0.2 +
      prey.traits.boldness * 0.18 -
      prey.traits.instinct * 0.14 -
      perceivedThreat * 0.24

    const exertion = isFleeing
      ? 1.12 + perceivedThreat * 0.72 + prey.traits.boldness * 0.18
      : 0.24 + Math.max(0, foodWeight - 1) * 0.22
    const recoveryBias = isFleeing ? 0.08 : 1.08 - prey.traits.boldness * 0.16
    this.updateStaminaReserve(prey, { exertion, recoveryBias })

    const desired = {
      x:
        foodVector.x * foodWeight +
        waterVector.x * waterNeed +
        coverVector.x * coverNeed +
        crowdVector.x * crowdNeed +
        homeVector.x * homeNeed +
        fleeVector.x * fleeNeed +
        jitter.x,
      y:
        foodVector.y * foodWeight +
        waterVector.y * waterNeed +
        coverVector.y * coverNeed +
        crowdVector.y * crowdNeed +
        homeVector.y * homeNeed +
        fleeVector.y * fleeNeed +
        jitter.y,
    }

    const slopePenalty = 1 - cell.slope * 0.72 + prey.traits.stamina * 0.14
    const reserveSpeed = this.getReserveSpeedFactor(prey, isFleeing ? perceivedThreat : 0)
    const escapeBoost = isFleeing ? 1.08 + perceivedThreat * 0.16 + prey.traits.instinct * 0.06 : 1
    const speed =
      (0.016 + prey.traits.speed * 0.028 + prey.traits.stamina * 0.004 + prey.traits.recovery * 0.0024) *
      clamp(slopePenalty, 0.42, 1.06) *
      reserveSpeed *
      escapeBoost

    this.moveOrganism(prey, desired, speed)
    prey.age += 1
    prey.survivalTicks += 1
    prey.escapePressure += predatorThreat?.threat ?? 0
    this.syncHeight(prey)

    const newCell = this.getCellAt(prey.x, prey.y)
    const foodStress = 1 - this.config.foodDensity
    const movementCost =
      0.00105 +
      prey.traits.speed * 0.00075 +
      newCell.slope * 0.00165 +
      this.config.climateSeverity * 0.00145 +
      foodStress * 0.00045 -
      prey.traits.stamina * (0.0008 + foodStress * 0.00022) -
      prey.traits.recovery * 0.00035 -
      prey.traits.efficiency * 0.0007 +
      exertion * 0.00055

    prey.energy -= clamp(movementCost, 0.0005, 0.006)

    if (newCell.food > 0.02) {
      const intake = Math.min(
        newCell.food,
        0.011 +
          prey.traits.efficiency * 0.005 +
          (1 - prey.traits.instinct) * 0.002 +
          prey.traits.boldness * 0.0018,
      )
      prey.energy = clamp(
        prey.energy + intake * (1.18 + prey.traits.efficiency * 0.18 - this.config.climateSeverity * 0.16),
        0,
        1.35,
      )
      newCell.food -= intake
      this.generationStats.totalFoodConsumed += intake
      prey.foodConsumed += intake
    }

    this.rehydrate(prey, newCell)

    if (nearestPredator && threatDistanceBeforeMove !== null) {
      const threatDistanceAfterMove = distanceBetween(prey, nearestPredator)
      if (threatDistanceAfterMove > threatDistanceBeforeMove + 0.12) {
        prey.predatorEscapes += 1
      }
    }

    if (newCell.moisture > 0.25) {
      prey.energy = clamp(prey.energy + newCell.moisture * 0.0012, 0, 1.35)
    }

    if (prey.hydration < 0.16) {
      prey.energy -= 0.0017
    }

    if (prey.energy <= 0.02 || prey.hydration <= 0.02) {
      prey.alive = false
      this.generationStats.preyDeathsFromStarvation += 1
      prey.generationFitness = 0
    } else {
      prey.generationFitness = this.calculatePreyFitness(prey)
    }
  }

  updatePredator(predator, preyPopulation, claimedPreyById = new Map()) {
    if (!predator.alive) {
      return
    }

    this.forceOrganismToLand(predator)

    predator.avoidPreyTicks = Math.max(0, (predator.avoidPreyTicks ?? 0) - 1)
    if (predator.avoidPreyTicks === 0) {
      predator.avoidPreyId = null
    }

    const livePrey = preyPopulation.filter((organism) => organism.alive)
    const previousFocusId = predator.focusId
    let target = this.findPredatorTarget(predator, livePrey, claimedPreyById)
    const cell = this.getCellAt(predator.x, predator.y)
    const homeVector = {
      x: predator.homeX - predator.x,
      y: predator.homeY - predator.y,
    }
    const targetDistanceBeforeMove = target ? distanceBetween(predator, target) : null

    if (target?.id !== previousFocusId) {
      predator.chaseTicks = 0
      predator.failedChaseTicks = 0
    }

    predator.hydration = clamp(
      (predator.hydration ?? 1) - (0.001 + this.config.climateSeverity * 0.001 + cell.slope * 0.00025),
      0,
      1.2,
    )
    predator.wanderAngle += randomInRange(-0.16, 0.16)
    const thirst = clamp(1 - predator.hydration, 0, 1)
    const waterVector = this.findWaterVector(predator, 6, livePrey, this.predators, thirst)
    const scentVector = this.findPredatorScentVector(predator)
    const exertion = target
      ? 1.16 + predator.traits.boldness * 0.32 + (targetDistanceBeforeMove !== null && targetDistanceBeforeMove < 2 ? 0.14 : 0)
      : 0.28
    const recoveryBias = target ? 0.06 : 1.04 - predator.traits.boldness * 0.18
    this.updateStaminaReserve(predator, { exertion, recoveryBias })

    let desired
    if (target) {
      this.setTargetWithinBounds(predator, target.x, target.y)
      predator.targetTimer = 54
      desired = {
        x: target.x - predator.x + waterVector.x * thirst * 0.08 + randomInRange(-0.06, 0.06),
        y: target.y - predator.y + waterVector.y * thirst * 0.08 + randomInRange(-0.06, 0.06),
      }
    } else {
      const patrolDistance =
        predator.targetX !== null && predator.targetY !== null
          ? Math.hypot(predator.targetX - predator.x, predator.targetY - predator.y)
          : Infinity
      const shouldRefreshPatrol =
        predator.targetX === null ||
        predator.targetY === null ||
        predator.targetTimer <= 0 ||
        patrolDistance < 0.9

      if (shouldRefreshPatrol) {
        const patrol = scentVector?.strength > 0.16
          ? scentVector
          : this.findPredatorPatrolVector(predator)
        this.setTargetWithinBounds(predator, predator.x + patrol.x, predator.y + patrol.y)
        predator.targetTimer = scentVector?.strength > 0.16
          ? Math.round(randomInRange(34, 72))
          : Math.round(randomInRange(58, 110))

        if (scentVector?.sourceId && scentVector.sourceId !== predator.preferredWaterSourceId) {
          predator.preferredWaterSourceId = scentVector.sourceId
          predator.waterSourceCommitment = 2
        }
      }

      const rememberedTarget =
        predator.targetX !== null && predator.targetY !== null
          ? {
              x: predator.targetX - predator.x,
              y: predator.targetY - predator.y,
            }
          : {
              x: Math.cos(predator.wanderAngle) * 1.8,
              y: Math.sin(predator.wanderAngle) * 1.8,
            }

      predator.targetTimer = Math.max(0, (predator.targetTimer ?? 0) - 1)
      const scentPull = scentVector ? clamp(0.22 + scentVector.strength * 0.42, 0.22, 0.95) : 0
      desired = {
        x:
          rememberedTarget.x * predator.patrolBias * 0.92 +
          (scentVector?.x ?? 0) * scentPull +
          waterVector.x * (0.015 + thirst * 0.52) +
          homeVector.x * 0.06 +
          Math.cos(predator.wanderAngle) * 0.1,
        y:
          rememberedTarget.y * predator.patrolBias * 0.92 +
          (scentVector?.y ?? 0) * scentPull +
          waterVector.y * (0.015 + thirst * 0.52) +
          homeVector.y * 0.06 +
          Math.sin(predator.wanderAngle) * 0.1,
      }
    }

    const slopePenalty = 1 - cell.slope * 0.48 + predator.traits.stamina * 0.12
    const reserveSpeed = this.getReserveSpeedFactor(predator, target ? 0.1 : 0)
    const chaseBoost = target ? 1.02 + predator.traits.instinct * 0.03 + predator.traits.boldness * 0.04 : 1
    const speed =
      (0.0175 + predator.traits.speed * 0.029 + predator.traits.stamina * 0.003 + predator.traits.recovery * 0.0018) *
      clamp(slopePenalty, 0.52, 1) *
      reserveSpeed *
      chaseBoost

    this.moveOrganism(predator, desired, speed)
    predator.age += 1
    predator.survivalTicks += 1
    if (target) {
      predator.escapePressure += 1
    }
    this.syncHeight(predator)

    const newCell = this.getCellAt(predator.x, predator.y)
    predator.energy -= clamp(
      0.00115 +
        predator.traits.speed * 0.0008 +
        newCell.slope * 0.00135 +
        this.config.climateSeverity * 0.0012 -
        predator.traits.stamina * 0.00065 -
        predator.traits.recovery * 0.00032 -
        predator.traits.efficiency * 0.00072 +
        exertion * 0.00058,
      0.001,
      0.0043,
    )
    this.rehydrate(predator, newCell)

    if (target && target.alive) {
      const targetCell = this.getCellAt(target.x, target.y)
      const concealment = this.calculateConcealment(target, targetCell)
      const distance = distanceBetween(predator, target)
      const distanceChange = (targetDistanceBeforeMove ?? distance) - distance
      predator.chaseTicks += 1
      if (distanceChange < 0.018) {
        predator.failedChaseTicks += 1
      } else {
        predator.failedChaseTicks = Math.max(0, predator.failedChaseTicks - 2)
      }

      const catchChance =
        0.03 +
        predator.traits.speed * 0.13 +
        predator.traits.stamina * 0.05 +
        predator.traits.recovery * 0.04 +
        predator.traits.instinct * 0.09 +
        predator.staminaReserve * 0.08 +
        (1 - concealment) * 0.14 -
        target.traits.speed * 0.14 -
        target.traits.stamina * 0.1 -
        target.traits.recovery * 0.06 -
        target.traits.instinct * 0.06 -
        target.staminaReserve * 0.09

      const preyEscapeAdvantage =
        target.traits.speed * 0.42 +
        target.traits.stamina * 0.24 +
        target.traits.recovery * 0.24 +
        target.staminaReserve * 0.24
      const predatorPursuitAdvantage =
        predator.traits.speed * 0.38 +
        predator.traits.stamina * 0.2 +
        predator.traits.recovery * 0.18 +
        predator.traits.instinct * 0.1 +
        predator.staminaReserve * 0.22
      const preyLooksTooFast = preyEscapeAdvantage > predatorPursuitAdvantage + 0.16
      const abandonThreshold = Math.round(12 + predator.traits.boldness * 18 + predator.traits.instinct * 6)
      const prolongedThreshold = Math.round(28 + predator.traits.boldness * 22)

      if (distance < 0.48 && Math.random() < clamp(catchChance, 0.03, 0.34)) {
        target.alive = false
        claimedPreyById.delete(target.id)
        this.abandonPredatorChase(predator)
        predator.avoidPreyId = null
        predator.avoidPreyTicks = 0
        predator.energy = clamp(predator.energy + 0.28, 0, 1.5)
        predator.hydration = clamp(predator.hydration + 0.05, 0, 1.2)
        predator.kills += 1
        this.generationStats.preyDeathsFromPredation += 1
      } else if (
        (predator.failedChaseTicks > abandonThreshold && preyLooksTooFast) ||
        (predator.chaseTicks > prolongedThreshold && predator.staminaReserve < 0.28) ||
        (distanceChange < -0.02 && predator.failedChaseTicks > 6)
      ) {
        claimedPreyById.delete(target.id)
        this.abandonPredatorChase(predator, target.id)
        target = null
      }
    } else if (!target) {
      predator.chaseTicks = 0
      predator.failedChaseTicks = 0
    }

    if (predator.hydration < 0.16) {
      predator.energy -= 0.0014
    }

    if (predator.energy <= 0.02 || predator.hydration <= 0.02) {
      predator.alive = false
      this.generationStats.predatorDeaths += 1
      predator.generationFitness = 0
    } else {
      predator.generationFitness = this.calculatePredatorFitness(predator, livePrey.length)
      this.generationStats.totalPredatorEnergy += predator.energy
    }
  }

  findFoodVector(prey, scanRadius = 4) {
    const targetCell = prey.targetX !== null && prey.targetY !== null ? this.getCellAt(prey.targetX, prey.targetY) : null
    const shouldRefreshTarget =
      prey.targetTimer <= 0 ||
      !targetCell ||
      this.isWaterCell(targetCell) ||
      targetCell.food < 0.05 ||
      distanceBetween(prey, { x: prey.targetX ?? prey.x, y: prey.targetY ?? prey.y }) < 0.65

    if (shouldRefreshTarget) {
      const candidates = []

      for (let offsetY = -scanRadius; offsetY <= scanRadius; offsetY += 1) {
        for (let offsetX = -scanRadius; offsetX <= scanRadius; offsetX += 1) {
          const cell = this.getCellAt(prey.x + offsetX, prey.y + offsetY)
          if (!cell || this.isWaterCell(cell)) {
            continue
          }

          const homeDistance = Math.hypot(cell.x - prey.homeX, cell.y - prey.homeY)
          const score =
            cell.food * 1.45 +
            cell.foodCapacity * 0.25 +
            cell.vegetation * 0.24 +
            cell.moisture * 0.32 -
            cell.slope * 0.4 -
            cell.rockiness * 0.08 -
            Math.hypot(offsetX, offsetY) * 0.08 -
            homeDistance * 0.02 +
            randomInRange(-0.08, 0.08)

          candidates.push({ cell, score })
        }
      }

      const hotspot = this.findResourceHotspot(prey, {
        prefer: 'prey',
        nearX: prey.x,
        nearY: prey.y,
        scope: prey.hydration < 0.46 || candidates.length < 4 ? 'global' : 'regional',
        distanceWeight: prey.hydration < 0.46 ? 0.018 : 0.045,
      })

      if (hotspot) {
        const hotspotScore =
          hotspot.food * 1.3 +
          hotspot.foodCapacity * 0.35 +
          hotspot.moisture * 0.42 -
          Math.hypot(hotspot.x + 0.5 - prey.x, hotspot.y + 0.5 - prey.y) * 0.04
        candidates.push({ cell: hotspot, score: hotspotScore + 0.18 })
      }

      candidates.sort((a, b) => b.score - a.score)
      const shortlist = candidates.slice(0, 8)
      const choice = weightedPick(shortlist, (candidate) => Math.max(candidate.score + 0.55, 0.01))

      if (choice) {
        this.setTargetWithinBounds(prey, choice.cell.x + 0.5, choice.cell.y + 0.5)
        prey.targetTimer = randomInRange(48, 110)
      }
    } else {
      prey.targetTimer -= 1
    }

    return {
      x: (prey.targetX ?? prey.x) - prey.x,
      y: (prey.targetY ?? prey.y) - prey.y,
    }
  }

  findWaterVector(organism, scanRadius = 5, oppositePopulation = [], samePopulation = [], urgency = 0) {
    let bestCell = this.getCellAt(organism.x, organism.y)
    let bestScore = -Infinity
    const selectedSource = this.chooseWaterSourceFor(organism, oppositePopulation, samePopulation)
    const globalWaterTarget = this.chooseSpawnCell({
      prefer: organism.species,
      nearX: selectedSource.x,
      nearY: selectedSource.y,
      maxDistance: 4.5,
    })

    for (let offsetY = -scanRadius; offsetY <= scanRadius; offsetY += 1) {
      for (let offsetX = -scanRadius; offsetX <= scanRadius; offsetX += 1) {
        const cell = this.getCellAt(organism.x + offsetX, organism.y + offsetY)
        if (!cell || this.isWaterCell(cell)) {
          continue
        }

        const score =
          cell.moisture * 1.28 +
          Math.min(cell.water, WATER_BLOCK_LEVEL) * 0.5 -
          cell.slope * 0.32 -
          Math.hypot(offsetX, offsetY) * 0.08

        if (score > bestScore) {
          bestScore = score
          bestCell = cell
        }
      }
    }

    if (globalWaterTarget) {
      const sourceDistance = Math.hypot(selectedSource.x - organism.x, selectedSource.y - organism.y)
      const sourceBias =
        selectedSource.unlimited
          ? 1
          : clamp((selectedSource.remainingLiters / selectedSource.capacityLiters) * 1.2, 0, 1)

      if (
        bestCell &&
        (urgency > 0.42 || bestCell.moisture < 0.2 || (sourceDistance > 4.4 && urgency > 0.18)) &&
        sourceBias > 0.08
      ) {
        bestCell = globalWaterTarget
      }
    }

    return {
      x: bestCell.x + 0.5 - organism.x,
      y: bestCell.y + 0.5 - organism.y,
    }
  }

  findCrowdingVector(prey, neighbours) {
    const force = { x: 0, y: 0 }

    neighbours.forEach((other) => {
      if (other.id === prey.id || !other.alive) {
        return
      }

      const dx = prey.x - other.x
      const dy = prey.y - other.y
      const distance = Math.hypot(dx, dy)
      if (distance === 0 || distance > 1.7) {
        return
      }

      const strength = (1.7 - distance) / 1.7
      force.x += (dx / distance) * strength
      force.y += (dy / distance) * strength
    })

    return force
  }

  findCoverVector(prey, scanRadius = 2) {
    let bestCell = this.getCellAt(prey.x, prey.y)
    let bestScore = -Infinity

    for (let offsetY = -scanRadius; offsetY <= scanRadius; offsetY += 1) {
      for (let offsetX = -scanRadius; offsetX <= scanRadius; offsetX += 1) {
        const cell = this.getCellAt(prey.x + offsetX, prey.y + offsetY)
        if (!cell || this.isWaterCell(cell)) {
          continue
        }

        const score = cell.vegetation * 0.72 + cell.rockiness * 0.24 + cell.height * 0.18 - cell.slope * 0.32
        if (score > bestScore) {
          bestScore = score
          bestCell = cell
        }
      }
    }

    return {
      x: bestCell.x + 0.5 - prey.x,
      y: bestCell.y + 0.5 - prey.y,
    }
  }

  calculateConcealment(organism, cell) {
    const terrainTone = clamp(0.24 + cell.rockiness * 0.34 + cell.vegetation * 0.2 + cell.height * 0.1, 0, 1)
    const coatMatch = 1 - Math.abs(organism.traits.coat - terrainTone)

    if (organism.species === 'predator') {
      return clamp(
        coatMatch * 0.34 +
          organism.traits.instinct * 0.34 +
          organism.traits.efficiency * 0.1 +
          cell.vegetation * 0.14 +
          cell.rockiness * 0.12 -
          cell.water * 0.08,
        0,
        1,
      )
    }

    return clamp(
      coatMatch * 0.42 +
        organism.traits.instinct * 0.26 +
        organism.traits.efficiency * 0.12 +
        cell.vegetation * 0.2 +
        cell.rockiness * 0.08 -
        cell.water * 0.1,
      0,
      1,
    )
  }

  findPredatorScentVector(predator) {
    let bestCell = null
    let bestScore = 0.12

    this.terrain.cells.forEach((cell) => {
      if (this.isWaterCell(cell) || cell.preyScent < 0.04) {
        return
      }

      const distance = Math.hypot(cell.x + 0.5 - predator.x, cell.y + 0.5 - predator.y)
      const source = this.getWaterSourceById(cell.primaryWaterSourceId)
      const sameSourceBonus = predator.preferredWaterSourceId === cell.primaryWaterSourceId ? 0.04 : 0
      const switchingBonus =
        predator.preferredWaterSourceId !== null &&
        predator.preferredWaterSourceId !== cell.primaryWaterSourceId &&
        (source?.preyActivity ?? 0) > 0.32
          ? 0.12
          : 0
      const score =
        cell.preyScent * (distance <= 7 ? 1.55 : 1.1) +
        sameSourceBonus +
        switchingBonus -
        distance * 0.045 -
        cell.slope * 0.16

      if (score > bestScore) {
        bestScore = score
        bestCell = cell
      }
    })

    if (!bestCell) {
      return null
    }

    return {
      x: bestCell.x + 0.5 - predator.x,
      y: bestCell.y + 0.5 - predator.y,
      strength: bestScore,
      sourceId: bestCell.primaryWaterSourceId,
    }
  }

  findPredatorPatrolVector(predator) {
    const bestCell = this.findResourceHotspot(predator, {
      prefer: 'predator',
      nearX: predator.x,
      nearY: predator.y,
      scope: predator.hydration < 0.45 ? 'global' : 'regional',
      distanceWeight: predator.hydration < 0.45 ? 0.02 : 0.04,
    })

    return {
      x: bestCell.x + 0.5 - predator.x,
      y: bestCell.y + 0.5 - predator.y,
    }
  }

  findPredatorTarget(predator, preyPopulation, claimedPreyById = new Map()) {
    let bestTarget = null
    let bestScore = 0.1
    const detectionRadius =
      3.2 +
      predator.traits.speed * 2.05 +
      predator.traits.stamina * 0.95 +
      predator.traits.recovery * 0.4 +
      predator.traits.instinct * 1.3

    preyPopulation.forEach((prey) => {
      if (predator.avoidPreyId === prey.id && (predator.avoidPreyTicks ?? 0) > 0) {
        return
      }

      const claimedBy = claimedPreyById.get(prey.id)
      if (claimedBy && claimedBy !== predator.id) {
        return
      }

      const cell = this.getCellAt(prey.x, prey.y)
      const distance = distanceBetween(predator, prey)
      if (distance > detectionRadius) {
        return
      }

      const concealment = this.calculateConcealment(prey, cell)
      const visibility = clamp(
        (1 - distance / detectionRadius) *
          (0.22 +
            (1 - concealment) * 0.96 +
            prey.energy * 0.08 +
            prey.traits.boldness * 0.14 +
            (1 - prey.staminaReserve) * 0.12 +
            (1 - prey.traits.efficiency) * 0.12 -
            prey.traits.instinct * 0.08 -
            cell.vegetation * 0.14),
        0,
        1,
      )
      const escapeProfile =
        prey.traits.speed * 0.3 +
        prey.traits.stamina * 0.18 +
        prey.traits.recovery * 0.18 +
        prey.staminaReserve * 0.22 +
        prey.traits.instinct * 0.08
      let targetScore = visibility + prey.energy * 0.03 + (1 - prey.staminaReserve) * 0.2 - escapeProfile

      if (predator.focusId === prey.id) {
        targetScore += 0.16
      }

      if (targetScore > bestScore) {
        bestScore = targetScore
        bestTarget = prey
      }
    })

    if (bestTarget) {
      predator.focusId = bestTarget.id
      predator.focusTicks = 36
      claimedPreyById.set(bestTarget.id, predator.id)
      return bestTarget
    }

    if ((predator.focusTicks ?? 0) > 0 && predator.focusId !== null) {
      predator.focusTicks -= 1
      const rememberedTarget = preyPopulation.find((prey) => prey.id === predator.focusId)
      const claimedBy = rememberedTarget ? claimedPreyById.get(rememberedTarget.id) : null
      if (
        rememberedTarget &&
        (!claimedBy || claimedBy === predator.id) &&
        distanceBetween(predator, rememberedTarget) <= detectionRadius * 0.75
      ) {
        claimedPreyById.set(rememberedTarget.id, predator.id)
        return rememberedTarget
      }
    }

    predator.focusId = null

    return null
  }

  calculatePreyFitness(prey) {
    const currentCell = this.getCellAt(prey.x, prey.y)
    const concealment = currentCell ? this.calculateConcealment(prey, currentCell) : 0
    const foodScarcity = 1 - this.config.foodDensity
    const predatorPressure = clamp(this.predators.filter((organism) => organism.alive).length / 6, 0, 1.5)
    const survivalRatio = prey.survivalTicks / Math.max(this.config.generationLength, 1)

    return Math.max(
      0.1,
      1 +
        survivalRatio * 2.4 +
        prey.energy * 2.6 +
        prey.hydration * 1.8 +
        prey.foodConsumed * 4.8 +
        prey.escapePressure * 0.12 +
        prey.predatorEscapes * (0.75 + predatorPressure * 0.22) +
        prey.traits.speed * (0.45 + predatorPressure * 1.05) +
        prey.traits.stamina * (0.55 + this.config.terrainRoughness * 0.72 + this.config.climateSeverity * 0.62) +
        prey.traits.recovery * (0.44 + predatorPressure * 0.68 + this.config.terrainRoughness * 0.24) +
        prey.traits.efficiency * (0.8 + foodScarcity * 1.5) +
        prey.traits.instinct * (0.5 + predatorPressure * 0.95) +
        prey.traits.boldness * (foodScarcity * 0.48 - predatorPressure * 0.88) +
        prey.staminaReserve * 0.92 +
        concealment * (0.32 + predatorPressure * 0.78),
    )
  }

  calculatePredatorFitness(predator, preyCount = 0) {
    const currentCell = this.getCellAt(predator.x, predator.y)
    const concealment = currentCell ? this.calculateConcealment(predator, currentCell) : 0
    const preyPressure = clamp(preyCount / 18, 0, 2)
    const survivalRatio = predator.survivalTicks / Math.max(this.config.generationLength, 1)

    return Math.max(
      0.1,
      1 +
        survivalRatio * 2 +
        predator.energy * 2.4 +
        predator.hydration * 1.5 +
        predator.kills * 3.2 +
        predator.escapePressure * 0.05 +
        predator.traits.speed * (0.82 + preyPressure * 0.22) +
        predator.traits.stamina * (0.58 + this.config.terrainRoughness * 0.52 + this.config.climateSeverity * 0.48) +
        predator.traits.recovery * (0.42 + preyPressure * 0.3) +
        predator.traits.efficiency * 0.92 +
        predator.traits.instinct * (0.84 + preyPressure * 0.18) +
        predator.traits.boldness * (predator.kills * 0.12 - predator.abandonedChases * 0.34 - 0.22) -
        predator.abandonedChases * 0.22 +
        predator.staminaReserve * 0.72 +
        concealment * 0.42,
    )
  }

  rankSurvivorsForReproduction(survivors, species) {
    const preyCount = this.prey.filter((organism) => organism.alive).length
    const ranked = survivors
      .map((organism) => ({
        organism,
        fitness:
          species === 'prey'
            ? this.calculatePreyFitness(organism)
            : this.calculatePredatorFitness(organism, preyCount),
      }))
      .sort((a, b) => b.fitness - a.fitness)

    ranked.forEach((entry) => {
      entry.organism.generationFitness = entry.fitness
    })

    return ranked
  }

  allocateOffspringShares(rankedSurvivors, targetCount) {
    if (rankedSurvivors.length === 0 || targetCount <= 0) {
      return []
    }

    const weightedSurvivors = rankedSurvivors.map((entry) => ({
      ...entry,
      selectionWeight: entry.fitness ** 1.35,
    }))
    const totalFitness = weightedSurvivors.reduce((sum, entry) => sum + entry.selectionWeight, 0)
    const defaultShare = targetCount / rankedSurvivors.length
    const seeded = weightedSurvivors.map((entry) => {
      const exactShare = totalFitness <= 0 ? defaultShare : (entry.selectionWeight / totalFitness) * targetCount
      return {
        ...entry,
        exactShare,
        assigned: Math.floor(exactShare),
      }
    })

    let assignedTotal = seeded.reduce((sum, entry) => sum + entry.assigned, 0)
    if (assignedTotal === 0 && seeded.length > 0) {
      seeded[0].assigned = 1
      assignedTotal = 1
    }

    const byRemainder = [...seeded].sort((a, b) => {
      const remainderDelta = (b.exactShare - Math.floor(b.exactShare)) - (a.exactShare - Math.floor(a.exactShare))
      return remainderDelta === 0 ? b.fitness - a.fitness : remainderDelta
    })

    let cursor = 0
    while (assignedTotal < targetCount) {
      const nextEntry = byRemainder[cursor % byRemainder.length]
      nextEntry.assigned += 1
      assignedTotal += 1
      cursor += 1
    }

    const topQuartileCount = Math.max(1, Math.ceil(seeded.length / 4))
    const topQuartileOffspring = seeded
      .slice(0, topQuartileCount)
      .reduce((sum, entry) => sum + entry.assigned, 0)

    return {
      allocations: seeded,
      averageFitness: averageMetric(rankedSurvivors.map((entry) => ({ generationFitness: entry.fitness })), 'generationFitness'),
      topQuartileShare: targetCount === 0 ? 0 : topQuartileOffspring / targetCount,
    }
  }

  finishGeneration() {
    const preySurvivors = this.prey.filter((organism) => organism.alive)
    const predatorSurvivors = this.predators.filter((organism) => organism.alive)
    const preyStart = this.generationStats.preyStart || 1
    const predatorStart = this.generationStats.predatorStart || 1

    const preySurvivalRate = preySurvivors.length / preyStart
    const predationRate = this.generationStats.preyDeathsFromPredation / preyStart
    const averagePreyEnergy = averageEnergy(preySurvivors)
    const averagePredatorEnergy = averageEnergy(predatorSurvivors)
    const preySurvivorTraits = averageTraitProfile(preySurvivors)
    const predatorSurvivorTraits = averageTraitProfile(predatorSurvivors)
    const averageRemainingFood =
      this.terrain.cells.reduce((sum, cell) => sum + cell.food / cell.foodCapacity, 0) / this.terrain.cells.length
    const predatorPressure = predatorSurvivors.length + predationRate * 8

    const carryingCapacity = clamp(
      Math.round(
        24 +
          this.config.foodDensity * 66 +
          this.config.vegetationDensity * 40 -
          this.config.climateSeverity * 22 -
          predatorPressure * 1.45,
      ),
      8,
      120,
    )

    const preyGrowthFactor =
      0.84 +
      averageRemainingFood * 0.68 +
      averagePreyEnergy * 0.42 -
      this.config.climateSeverity * 0.24 -
      predatorPressure * 0.028

    const targetPreyCount = clamp(
      Math.max(
        Math.round(preySurvivors.length * (1 + preyGrowthFactor)),
        Math.round(preySurvivors.length * 1.35 + averageRemainingFood * 12 - predatorSurvivors.length * 0.5),
      ),
      0,
      carryingCapacity,
    )

    const preyPerPredator =
      predatorSurvivors.length === 0 ? preySurvivors.length : preySurvivors.length / Math.max(predatorSurvivors.length, 1)
    const predatorGrowthFactor =
      0.54 +
      predationRate * 0.46 +
      averagePredatorEnergy * 0.18 +
      clamp((preyPerPredator - 8.5) / 12, -0.4, 0.24) -
      this.config.climateSeverity * 0.2

    const ratioTargetPredators = Math.round(targetPreyCount * (TARGET_PREDATOR_SHARE / (1 - TARGET_PREDATOR_SHARE)))
    const predatorSupport = Math.round(
      Math.min(
        ratioTargetPredators,
        preySurvivors.length *
          (0.22 + averageRemainingFood * 0.06 + predationRate * 0.12 + averagePredatorEnergy * 0.05),
      ),
    )
    const predatorCapacity = clamp(
      Math.round(
        Math.min(
          Math.max(
            this.config.initialPredatorPopulation * 1.8,
            predatorSupport,
            ratioTargetPredators * 0.92,
          ),
          carryingCapacity * 0.45,
        ),
      ),
      0,
      Math.max(18, Math.round(carryingCapacity * 0.45)),
    )
    const predatorGrowthCeiling =
      predatorSurvivors.length +
      clamp(
        Math.round(
          predationRate * 2.2 +
            averagePredatorEnergy * 1.2 +
            Math.max(preyPerPredator - 9, 0) * 0.08 +
            Math.max(ratioTargetPredators - predatorSurvivors.length, 0) * 0.45 -
            this.config.climateSeverity * 1.5,
        ),
        0,
        8,
      )
    const predatorBaselineTarget = Math.round(predatorSurvivors.length * predatorGrowthFactor)
    const predatorRatioTarget = Math.round(predatorBaselineTarget * 0.2 + ratioTargetPredators * 0.8)
    const preySafetyDivisor = targetPreyCount < 30 ? 4.4 : targetPreyCount < 45 ? 3.8 : 3.25
    const preySafetyLimit = Math.max(0, Math.floor(targetPreyCount / preySafetyDivisor))
    const targetPredatorCount = clamp(
      predatorRatioTarget,
      0,
      Math.min(predatorCapacity, predatorGrowthCeiling, preySafetyLimit),
    )

    const preyReproduction = this.allocateOffspringShares(this.rankSurvivorsForReproduction(preySurvivors, 'prey'), targetPreyCount)
    const predatorReproduction = this.allocateOffspringShares(
      this.rankSurvivorsForReproduction(predatorSurvivors, 'predator'),
      targetPredatorCount,
    )
    const nextPrey = this.reproduce(preyReproduction.allocations ?? [], targetPreyCount, 'prey')
    const nextPredators = this.reproduce(predatorReproduction.allocations ?? [], targetPredatorCount, 'predator')
    const nextPreyTraits = averageTraitProfile(nextPrey)
    const nextPredatorTraits = averageTraitProfile(nextPredators)
    const preyTraitShift = traitDeltaProfile(this.generationStats.preyStartTraits, preySurvivorTraits)
    const predatorTraitShift = traitDeltaProfile(this.generationStats.predatorStartTraits, predatorSurvivorTraits)

    this.lastGenerationReport = {
      generation: this.generation,
      preyStart,
      preySurvivors: preySurvivors.length,
      predatorStart,
      predatorSurvivors: predatorSurvivors.length,
      preySurvivalRate,
      predationRate,
      preyStartTraits: this.generationStats.preyStartTraits,
      preySurvivorTraits,
      preyNextTraits: nextPreyTraits,
      preyAverageFitness: preyReproduction.averageFitness ?? 0,
      preyTopParentShare: preyReproduction.topQuartileShare ?? 0,
      preySelectionSummary: summarizeSelection('prey', preyTraitShift, preyReproduction),
      predatorStartTraits: this.generationStats.predatorStartTraits,
      predatorSurvivorTraits,
      predatorNextTraits: nextPredatorTraits,
      predatorAverageFitness: predatorReproduction.averageFitness ?? 0,
      predatorTopParentShare: predatorReproduction.topQuartileShare ?? 0,
      predatorSelectionSummary: summarizeSelection('predator', predatorTraitShift, predatorReproduction),
      preyTraitShift,
      predatorTraitShift,
      explanation:
        'At the end of each generation, survivors do not contribute equally. Animals now slow as sprint reserve drops, predators abandon chases that stop closing, and the next generation is weighted toward survivors whose traits handled those tradeoffs best.',
    }

    this.history.push(this.makeHistoryEntry({
      generation: this.generation,
      preyPopulation: nextPrey.length,
      predatorPopulation: nextPredators.length,
      preySurvivalRate,
      predationRate,
      prey: nextPrey,
    }))

    if (this.history.length > 80) {
      this.history.shift()
    }

    this.prey = nextPrey
    this.predators = nextPredators
    this.terrain = makeTerrain(this.config)
    this.prey.forEach((organism) =>
      this.placeOrganismOnLand(organism, {
        prefer: 'prey',
        nearX: organism.homeX,
        nearY: organism.homeY,
        maxDistance: 8,
      }),
    )
    this.predators.forEach((organism) =>
      this.placeOrganismOnLand(organism, {
        prefer: 'predator',
        nearX: organism.homeX,
        nearY: organism.homeY,
        maxDistance: 10,
      }),
    )
    this.generation += 1
    this.ticksInGeneration = 0
    this.generationStats = this.createGenerationStats()
  }

  reproduce(rankedSurvivors, targetCount, species) {
    if (rankedSurvivors.length === 0 || targetCount === 0) {
      return []
    }

    const topMatePool = rankedSurvivors.slice(0, Math.max(1, Math.ceil(rankedSurvivors.length * 0.5)))
    const offspring = []

    rankedSurvivors.forEach((entry) => {
      for (let index = 0; index < entry.assigned && offspring.length < targetCount; index += 1) {
        const matePool =
          topMatePool.length > 1
            ? topMatePool.filter((candidate) => candidate.organism.id !== entry.organism.id)
            : topMatePool
        const mateEntry = weightedPick(matePool, (candidate) => candidate.fitness)
        const parentA = entry.organism
        const parentB = mateEntry.organism
        const child = createOffspring(species, parentA, parentB, this.config.mutationRate)
        this.placeOrganismOnLand(child, {
          prefer: species,
          nearX: (parentA.x + parentB.x) / 2,
          nearY: (parentA.y + parentB.y) / 2,
          maxDistance: species === 'predator' ? 6 : 4,
        })
        offspring.push(child)
      }
    })

    while (offspring.length < targetCount) {
      const parentEntry = rankedSurvivors[0]
      const mateEntry = topMatePool[Math.min(1, topMatePool.length - 1)] ?? parentEntry
      const child = createOffspring(species, parentEntry.organism, mateEntry.organism, this.config.mutationRate)
      this.placeOrganismOnLand(child, {
        prefer: species,
        nearX: (parentEntry.organism.x + mateEntry.organism.x) / 2,
        nearY: (parentEntry.organism.y + mateEntry.organism.y) / 2,
        maxDistance: species === 'predator' ? 6 : 4,
      })
      offspring.push(child)
    }

    return offspring
  }

  makeHistoryEntry({ generation, preyPopulation, predatorPopulation, preySurvivalRate, predationRate, prey }) {
    const avgTraits = averageTraitProfile(prey)

    return {
      generation,
      preyPopulation,
      predatorPopulation,
      preySurvivalRate,
      predationRate,
      avgTraits,
      traitDistributions: {
        coat: createTraitHistogram(prey.map((organism) => organism.traits.coat)),
        speed: createTraitHistogram(prey.map((organism) => organism.traits.speed)),
        stamina: createTraitHistogram(prey.map((organism) => organism.traits.stamina)),
        recovery: createTraitHistogram(prey.map((organism) => organism.traits.recovery)),
        efficiency: createTraitHistogram(prey.map((organism) => organism.traits.efficiency)),
        instinct: createTraitHistogram(prey.map((organism) => organism.traits.instinct)),
        boldness: createTraitHistogram(prey.map((organism) => organism.traits.boldness)),
      },
      highTraitFrequency: {
        speed: prey.length === 0 ? 0 : prey.filter((organism) => organism.traits.speed >= 0.66).length / prey.length,
        efficiency:
          prey.length === 0 ? 0 : prey.filter((organism) => organism.traits.efficiency >= 0.66).length / prey.length,
        instinct:
          prey.length === 0 ? 0 : prey.filter((organism) => organism.traits.instinct >= 0.66).length / prey.length,
        recovery:
          prey.length === 0 ? 0 : prey.filter((organism) => organism.traits.recovery >= 0.66).length / prey.length,
        boldness:
          prey.length === 0 ? 0 : prey.filter((organism) => organism.traits.boldness >= 0.66).length / prey.length,
      },
    }
  }

  recordHistory() {
    this.history = [
      this.makeHistoryEntry({
        generation: 0,
        preyPopulation: this.prey.length,
        predatorPopulation: this.predators.length,
        preySurvivalRate: 1,
        predationRate: 0,
        prey: this.prey,
      }),
    ]
  }

  getSnapshot() {
    const preyAlive = this.prey.filter((organism) => organism.alive)
    const predatorsAlive = this.predators.filter((organism) => organism.alive)
    const fallbackStats =
      this.history.at(-1) ??
      this.makeHistoryEntry({
        generation: this.generation,
        preyPopulation: preyAlive.length,
        predatorPopulation: predatorsAlive.length,
        preySurvivalRate: 0,
        predationRate: 0,
        prey: preyAlive,
      })

    return {
      config: this.config,
      terrain: this.terrain,
      generation: this.generation,
      phase: this.ticksInGeneration === 0 && this.generation > 1 ? 'new_generation' : 'selection',
      progress: this.ticksInGeneration / this.config.generationLength,
      preyAlive,
      predatorsAlive,
      currentTraits: {
        prey: averageTraitProfile(preyAlive),
        predator: averageTraitProfile(predatorsAlive),
      },
      lastGenerationReport: this.lastGenerationReport,
      history: this.history,
      latestStats: {
        ...fallbackStats,
        preyPopulation: preyAlive.length,
        predatorPopulation: predatorsAlive.length,
      },
    }
  }
}
