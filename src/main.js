import './style.css'
import {
  DEFAULT_CONFIG,
  SIM_SPEED_MAX,
  SIM_SPEED_MIN,
  TERRAIN_BOUNDS,
  TRAIT_GUIDE_BY_SPECIES,
  NaturalSelectionSimulation,
} from './simulation.js'
const app = document.querySelector('#app')

function escapeAttribute(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
}

function infoTip(text, label = 'More information') {
  return `
    <span class="tooltip-anchor" data-tooltip="${escapeAttribute(text)}">
      <button class="info-dot" type="button" aria-label="${escapeAttribute(label)}">i</button>
    </span>
  `
}

app.innerHTML = `
  <div class="page-shell">
    <header class="hero">
      <div class="hero__copy">
        <h1>Natural Selection Simulation</h1>
      </div>
      <div class="hero__actions">
        <div class="topbar__actions">
          <button id="toggle-run" class="button button--primary" type="button">Pause</button>
          <button id="step-generation" class="button" type="button">Next generation</button>
          <button id="reset-simulation" class="button" type="button">Reset</button>
        </div>
      </div>
    </header>

    <div class="dashboard-grid">
      <main class="workspace-stack">
        <section class="panel habitat-panel">
          <div class="workspace-layout">
            <div class="habitat-main">
              <div class="section-copy">
                <h2>Model simulation</h2>
              </div>
              <div class="metric-strip" aria-label="Simulation status">
                <article class="metric-chip">
                  <span class="metric-chip__label">Generation</span>
                  <strong id="generation-value">1</strong>
                </article>
                <article class="metric-chip">
                  <span class="metric-chip__label">Progress</span>
                  <strong id="progress-value">0%</strong>
                </article>
                <article class="metric-chip">
                  <span class="metric-chip__label">Prey survival</span>
                  <strong id="survival-rate">0%</strong>
                </article>
                <article class="metric-chip">
                  <span class="metric-chip__label">Predation</span>
                  <strong id="predation-rate">0%</strong>
                </article>
              </div>

              <div class="canvas-shell">
                <canvas id="simulation-canvas" width="1120" height="700" aria-label="Natural selection simulation canvas"></canvas>
                <div id="organism-tooltip" class="organism-tooltip organism-tooltip--hidden"></div>
              </div>

              <div class="habitat-legend-row">
                <div class="map-key" aria-label="Habitat legend">
                  <div class="map-key__items">
                    <span><span class="legend-dot legend-dot--prey"></span>Prey</span>
                    <span><span class="legend-dot legend-dot--predator"></span>Predators</span>
                    <span><span class="legend-dot legend-dot--water"></span>Water</span>
                    <span><span class="legend-dot legend-dot--contour"></span>Elevation lines</span>
                    <span><span class="legend-dot legend-dot--vegetation-high"></span>High vegetation</span>
                    <span><span class="legend-dot legend-dot--vegetation-medium"></span>Medium vegetation</span>
                    <span><span class="legend-dot legend-dot--vegetation-low"></span>Low vegetation</span>
                  </div>
                </div>
              </div>
            </div>

            <aside class="control-sidebar">
              <div class="section-copy">
                <h2>Parameters</h2>
              </div>
              <div class="control-grid">
                <section class="control-group" aria-label="Starting population parameters">
                  <label class="control">
                    <span>Starting prey</span>
                    <output id="initialPreyPopulation-output" for="initialPreyPopulation"></output>
                    <input id="initialPreyPopulation" type="range" min="24" max="80" step="1" />
                  </label>
                  <label class="control">
                    <span>Starting predators</span>
                    <output id="initialPredatorPopulation-output" for="initialPredatorPopulation"></output>
                    <input id="initialPredatorPopulation" type="range" min="1" max="12" step="1" />
                  </label>
                </section>

                <section class="control-group" aria-label="Habitat parameters">
                  <label class="control">
                    <span>Food available</span>
                    <output id="foodDensity-output" for="foodDensity"></output>
                    <input id="foodDensity" type="range" min="0.2" max="1" step="0.01" />
                  </label>
                  <label class="control">
                    <span>Harsh climate</span>
                    <output id="climateSeverity-output" for="climateSeverity"></output>
                    <input id="climateSeverity" type="range" min="0" max="1" step="0.01" />
                  </label>
                  <label class="control">
                    <span>Rough ground</span>
                    <output id="terrainRoughness-output" for="terrainRoughness"></output>
                    <input id="terrainRoughness" type="range" min="0" max="1" step="0.01" />
                  </label>
                  <label class="control">
                    <span>Plant cover</span>
                    <output id="vegetationDensity-output" for="vegetationDensity"></output>
                    <input id="vegetationDensity" type="range" min="0.1" max="1" step="0.01" />
                  </label>
                </section>

                <section class="control-group" aria-label="Variation and speed parameters">
                  <label class="control">
                    <span>Mutation rate</span>
                    <output id="mutationRate-output" for="mutationRate"></output>
                    <input id="mutationRate" type="range" min="0" max="0.3" step="0.005" />
                  </label>
                  <label class="control">
                    <span>Simulation speed</span>
                    <output id="simSpeed-output" for="simSpeed"></output>
                    <input id="simSpeed" type="range" min="${SIM_SPEED_MIN}" max="${SIM_SPEED_MAX}" step="0.1" />
                  </label>
                </section>
              </div>
            </aside>
          </div>
        </section>

        <section class="panel population-panel">
          <div class="section-head">
            <div class="section-copy">
              <h2>Model summary</h2>
            </div>
            ${infoTip('This summary explains how the simulation model works and what the current generation is showing.', 'Model summary help')}
          </div>

          <p id="generation-explanation" class="model-summary-copy"></p>
        </section>
      </main>

      <aside class="insight-rail">
        <section class="panel selection-panel">
          <div class="section-head">
            <div class="section-copy">
              <h2>Statistics and info</h2>
            </div>
            ${infoTip('Current trait averages show what is common in the living population now. Trait shift bars show which traits became more or less common among survivors after the last completed generation.', 'Selection help')}
          </div>

          <div class="statistics-summary">
            <div class="population-block population-block--balance">
              <div class="population-balance" aria-label="Population balance">
                <div class="population-balance__stats">
                  <div class="population-balance__stat">
                    <span class="population-balance__label">Prey</span>
                    <strong id="population-prey-count">0</strong>
                  </div>
                  <div class="population-balance__stat population-balance__stat--predator">
                    <span class="population-balance__label">Predators</span>
                    <strong id="population-predator-count">0</strong>
                  </div>
                </div>
                <div class="population-balance__bar" aria-hidden="true">
                  <span id="population-prey-bar" class="population-balance__fill population-balance__fill--prey"></span>
                  <span id="population-predator-bar" class="population-balance__fill population-balance__fill--predator"></span>
                </div>
              </div>
            </div>
          </div>

          <div class="trait-sections">
            <section class="trait-section">
              <div class="trait-section__head">
                <div>
                  <h3>Current trait average</h3>
                </div>
              </div>
              <div class="species-bars">
                <div class="species-column">
                  <h4>Prey</h4>
                  <div id="prey-species-bars" class="trait-bars"></div>
                </div>
                <div class="species-column">
                  <h4>Predators</h4>
                  <div id="predator-species-bars" class="trait-bars"></div>
                </div>
              </div>
            </section>

            <section class="trait-section">
              <div class="trait-section__head">
                <div>
                  <h3>Favoured last generation</h3>
                </div>
              </div>
              <div class="species-bars">
                <div class="species-column">
                  <h4>Prey</h4>
                  <div id="prey-trait-shift-bars" class="trait-shift-bars"></div>
                </div>
                <div class="species-column">
                  <h4>Predators</h4>
                  <div id="predator-trait-shift-bars" class="trait-shift-bars"></div>
                </div>
              </div>
            </section>

            <section class="trait-section trait-section--guide">
              <div class="trait-section__head trait-section__head--split">
                <div>
                  <h3>Trait guide</h3>
                </div>
                <div class="segment-control" role="tablist" aria-label="Trait guide species">
                  <button
                    id="trait-guide-tab-prey"
                    class="segment-control__button is-active"
                    type="button"
                    data-trait-guide-species="prey"
                    aria-pressed="true"
                  >
                    Prey
                  </button>
                  <button
                    id="trait-guide-tab-predator"
                    class="segment-control__button"
                    type="button"
                    data-trait-guide-species="predator"
                    aria-pressed="false"
                  >
                    Predators
                  </button>
                </div>
              </div>
              <div id="trait-guide-content" class="trait-guide__rows"></div>
            </section>
          </div>
        </section>
      </aside>
    </div>
  </div>
`

const simulationCanvas = document.querySelector('#simulation-canvas')
const simulationContext = simulationCanvas.getContext('2d')

const controls = [
  'initialPreyPopulation',
  'initialPredatorPopulation',
  'foodDensity',
  'mutationRate',
  'climateSeverity',
  'terrainRoughness',
  'vegetationDensity',
  'simSpeed',
]

const numberFormat = new Intl.NumberFormat('en-AU')
const percentFormat = new Intl.NumberFormat('en-AU', {
  style: 'percent',
  maximumFractionDigits: 0,
})

const PREY_COLOR_BANDS = [
  { limit: 0.22, name: 'dark coat', fill: '#71695f' },
  { limit: 0.45, name: 'brown coat', fill: '#8f7b63' },
  { limit: 0.7, name: 'tan coat', fill: '#b79b77' },
  { limit: 1, name: 'light coat', fill: '#d7c6ae' },
]

const FOOD_COLORS = ['#d7ddd0', '#c7d1ba', '#b2c29f', '#98ae80', '#7c965f']

const simulation = new NaturalSelectionSimulation(DEFAULT_CONFIG)

const ui = {
  toggleRun: document.querySelector('#toggle-run'),
  stepGeneration: document.querySelector('#step-generation'),
  reset: document.querySelector('#reset-simulation'),
  generation: document.querySelector('#generation-value'),
  progress: document.querySelector('#progress-value'),
  survivalRate: document.querySelector('#survival-rate'),
  predationRate: document.querySelector('#predation-rate'),
  populationPreyCount: document.querySelector('#population-prey-count'),
  populationPredatorCount: document.querySelector('#population-predator-count'),
  populationPreyBar: document.querySelector('#population-prey-bar'),
  populationPredatorBar: document.querySelector('#population-predator-bar'),
  tooltip: document.querySelector('#organism-tooltip'),
  preySpeciesBars: document.querySelector('#prey-species-bars'),
  predatorSpeciesBars: document.querySelector('#predator-species-bars'),
  generationExplanation: document.querySelector('#generation-explanation'),
  traitGuideContent: document.querySelector('#trait-guide-content'),
  traitGuideButtons: Array.from(document.querySelectorAll('[data-trait-guide-species]')),
  preyTraitShiftBars: document.querySelector('#prey-trait-shift-bars'),
  predatorTraitShiftBars: document.querySelector('#predator-trait-shift-bars'),
}

let isRunning = true
let activeTraitGuideSpecies = 'prey'
let lastFrameTime = performance.now()
let selectedOrganismKey = null
let hoveredWaterSourceId = null
let hoverCanvasPoint = null
let latestSnapshot = simulation.getSnapshot()
const terrainLayerCanvas = document.createElement('canvas')
const terrainLayerContext = terrainLayerCanvas.getContext('2d')
const uiRenderState = {
  toggleRunLabel: '',
  generation: '',
  progress: '',
  survivalRate: '',
  predationRate: '',
  populationPreyCount: '',
  populationPredatorCount: '',
  populationPreyBarWidth: '',
  populationPredatorBarWidth: '',
  preySpeciesBars: '',
  predatorSpeciesBars: '',
  generationExplanation: '',
  traitGuideContent: '',
  preyTraitShiftBars: '',
  predatorTraitShiftBars: '',
  populationBalanceKey: '',
}
const terrainLayerState = {
  terrain: null,
  waterSignature: '',
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function getPreyColorBand(value) {
  return PREY_COLOR_BANDS.find((band) => value <= band.limit) ?? PREY_COLOR_BANDS.at(-1)
}

function getOrganismKey(organism) {
  return `${organism.species}-${organism.id}`
}

function formatControlValue(id, value) {
  if (id === 'initialPreyPopulation' || id === 'initialPredatorPopulation') {
    return `${Math.round(value)}`
  }

  if (id === 'simSpeed') {
    return `${value.toFixed(1)}x`
  }

  return `${Math.round(value * 100)}%`
}

function getTraitGuide(species = 'prey') {
  return TRAIT_GUIDE_BY_SPECIES[species] ?? TRAIT_GUIDE_BY_SPECIES.prey
}

function getTraitEntries(traits, species = 'prey') {
  return Object.entries(getTraitGuide(species)).map(([key, entry]) => [
    key,
    entry.label,
    traits[key] ?? 0,
    entry.impact,
  ])
}

function buildTraitBarMarkup(traits, tone, species) {
  const entries = getTraitEntries(traits, species)

  return entries
    .map(
      ([, label, value]) => `
        <div class="trait-row">
          <div class="trait-row__label">
            <span>${label}</span>
            <strong>${value.toFixed(2)}</strong>
          </div>
          <div class="trait-row__track">
            <span class="trait-row__fill trait-row__fill--${tone}" style="width:${clamp(value * 100, 0, 100)}%"></span>
          </div>
        </div>
      `,
    )
    .join('')
}

function buildTraitGuideMarkup(species = 'prey') {
  return Object.entries(getTraitGuide(species))
    .map(
      ([, entry]) => `
        <article class="trait-guide__item">
          <div class="trait-guide__meta">
            <strong>${entry.label}</strong>
            <span class="trait-guide__impact trait-guide__impact--${entry.impact}">${entry.impact === 'tradeoff' ? 'Tradeoff' : 'Helpful'}</span>
          </div>
          <p>${entry.description}</p>
        </article>
      `,
    )
    .join('')
}

function buildTraitShiftMarkup(shiftProfile = {}, species = 'prey') {
  const entries = Object.entries(getTraitGuide(species)).map(([key, entry]) => [entry.label, shiftProfile[key] ?? 0])

  return entries
    .map(([label, value]) => {
      const width = clamp(Math.abs(value) / 0.18, 0, 1) * 50
      const directionClass = value >= 0 ? 'trait-shift-row__fill--positive' : 'trait-shift-row__fill--negative'
      const sign = value >= 0 ? '+' : ''

      return `
        <div class="trait-shift-row">
          <div class="trait-shift-row__label">
            <span>${label}</span>
            <strong>${sign}${value.toFixed(2)}</strong>
          </div>
          <div class="trait-shift-row__track">
            <span class="trait-shift-row__axis"></span>
            <span class="trait-shift-row__fill ${directionClass}" style="width:${width}%"></span>
          </div>
        </div>
      `
    })
    .join('')
}

function renderTraitGuide() {
  setMarkupIfChanged(
    'traitGuideContent',
    ui.traitGuideContent,
    buildTraitGuideMarkup(activeTraitGuideSpecies),
  )

  ui.traitGuideButtons.forEach((button) => {
    const isActive = button.dataset.traitGuideSpecies === activeTraitGuideSpecies
    button.classList.toggle('is-active', isActive)
    button.setAttribute('aria-pressed', String(isActive))
  })
}

function setTextIfChanged(key, element, value) {
  if (uiRenderState[key] === value) {
    return
  }

  uiRenderState[key] = value
  element.textContent = value
}

function setMarkupIfChanged(key, element, markup) {
  if (uiRenderState[key] === markup) {
    return
  }

  uiRenderState[key] = markup
  element.innerHTML = markup
}

function setStyleIfChanged(key, element, property, value) {
  if (uiRenderState[key] === value) {
    return
  }

  uiRenderState[key] = value
  element.style.setProperty(property, value)
}

function buildModelSummary(snapshot) {
  const report = snapshot.lastGenerationReport
  const modelExplanation = 'This model simulates natural selection across repeated generations of prey and predators living in the same habitat. Each generation, animals move through the terrain, consume resources, avoid threats, and survive or fail depending on how well their traits suit the current settings for food, vegetation, climate, terrain, speed, and mutation. When a generation ends, survivors do not contribute equally to the next one: individuals with higher fitness produce more offspring, so useful trait combinations become more common over time while weaker combinations fade out.'

  if (!report) {
    return `${modelExplanation} No generation has been completed yet, so a full selection report will appear here once the first generation finishes and the model can compare starting populations, survivors, and the trait shifts passed into the next generation.`
  }

  const preyOffspringShare = percentFormat.format(report.preyTopParentShare || 0)
  const predatorOffspringShare = percentFormat.format(report.predatorTopParentShare || 0)
  const preySurvivalRate = percentFormat.format(report.preySurvivalRate || 0)
  const predationRate = percentFormat.format(report.predationRate || 0)

  return `${modelExplanation} Latest completed generation: Generation ${numberFormat.format(report.generation)} began with ${numberFormat.format(report.preyStart)} prey and ${numberFormat.format(report.predatorStart)} predators, and ended with ${numberFormat.format(report.preySurvivors)} prey survivors and ${numberFormat.format(report.predatorSurvivors)} predator survivors. That equals a prey survival rate of ${preySurvivalRate} and a predation rate of ${predationRate}. For prey, ${report.preySelectionSummary} For predators, ${report.predatorSelectionSummary} Reproduction after this generation was weighted toward the fittest survivors, so the top quarter of prey parents produced ${preyOffspringShare} of offspring with average fitness ${report.preyAverageFitness.toFixed(2)}, while the top quarter of predator parents produced ${predatorOffspringShare} with average fitness ${report.predatorAverageFitness.toFixed(2)}. ${report.explanation}`
}

function updateGenerationInsight(snapshot) {
  const report = snapshot.lastGenerationReport

  setTextIfChanged('generationExplanation', ui.generationExplanation, buildModelSummary(snapshot))
  setMarkupIfChanged(
    'preyTraitShiftBars',
    ui.preyTraitShiftBars,
    buildTraitShiftMarkup(report?.preyTraitShift ?? {}, 'prey'),
  )
  setMarkupIfChanged(
    'predatorTraitShiftBars',
    ui.predatorTraitShiftBars,
    buildTraitShiftMarkup(report?.predatorTraitShift ?? {}, 'predator'),
  )
}

function updateSpeciesBars(snapshot) {
  setMarkupIfChanged(
    'preySpeciesBars',
    ui.preySpeciesBars,
    buildTraitBarMarkup(snapshot.currentTraits.prey, 'prey', 'prey'),
  )
  setMarkupIfChanged(
    'predatorSpeciesBars',
    ui.predatorSpeciesBars,
    buildTraitBarMarkup(snapshot.currentTraits.predator, 'predator', 'predator'),
  )
}

function updateCharts(snapshot) {
  const populationBalanceKey = `${snapshot.preyAlive.length}:${snapshot.predatorsAlive.length}`
  if (uiRenderState.populationBalanceKey !== populationBalanceKey) {
    uiRenderState.populationBalanceKey = populationBalanceKey
    const preyCount = snapshot.preyAlive.length
    const predatorCount = snapshot.predatorsAlive.length
    const totalCount = preyCount + predatorCount
    const preyRatio = totalCount === 0 ? 50 : (preyCount / totalCount) * 100
    const predatorRatio = totalCount === 0 ? 50 : (predatorCount / totalCount) * 100

    setTextIfChanged('populationPreyCount', ui.populationPreyCount, numberFormat.format(preyCount))
    setTextIfChanged(
      'populationPredatorCount',
      ui.populationPredatorCount,
      numberFormat.format(predatorCount),
    )
    setStyleIfChanged('populationPreyBarWidth', ui.populationPreyBar, 'width', `${preyRatio}%`)
    setStyleIfChanged(
      'populationPredatorBarWidth',
      ui.populationPredatorBar,
      'width',
      `${predatorRatio}%`,
    )
  }
}

function updateUi(snapshot) {
  latestSnapshot = snapshot
  setTextIfChanged('toggleRunLabel', ui.toggleRun, isRunning ? 'Pause' : 'Run')
  setTextIfChanged('generation', ui.generation, String(snapshot.generation))
  setTextIfChanged('progress', ui.progress, `${Math.round(snapshot.progress * 100)}%`)
  setTextIfChanged('survivalRate', ui.survivalRate, percentFormat.format(snapshot.latestStats.preySurvivalRate || 0))
  setTextIfChanged('predationRate', ui.predationRate, percentFormat.format(snapshot.latestStats.predationRate || 0))

  updateSpeciesBars(snapshot)
  updateGenerationInsight(snapshot)
  renderTraitGuide()
  updateCharts(snapshot)
}

function getMapLayout() {
  const paddingX = 14
  const paddingY = 12
  const width = simulationCanvas.width - paddingX * 2
  const height = simulationCanvas.height - paddingY * 2

  return {
    paddingX,
    paddingY,
    width,
    height,
    cellWidth: width / TERRAIN_BOUNDS.cols,
    cellHeight: height / TERRAIN_BOUNDS.rows,
  }
}

function cellCenter(layout, x, y) {
  return {
    x: layout.paddingX + (x + 0.5) * layout.cellWidth,
    y: layout.paddingY + (y + 0.5) * layout.cellHeight,
  }
}

function worldToScreen(layout, organism) {
  return cellCenter(layout, organism.x, organism.y)
}

function waterSourceToScreen(layout, source) {
  return {
    x: layout.paddingX + source.x * layout.cellWidth,
    y: layout.paddingY + source.y * layout.cellHeight,
    radiusX: source.radiusX * layout.cellWidth,
    radiusY: source.radiusY * layout.cellHeight,
  }
}

function interpolatePoint(layout, x1, y1, v1, x2, y2, v2, threshold) {
  const ratio = (threshold - v1) / (v2 - v1 || 0.0001)
  return {
    x: layout.paddingX + (x1 + (x2 - x1) * ratio) * layout.cellWidth,
    y: layout.paddingY + (y1 + (y2 - y1) * ratio) * layout.cellHeight,
  }
}

function buildContourSegments(fieldGetter, cols, rows, thresholds, layout) {
  const thresholdSegments = []

  thresholds.forEach((threshold) => {
    const segments = []
    for (let y = 0; y < rows - 1; y += 1) {
      for (let x = 0; x < cols - 1; x += 1) {
        const topLeft = fieldGetter(x, y)
        const topRight = fieldGetter(x + 1, y)
        const bottomRight = fieldGetter(x + 1, y + 1)
        const bottomLeft = fieldGetter(x, y + 1)

        const indexValue =
          (topLeft >= threshold ? 1 : 0) |
          (topRight >= threshold ? 2 : 0) |
          (bottomRight >= threshold ? 4 : 0) |
          (bottomLeft >= threshold ? 8 : 0)

        if (indexValue === 0 || indexValue === 15) {
          continue
        }

        const top = interpolatePoint(layout, x, y, topLeft, x + 1, y, topRight, threshold)
        const right = interpolatePoint(layout, x + 1, y, topRight, x + 1, y + 1, bottomRight, threshold)
        const bottom = interpolatePoint(layout, x, y + 1, bottomLeft, x + 1, y + 1, bottomRight, threshold)
        const left = interpolatePoint(layout, x, y, topLeft, x, y + 1, bottomLeft, threshold)

        const mapping = {
          1: [[left, top]],
          2: [[top, right]],
          3: [[left, right]],
          4: [[right, bottom]],
          5: [[left, top], [right, bottom]],
          6: [[top, bottom]],
          7: [[left, bottom]],
          8: [[left, bottom]],
          9: [[top, bottom]],
          10: [[left, top], [right, bottom]],
          11: [[right, bottom]],
          12: [[left, right]],
          13: [[top, right]],
          14: [[left, top]],
        }[indexValue]

        mapping?.forEach(([from, to]) => segments.push([from, to]))
      }
    }
    thresholdSegments.push({ threshold, segments })
  })

  return thresholdSegments
}

function drawContinuousElevation(ctx, snapshot, layout) {
  snapshot.terrain.cells.forEach((cell) => {
    const x = layout.paddingX + cell.x * layout.cellWidth
    const y = layout.paddingY + cell.y * layout.cellHeight
    const lightness = Math.round(218 - cell.height * 32 + cell.moisture * 8)
    const green = Math.round(lightness - 9 + cell.vegetation * 12)
    const blue = Math.round(lightness - 18 - cell.rockiness * 8)

    ctx.fillStyle = `rgb(${lightness}, ${green}, ${blue})`
    ctx.fillRect(x, y, layout.cellWidth + 1, layout.cellHeight + 1)
  })
}

function getFoodCellColor(cell) {
  const band = Math.min(4, Math.floor(cell.foodCapacity * 5))
  return FOOD_COLORS[band]
}

function drawFoodOverlay(ctx, terrain, layout) {
  terrain.cells.forEach((cell) => {
    if (cell.water > 0.12) {
      return
    }

    const x = layout.paddingX + cell.x * layout.cellWidth
    const y = layout.paddingY + cell.y * layout.cellHeight

    ctx.fillStyle = getFoodCellColor(cell)
    ctx.globalAlpha = 0.56
    ctx.fillRect(x, y, layout.cellWidth + 1, layout.cellHeight + 1)
  })
  ctx.globalAlpha = 1
}

function drawContourLines(ctx, terrain, layout) {
  const thresholdSegments = buildContourSegments(
    (x, y) => terrain.cells[y * terrain.cols + x].height,
    terrain.cols,
    terrain.rows,
    [0.18, 0.28, 0.38, 0.48, 0.58, 0.68, 0.78],
    layout,
  )

  thresholdSegments.forEach(({ threshold, segments }, index) => {
    ctx.beginPath()
    ctx.strokeStyle = index % 2 === 0 ? '#9b9c90' : '#b6b7ab'
    ctx.lineWidth = threshold > 0.58 ? 1.2 : 0.85
    segments.forEach(([from, to]) => {
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
    })
    ctx.stroke()
  })
}

function getWaterSignature(terrain) {
  return terrain.waterSources
    .map((source) => (source.unlimited ? 'u' : source.remainingLiters.toFixed(2)))
    .join('|')
}

function ensureTerrainLayer(snapshot, layout) {
  const waterSignature = getWaterSignature(snapshot.terrain)
  const needsRedraw =
    terrainLayerState.terrain !== snapshot.terrain ||
    terrainLayerState.waterSignature !== waterSignature ||
    terrainLayerCanvas.width !== simulationCanvas.width ||
    terrainLayerCanvas.height !== simulationCanvas.height

  if (!needsRedraw) {
    return
  }

  terrainLayerCanvas.width = simulationCanvas.width
  terrainLayerCanvas.height = simulationCanvas.height
  terrainLayerContext.clearRect(0, 0, terrainLayerCanvas.width, terrainLayerCanvas.height)
  terrainLayerContext.fillStyle = '#f3f4ef'
  terrainLayerContext.fillRect(0, 0, terrainLayerCanvas.width, terrainLayerCanvas.height)
  drawContinuousElevation(terrainLayerContext, snapshot, layout)
  drawContourLines(terrainLayerContext, snapshot.terrain, layout)
  terrainLayerContext.strokeStyle = '#cfd5cc'
  terrainLayerContext.lineWidth = 1
  terrainLayerContext.strokeRect(layout.paddingX, layout.paddingY, layout.width, layout.height)

  terrainLayerState.terrain = snapshot.terrain
  terrainLayerState.waterSignature = waterSignature
}

function drawWaterShape(ctx, terrain, layout) {
  terrain.cells.forEach((cell) => {
    if (cell.water <= 0.12) {
      return
    }

    const x = layout.paddingX + cell.x * layout.cellWidth
    const y = layout.paddingY + cell.y * layout.cellHeight
    const depth = clamp((cell.water - 0.12) / 0.88, 0, 1)

    ctx.fillStyle = depth > 0.55 ? '#7f9fb0' : '#9ab5c1'
    ctx.fillRect(x, y, layout.cellWidth + 1, layout.cellHeight + 1)
  })

  const contours = buildContourSegments(
    (x, y) => terrain.cells[y * terrain.cols + x].water,
    terrain.cols,
    terrain.rows,
    [0.12, 0.28, 0.45],
    layout,
  )

  contours.forEach(({ threshold, segments }, index) => {
    ctx.beginPath()
    segments.forEach(([from, to]) => {
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
    })
    ctx.strokeStyle = index === 0 ? '#718f9f' : threshold > 0.4 ? '#587689' : '#87a9b9'
    ctx.lineWidth = threshold > 0.4 ? 1.8 : 1.2
    ctx.stroke()
  })
}

function drawTerrain(ctx, snapshot, layout) {
  ensureTerrainLayer(snapshot, layout)
  ctx.clearRect(0, 0, simulationCanvas.width, simulationCanvas.height)
  ctx.drawImage(terrainLayerCanvas, 0, 0)
  drawFoodOverlay(ctx, snapshot.terrain, layout)
  drawWaterShape(ctx, snapshot.terrain, layout)
}

function drawPrey(ctx, prey, layout) {
  const position = worldToScreen(layout, prey)
  const radius = 5
  const band = getPreyColorBand(prey.traits.coat)

  ctx.fillStyle = band.fill
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(position.x, position.y, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
}

function drawPredator(ctx, predator, layout) {
  const position = worldToScreen(layout, predator)
  const radius = 6.4

  ctx.fillStyle = '#c8674d'
  ctx.strokeStyle = '#8c4c3b'
  ctx.lineWidth = 1.1
  ctx.beginPath()
  ctx.arc(position.x, position.y, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
}

function getSelectedOrganism(snapshot) {
  for (const organism of snapshot.preyAlive) {
    if (getOrganismKey(organism) === selectedOrganismKey) {
      return organism
    }
  }

  for (const organism of snapshot.predatorsAlive) {
    if (getOrganismKey(organism) === selectedOrganismKey) {
      return organism
    }
  }

  return null
}

function getVisionProfile(organism) {
  if (organism.species === 'predator') {
    return {
      radius: 3.8 + organism.traits.speed * 2.45 + organism.traits.stamina * 1.2 + organism.traits.instinct * 1.55,
      spread: Math.PI * 0.5,
      fill: 'rgba(200, 103, 77, 0.14)',
      stroke: 'rgba(140, 76, 59, 0.45)',
    }
  }

  return {
    radius: 2.4 + organism.traits.instinct * 2.2 + organism.traits.speed * 0.75,
    spread: Math.PI * 0.85,
    fill: 'rgba(103, 122, 89, 0.12)',
    stroke: 'rgba(83, 97, 92, 0.38)',
  }
}

function drawVisionCone(ctx, organism, layout) {
  if (!organism) {
    return
  }

  const position = worldToScreen(layout, organism)
  const { radius, spread, fill, stroke } = getVisionProfile(organism)
  const radiusPixels = radius * Math.min(layout.cellWidth, layout.cellHeight)
  const facing = organism.facingAngle ?? 0

  ctx.save()
  ctx.fillStyle = fill
  ctx.strokeStyle = stroke
  ctx.lineWidth = 1.25
  ctx.beginPath()
  ctx.moveTo(position.x, position.y)
  ctx.arc(position.x, position.y, radiusPixels, facing - spread / 2, facing + spread / 2)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

function drawSelectionRing(ctx, organism, layout) {
  if (!organism) {
    return
  }

  const position = worldToScreen(layout, organism)
  const radius = organism.species === 'predator' ? 11 : 9

  ctx.strokeStyle = '#2d3733'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(position.x, position.y, radius, 0, Math.PI * 2)
  ctx.stroke()
}

function placeTooltip(point) {
  const canvasRect = simulationCanvas.getBoundingClientRect()
  const scaleX = canvasRect.width / simulationCanvas.width
  const scaleY = canvasRect.height / simulationCanvas.height
  const tooltipWidth = ui.tooltip.offsetWidth || 196
  const tooltipHeight = ui.tooltip.offsetHeight || 126
  const padding = 10
  const gap = 12
  const anchorX = point.x * scaleX
  const anchorY = point.y * scaleY

  let left = anchorX + gap
  if (left + tooltipWidth > canvasRect.width - padding) {
    left = anchorX - tooltipWidth - gap
  }

  let top = anchorY - tooltipHeight - gap
  if (top < padding) {
    top = anchorY + gap
  }

  ui.tooltip.style.left = `${clamp(left, padding, Math.max(padding, canvasRect.width - tooltipWidth - padding))}px`
  ui.tooltip.style.top = `${clamp(top, padding, Math.max(padding, canvasRect.height - tooltipHeight - padding))}px`
}

function describeOrganismState(organism) {
  if (organism.species === 'predator') {
    if ((organism.chaseTicks ?? 0) > 0 && (organism.failedChaseTicks ?? 0) > 5) {
      return 'Struggling chase'
    }

    if ((organism.chaseTicks ?? 0) > 0) {
      return 'Pursuing prey'
    }

    return organism.staminaReserve < 0.28 ? 'Recovering' : 'Patrolling'
  }

  return organism.staminaReserve < 0.28 ? 'Recovering' : organism.energy > 0.45 ? 'Foraging' : 'Searching'
}

function updateTooltip(snapshot, layout) {
  if (hoveredWaterSourceId && hoverCanvasPoint) {
    const source = snapshot.terrain.waterSources.find((item) => item.id === hoveredWaterSourceId)
    if (source) {
      const fillPercent = source.unlimited
        ? null
        : Math.round((source.remainingLiters / source.capacityLiters) * 100)
      const waterText = source.unlimited
        ? 'Unlimited supply'
        : fillPercent === 0
          ? 'Dry pond'
          : `${Math.round(source.remainingLiters)} L left • ${fillPercent}% full`

      ui.tooltip.innerHTML = `
        <strong>${source.label}</strong>
        <span class="organism-tooltip__meta">${waterText}</span>
      `
      ui.tooltip.classList.remove('organism-tooltip--hidden')
      placeTooltip(hoverCanvasPoint)
      return
    }
  }

  const organism = getSelectedOrganism(snapshot)
  if (!organism) {
    ui.tooltip.classList.add('organism-tooltip--hidden')
    return
  }

  const point = worldToScreen(layout, organism)
  const heading = organism.species === 'predator'
    ? `Predator ${organism.id}`
    : `Prey ${organism.id} • ${getPreyColorBand(organism.traits.coat).name}`
  const state = describeOrganismState(organism)

  ui.tooltip.innerHTML = `
    <strong>${heading}</strong>
    <span class="organism-tooltip__meta">Energy ${organism.energy.toFixed(2)} • Water ${Math.max(0, organism.hydration ?? 0).toFixed(2)} • Reserve ${(organism.staminaReserve ?? 0).toFixed(2)}</span>
    <span class="organism-tooltip__meta">State ${state} • Fitness ${(organism.generationFitness ?? 0).toFixed(2)}</span>
    <div class="organism-tooltip__grid">
      ${getTraitEntries(organism.traits, organism.species)
        .map(
          ([, label, value]) => `
            <span>${label}</span><strong>${value.toFixed(2)}</strong>
          `,
        )
        .join('')}
    </div>
  `
  ui.tooltip.classList.remove('organism-tooltip--hidden')
  placeTooltip(point)
}

function drawMapLabels(ctx, layout, snapshot) {
  const seasonalPond = snapshot.terrain.waterSources.find((source) => source.id === 'seasonal-pond')
  const seasonalPondLevel = seasonalPond && !seasonalPond.unlimited
    ? Math.round((seasonalPond.remainingLiters / seasonalPond.capacityLiters) * 100)
    : null
  const lowerWaterLabel = {
    x: layout.paddingX + layout.width * 0.15,
    y: layout.paddingY + layout.height * 0.58,
  }
  const upperWaterLabel = {
    x: layout.paddingX + layout.width * 0.66,
    y: layout.paddingY + layout.height * 0.28,
  }
  ctx.font = '600 13px Arial, sans-serif'
  ctx.fillStyle = '#53615c'
  ctx.fillText('Main lake', lowerWaterLabel.x, lowerWaterLabel.y)
  ctx.fillText('Seasonal pond', upperWaterLabel.x, upperWaterLabel.y)
  if (seasonalPondLevel !== null) {
    ctx.font = '500 11px Arial, sans-serif'
    ctx.fillStyle = seasonalPondLevel === 0 ? '#8a6f5f' : '#677872'
    ctx.fillText(seasonalPondLevel === 0 ? 'Dry' : `${seasonalPondLevel}% full`, upperWaterLabel.x, upperWaterLabel.y + 15)
    ctx.font = '600 13px Arial, sans-serif'
    ctx.fillStyle = '#53615c'
  }
}

function renderSimulation(snapshot) {
  const ctx = simulationContext
  const layout = getMapLayout()
  const selectedOrganism = getSelectedOrganism(snapshot)

  drawTerrain(ctx, snapshot, layout)
  drawVisionCone(ctx, selectedOrganism, layout)

  const organisms = [...snapshot.preyAlive, ...snapshot.predatorsAlive].sort((a, b) => a.y - b.y)

  organisms.forEach((organism) => {
    if (organism.species === 'prey') {
      drawPrey(ctx, organism, layout)
    } else {
      drawPredator(ctx, organism, layout)
    }
  })

  drawSelectionRing(ctx, selectedOrganism, layout)
  drawMapLabels(ctx, layout, snapshot)
  updateTooltip(snapshot, layout)
}

function handleCanvasSelection(event) {
  const rect = simulationCanvas.getBoundingClientRect()
  const scaleX = simulationCanvas.width / rect.width
  const scaleY = simulationCanvas.height / rect.height
  const clickX = (event.clientX - rect.left) * scaleX
  const clickY = (event.clientY - rect.top) * scaleY
  const layout = getMapLayout()

  let closest = null
  let closestDistance = 16

  ;[...latestSnapshot.preyAlive, ...latestSnapshot.predatorsAlive].forEach((organism) => {
    const point = worldToScreen(layout, organism)
    const distance = Math.hypot(clickX - point.x, clickY - point.y)
    if (distance < closestDistance) {
      closest = organism
      closestDistance = distance
    }
  })

  selectedOrganismKey = closest ? getOrganismKey(closest) : null
  updateUi(latestSnapshot)
}

function handleCanvasHover(event) {
  const rect = simulationCanvas.getBoundingClientRect()
  const scaleX = simulationCanvas.width / rect.width
  const scaleY = simulationCanvas.height / rect.height
  const hoverX = (event.clientX - rect.left) * scaleX
  const hoverY = (event.clientY - rect.top) * scaleY
  const layout = getMapLayout()

  hoverCanvasPoint = { x: hoverX, y: hoverY }
  hoveredWaterSourceId = null

  latestSnapshot.terrain.waterSources.forEach((source) => {
    const screen = waterSourceToScreen(layout, source)
    const ellipseDistance =
      ((hoverX - screen.x) / Math.max(screen.radiusX, 1)) ** 2 +
      ((hoverY - screen.y) / Math.max(screen.radiusY, 1)) ** 2

    if (ellipseDistance <= 1.08) {
      hoveredWaterSourceId = source.id
    }
  })
}

function handleCanvasLeave() {
  hoveredWaterSourceId = null
  hoverCanvasPoint = null
}

function populateControls() {
  controls.forEach((id) => {
    const input = document.querySelector(`#${id}`)
    const output = document.querySelector(`#${id}-output`)
    const value = DEFAULT_CONFIG[id]

    input.value = value
    output.textContent = formatControlValue(id, Number(value))

    input.addEventListener('input', (event) => {
      const numericValue = Number(event.target.value)
      const nextValue = id === 'simSpeed' ? clamp(numericValue, SIM_SPEED_MIN, SIM_SPEED_MAX) : numericValue
      input.value = nextValue
      output.textContent = formatControlValue(id, nextValue)
      simulation.updateConfig({ [id]: nextValue })
      updateUi(simulation.getSnapshot())
    })
  })
}

function syncControlValues(config) {
  controls.forEach((id) => {
    const input = document.querySelector(`#${id}`)
    const output = document.querySelector(`#${id}-output`)
    input.value = config[id]
    output.textContent = formatControlValue(id, Number(config[id]))
  })
}

ui.toggleRun.addEventListener('click', () => {
  isRunning = !isRunning
  updateUi(simulation.getSnapshot())
})

ui.stepGeneration.addEventListener('click', () => {
  simulation.completeGeneration()
  updateUi(simulation.getSnapshot())
})

ui.reset.addEventListener('click', () => {
  simulation.reset(simulation.config)
  selectedOrganismKey = null
  syncControlValues(simulation.config)
  updateUi(simulation.getSnapshot())
})

ui.traitGuideButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeTraitGuideSpecies = button.dataset.traitGuideSpecies ?? 'prey'
    renderTraitGuide()
  })
})

simulationCanvas.addEventListener('click', handleCanvasSelection)
simulationCanvas.addEventListener('mousemove', handleCanvasHover)
simulationCanvas.addEventListener('mouseleave', handleCanvasLeave)

populateControls()
renderTraitGuide()

function frame(now) {
  const elapsed = now - lastFrameTime
  lastFrameTime = now

  if (isRunning) {
    simulation.tick(elapsed)
  }

  const snapshot = simulation.getSnapshot()
  renderSimulation(snapshot)
  updateUi(snapshot)
  requestAnimationFrame(frame)
}

updateUi(simulation.getSnapshot())
requestAnimationFrame(frame)
