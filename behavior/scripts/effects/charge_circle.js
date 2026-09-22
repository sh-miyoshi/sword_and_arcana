import { system, world } from '@minecraft/server'

const MAGIC_CIRCLE_ID = 'my:magic_circle'
const DURATION_TICKS = 30 * 20
const RADIUS = 3
const MAX_VERTICAL_DISTANCE = 2.5
const CHARGE_SPEED_MULTIPLIER = 1.5
const activeCircles = new Map()

export function applyChargeSpeedBuff (player, requiredTicks) {
  return isInsideActiveCircle(player)
    ? requiredTicks / CHARGE_SPEED_MULTIPLIER
    : requiredTicks
}

world.afterEvents.entitySpawn.subscribe(event => {
  const circle = event.entity
  if (circle.typeId !== MAGIC_CIRCLE_ID) return

  activeCircles.set(circle.id, {
    entity: circle,
    dimensionId: circle.dimension.id,
    location: { ...circle.location },
    expiresAt: system.currentTick + DURATION_TICKS
  })
})

function isInsideActiveCircle (player) {
  for (const active of activeCircles.values()) {
    if (
      system.currentTick >= active.expiresAt ||
      !active.entity.isValid ||
      player.dimension.id !== active.dimensionId
    ) {
      continue
    }

    const dx = player.location.x - active.location.x
    const dy = player.location.y - active.location.y
    const dz = player.location.z - active.location.z

    if (
      dx * dx + dz * dz <= RADIUS * RADIUS &&
      Math.abs(dy) <= MAX_VERTICAL_DISTANCE
    ) {
      return true
    }
  }

  return false
}

system.runInterval(() => {
  for (const [id, active] of activeCircles) {
    if (system.currentTick < active.expiresAt && active.entity.isValid) continue

    if (active.entity.isValid) active.entity.remove()
    activeCircles.delete(id)
  }
}, 20)

world.afterEvents.entityRemove.subscribe(event => {
  activeCircles.delete(event.removedEntityId)
})
