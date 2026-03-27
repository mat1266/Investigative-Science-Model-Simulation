const FONT_FAMILY = 'Arial, sans-serif'
const PREY_COLOR = '#a97846'
const PREDATOR_COLOR = '#bb5d42'
const GRID_COLOR = '#dde4d7'
const TEXT_COLOR = '#55675d'

function getCanvasContext(canvas) {
  const bounds = canvas.getBoundingClientRect()
  const displayWidth = Math.max(1, Math.round(bounds.width || canvas.clientWidth || canvas.width))
  const displayHeight = Math.max(1, Math.round(bounds.height || canvas.clientHeight || canvas.height))
  const pixelRatio = window.devicePixelRatio || 1
  const internalWidth = Math.round(displayWidth * pixelRatio)
  const internalHeight = Math.round(displayHeight * pixelRatio)

  if (canvas.width !== internalWidth || canvas.height !== internalHeight) {
    canvas.width = internalWidth
    canvas.height = internalHeight
  }

  const context = canvas.getContext('2d')
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  context.clearRect(0, 0, displayWidth, displayHeight)

  return {
    context,
    width: displayWidth,
    height: displayHeight,
  }
}

function roundRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.moveTo(x + safeRadius, y)
  context.lineTo(x + width - safeRadius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius)
  context.lineTo(x + width, y + height - safeRadius)
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height)
  context.lineTo(x + safeRadius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius)
  context.lineTo(x, y + safeRadius)
  context.quadraticCurveTo(x, y, x + safeRadius, y)
  context.closePath()
}

function drawChartFrame(context, canvas) {
  context.fillStyle = '#ffffff'
  roundRect(context, 0, 0, canvas.width, canvas.height, 18)
  context.fill()

  context.strokeStyle = '#d9d9d9'
  context.lineWidth = 1
  roundRect(context, 0.5, 0.5, canvas.width - 1, canvas.height - 1, 18)
  context.stroke()
}

function drawGrid(context, area) {
  context.strokeStyle = GRID_COLOR
  context.lineWidth = 1

  for (let index = 0; index <= 4; index += 1) {
    const y = area.top + (area.height / 4) * index
    context.beginPath()
    context.moveTo(area.left, y)
    context.lineTo(area.right, y)
    context.stroke()
  }
}

function drawAxes(context, area) {
  context.strokeStyle = '#cfcfcf'
  context.lineWidth = 1.25
  context.beginPath()
  context.moveTo(area.left, area.top)
  context.lineTo(area.left, area.bottom)
  context.lineTo(area.right, area.bottom)
  context.stroke()
}

function mapSeriesToPoints(values, area, minValue, maxValue) {
  const span = Math.max(1, maxValue - minValue)
  const stepX = values.length > 1 ? area.width / (values.length - 1) : 0

  return values.map((value, index) => ({
    x: area.left + stepX * index,
    y: area.top + area.height - ((value - minValue) / span) * area.height,
  }))
}

function drawLine(context, points, color) {
  if (points.length === 0) {
    return
  }

  context.beginPath()
  context.strokeStyle = color
  context.lineWidth = 3
  context.lineJoin = 'round'
  context.lineCap = 'round'

  points.forEach((point, index) => {
    if (index === 0) {
      context.moveTo(point.x, point.y)
      return
    }

    context.lineTo(point.x, point.y)
  })

  context.stroke()

  const lastPoint = points.at(-1)
  context.fillStyle = '#ffffff'
  context.beginPath()
  context.arc(lastPoint.x, lastPoint.y, 5.5, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = color
  context.beginPath()
  context.arc(lastPoint.x, lastPoint.y, 3.5, 0, Math.PI * 2)
  context.fill()
}

function drawSeriesTag(context, point, color, label, align = 'left') {
  context.font = `700 12px ${FONT_FAMILY}`
  const paddingX = 8
  const boxHeight = 22
  const textWidth = context.measureText(label).width
  const boxWidth = textWidth + paddingX * 2
  const preferredX = align === 'right' ? point.x - boxWidth - 10 : point.x + 10
  const clampedX = Math.max(0, Math.min(preferredX, context.canvas.width - boxWidth))
  const clampedY = Math.max(0, Math.min(point.y - boxHeight / 2, context.canvas.height - boxHeight))

  context.fillStyle = '#ffffff'
  roundRect(context, clampedX, clampedY, boxWidth, boxHeight, 11)
  context.fill()

  context.strokeStyle = color
  context.lineWidth = 1
  roundRect(context, clampedX + 0.5, clampedY + 0.5, boxWidth - 1, boxHeight - 1, 11)
  context.stroke()

  context.fillStyle = color
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  context.fillText(label, clampedX + paddingX, clampedY + boxHeight / 2)
}

function drawYLabels(context, area, maxValue) {
  const labels = [maxValue, Math.round(maxValue * 0.5), 0]

  context.font = `12px ${FONT_FAMILY}`
  context.fillStyle = '#666666'
  context.textAlign = 'right'
  context.textBaseline = 'middle'

  labels.forEach((value, index) => {
    const y = index === 0 ? area.top : index === 1 ? area.top + area.height / 2 : area.bottom
    context.fillText(String(value), area.left - 10, y)
  })

  context.textAlign = 'left'
  context.textBaseline = 'alphabetic'
}

function drawXLabels(context, history, area) {
  const sampleCount = Math.min(5, history.length)
  const step = sampleCount > 1 ? area.width / (sampleCount - 1) : 0

  context.font = `12px ${FONT_FAMILY}`
  context.fillStyle = '#666666'
  context.textAlign = 'center'

  for (let index = 0; index < sampleCount; index += 1) {
    const historyIndex =
      history.length === 1 ? 0 : Math.round((history.length - 1) * (index / Math.max(1, sampleCount - 1)))
    context.fillText(`G${history[historyIndex].generation}`, area.left + step * index, area.bottom + 20)
  }

  context.textAlign = 'left'
}

export function drawPopulationChart(canvas, history) {
  const { context, width, height } = getCanvasContext(canvas)
  const area = {
    left: 42,
    right: width - 18,
    top: 12,
    bottom: height - 30,
  }
  area.width = area.right - area.left
  area.height = area.bottom - area.top

  drawGrid(context, area)
  drawAxes(context, area)

  const preyValues = history.map((entry) => entry.preyPopulation)
  const predatorValues = history.map((entry) => entry.predatorPopulation)
  const maxValue = Math.max(10, ...preyValues, ...predatorValues)
  const preyPoints = mapSeriesToPoints(preyValues, area, 0, maxValue)
  const predatorPoints = mapSeriesToPoints(predatorValues, area, 0, maxValue)

  drawYLabels(context, area, maxValue)
  drawLine(context, preyPoints, PREY_COLOR)
  drawLine(context, predatorPoints, PREDATOR_COLOR)
  const preyPoint = preyPoints.at(-1)
  const predatorPoint = predatorPoints.at(-1)
  if (preyPoint) {
    drawSeriesTag(context, preyPoint, PREY_COLOR, String(preyValues.at(-1) ?? 0), 'right')
  }
  if (predatorPoint) {
    drawSeriesTag(
      context,
      predatorPoint,
      PREDATOR_COLOR,
      String(predatorValues.at(-1) ?? 0),
      predatorPoint.y <= (preyPoint?.y ?? Infinity) ? 'right' : 'left',
    )
  }
  drawXLabels(context, history, area)
}

export function drawTraitHistoryChart(canvas, history) {
  const { context, width, height } = getCanvasContext(canvas)
  const area = {
    left: 46,
    right: width - 20,
    top: 18,
    bottom: height - 34,
  }
  area.width = area.right - area.left
  area.height = area.bottom - area.top

  drawChartFrame(context, { width, height })
  drawGrid(context, area)
  drawAxes(context, area)
  drawYLabels(context, area, 1)

  const speedValues = history.map((entry) => entry.highTraitFrequency.speed)
  const efficiencyValues = history.map((entry) => entry.highTraitFrequency.efficiency)
  const instinctValues = history.map((entry) => entry.highTraitFrequency.instinct)

  drawLine(context, mapSeriesToPoints(speedValues, area, 0, 1), '#c09053')
  drawLine(context, mapSeriesToPoints(efficiencyValues, area, 0, 1), '#8ca06d')
  drawLine(context, mapSeriesToPoints(instinctValues, area, 0, 1), '#6f8f8f')
  drawXLabels(context, history, area)
}
