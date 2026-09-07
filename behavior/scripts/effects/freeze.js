import { EntityComponentTypes, system } from '@minecraft/server'

export const FREEZE_DURATION_TICKS = 60
const FREEZE_PARTICLE_ID = 'my:freeze_crystals'
const FREEZE_PARTICLE_INTERVAL_TICKS = 5

const frozenEntities = new Map()

export function freezeEntity(entity, durationTicks) {
  const existing = frozenEntities.get(entity.id)

  if (existing) {
    existing.expiresAt = system.currentTick + durationTicks
    return
  }

  const movement = entity.getComponent(EntityComponentTypes.Movement)
  const state = {
    entity,
    originalMovement: movement?.currentValue,
    location: entity.location,
    rotation: entity.getRotation(),
    expiresAt: system.currentTick + durationTicks,
    nextParticleTick: system.currentTick
  }

  movement?.setCurrentValue(0)
  frozenEntities.set(entity.id, state)
}

system.runInterval(() => {
  for (const [id, state] of frozenEntities) {
    const { entity, originalMovement } = state

    try {
      if (system.currentTick >= state.expiresAt) {
        if (originalMovement !== undefined) {
          entity.getComponent(EntityComponentTypes.Movement)
            ?.setCurrentValue(originalMovement)
        }
        frozenEntities.delete(id)
        continue
      }

      entity.clearVelocity()
      entity.teleport(state.location, { rotation: state.rotation })

      if (system.currentTick >= state.nextParticleTick) {
        state.nextParticleTick = system.currentTick + FREEZE_PARTICLE_INTERVAL_TICKS
        try {
          const head = entity.getHeadLocation()
          entity.dimension.spawnParticle(FREEZE_PARTICLE_ID, {
            x: state.location.x,
            y: (state.location.y + head.y) / 2,
            z: state.location.z
          })
        } catch {
          // A visual effect failure must not interrupt the freeze or its cleanup.
        }
      }
    } catch {
      // Removed entities cannot be updated; restore movement if still accessible.
      try {
        if (originalMovement !== undefined) {
          entity.getComponent(EntityComponentTypes.Movement)
            ?.setCurrentValue(originalMovement)
        }
      } catch {
        // The entity died or was unloaded during the freeze.
      }
      frozenEntities.delete(id)
    }
  }
}, 1)

