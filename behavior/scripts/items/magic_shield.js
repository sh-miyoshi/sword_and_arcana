import {
  EntityDamageCause,
  EquipmentSlot,
  system,
  world
} from '@minecraft/server'

import { getMana, useMana } from '../player/mana.js'

const MAGIC_SHIELD_ID = 'my:magic_shield'
const MANA_COST = 1
const activeShields = new Set()
const reservedMana = new Map()
const reflectedTargets = new Set()

system.beforeEvents.startup.subscribe(event => {
  event.itemComponentRegistry.registerCustomComponent('my:magic_shield', {
    // A completion callback makes the item continuously usable. Reflection is
    // handled by entityHurt while the use button is held.
    onCompleteUse () {}
  })
})

world.afterEvents.itemStartUse.subscribe(event => {
  if (event.itemStack?.typeId === MAGIC_SHIELD_ID) {
    activeShields.add(event.source.id)
  }
})

for (const signal of [
  world.afterEvents.itemReleaseUse,
  world.afterEvents.itemStopUse
]) {
  signal.subscribe(event => {
    if (event.itemStack?.typeId === MAGIC_SHIELD_ID) {
      activeShields.delete(event.source.id)
    }
  })
}

world.beforeEvents.entityHurt.subscribe(event => {
  const defender = event.hurtEntity

  if (
    event.cancel ||
    event.damage <= 0 ||
    defender.typeId !== 'minecraft:player' ||
    reflectedTargets.has(defender.id) ||
    !activeShields.has(defender.id)
  ) {
    return
  }

  const slot = getMagicShieldSlot(defender)
  const source = getAttackSource(event.damageSource)
  const attacker = event.damageSource.damagingEntity

  if (!slot || !source || !attacker || attacker.id === defender.id) return
  if (!isInFront(defender, source.location)) return

  const reserved = reservedMana.get(defender.id) ?? 0
  if (getMana(defender) - reserved < MANA_COST) return

  event.cancel = true
  reservedMana.set(defender.id, reserved + MANA_COST)

  const reflectedDamage = event.damage
  system.run(() => {
    releaseReservedMana(defender.id)

    if (!defender.isValid || !attacker.isValid || !useMana(defender, MANA_COST))
      return

    damageShield(defender, slot)
    defender.dimension.spawnParticle(
      'minecraft:totem_particle',
      defender.location
    )
    defender.playSound('random.orb', { pitch: 1.4, volume: 0.8 })

    reflectedTargets.add(attacker.id)
    try {
      attacker.applyDamage(reflectedDamage, {
        cause: EntityDamageCause.magic,
        damagingEntity: defender
      })
    } finally {
      reflectedTargets.delete(attacker.id)
    }
  })
})

world.afterEvents.playerLeave.subscribe(event => {
  activeShields.delete(event.playerId)
  reservedMana.delete(event.playerId)
})

function getMagicShieldSlot (player) {
  const equippable = player.getComponent('minecraft:equippable')

  if (
    equippable?.getEquipment(EquipmentSlot.Mainhand)?.typeId === MAGIC_SHIELD_ID
  ) {
    return EquipmentSlot.Mainhand
  }

  if (
    equippable?.getEquipment(EquipmentSlot.Offhand)?.typeId === MAGIC_SHIELD_ID
  ) {
    return EquipmentSlot.Offhand
  }
}

function getAttackSource (damageSource) {
  return damageSource.damagingProjectile ?? damageSource.damagingEntity
}

function isInFront (player, sourceLocation) {
  const view = player.getViewDirection()
  const dx = sourceLocation.x - player.location.x
  const dz = sourceLocation.z - player.location.z
  const viewLength = Math.hypot(view.x, view.z)
  const sourceLength = Math.hypot(dx, dz)

  if (viewLength === 0 || sourceLength === 0) return true

  return (view.x * dx + view.z * dz) / (viewLength * sourceLength) > 0
}

function releaseReservedMana (playerId) {
  const amount = (reservedMana.get(playerId) ?? MANA_COST) - MANA_COST

  if (amount > 0) reservedMana.set(playerId, amount)
  else reservedMana.delete(playerId)
}

function damageShield (player, slot) {
  const equippable = player.getComponent('minecraft:equippable')
  const shield = equippable?.getEquipment(slot)

  if (!shield || shield.typeId !== MAGIC_SHIELD_ID) return

  const durability = shield.getComponent('minecraft:durability')
  if (!durability) return

  if (durability.damage + 1 >= durability.maxDurability) {
    equippable.setEquipment(slot)
    player.playSound('random.break')
    return
  }

  durability.damage++
  equippable.setEquipment(slot, shield)
}
