import { EntityComponentTypes, EquipmentSlot, world, system } from '@minecraft/server'

import { setActionChargeCount } from '../action_bar.js'
import { shootIceBall } from '../projectiles/ice_ball.js'
import { useMana } from '../player/mana.js'
import { getChargeRequiredTicks } from '../skills/skill_data.js'

const ICE_ROD_ID = 'my:ice_rod'
const CHARGED_MANA_COST = 3
const FREEZE_DURATION_TICKS = 60
const FREEZE_PARTICLE_ID = 'my:freeze_crystals'
const FREEZE_PARTICLE_INTERVAL_TICKS = 5
const ICE_BALL_LIFETIME_TICKS = 40

const chargeStartTicks = new Map()
const iceBallIds = new Set()
const frozenEntities = new Map()

function freezeEntity(entity, durationTicks) {
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

world.afterEvents.itemStartUse.subscribe(event => {
  const item = event.itemStack

  if (!item || item.typeId !== ICE_ROD_ID) {
    return
  }

  chargeStartTicks.set(event.source.id, system.currentTick)
})

world.afterEvents.itemReleaseUse.subscribe(event => {
  const item = event.itemStack

  if (!item || item.typeId !== ICE_ROD_ID) {
    return
  }

  const player = event.source
  const startTick = chargeStartTicks.get(player.id)

  chargeStartTicks.delete(player.id)
  setActionChargeCount(0, player)

  if (startTick === undefined) {
    return
  }

  const chargedTicks = system.currentTick - startTick
  const chargeRequiredTicks = getChargeRequiredTicks(player)

  if (chargedTicks < chargeRequiredTicks) {
    return
  }

  if (!useMana(player, CHARGED_MANA_COST)) {
    player.sendMessage('MPが足りません。')
    return
  }

  const ball = shootIceBall(player)

  if (!ball) {
    return
  }

  iceBallIds.add(ball.id)

  system.runTimeout(() => {
    iceBallIds.delete(ball.id)
  }, ICE_BALL_LIFETIME_TICKS)
})

world.afterEvents.projectileHitEntity.subscribe(event => {
  if (!iceBallIds.delete(event.projectile.id)) {
    return
  }

  const hitEntity = event.getEntityHit()?.entity

  if (!hitEntity) {
    return
  }

  freezeEntity(hitEntity, FREEZE_DURATION_TICKS)
})

world.afterEvents.projectileHitBlock.subscribe(event => {
  iceBallIds.delete(event.projectile.id)
})

system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    const startTick = chargeStartTicks.get(player.id)

    if (startTick === undefined) {
      continue
    }

    const equippable = player.getComponent('minecraft:equippable')
    const heldItem = equippable?.getEquipment(EquipmentSlot.Mainhand)

    if (!heldItem || heldItem.typeId !== ICE_ROD_ID) {
      chargeStartTicks.delete(player.id)
      setActionChargeCount(0, player)
      continue
    }

    const chargedTicks = system.currentTick - startTick
    const chargeRequiredTicks = getChargeRequiredTicks(player)
    const ratio = Math.min(chargedTicks / chargeRequiredTicks, 1)
    const filled = Math.floor(ratio * 10)
    setActionChargeCount(filled, player)
  }
}, 2)
