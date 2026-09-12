import { EquipmentSlot, world, system } from '@minecraft/server'

import { freezeEntity, FREEZE_DURATION_TICKS } from '../effects/freeze.js'

import { setActionChargeCount } from '../action_bar.js'
import { shootIceBall } from '../projectiles/ice_ball.js'
import { useMana } from '../player/mana.js'
import { getChargeRequiredTicks } from '../skills/skill_data.js'

const ICE_ROD_ID = 'my:ice_rod'
const CHARGED_MANA_COST = 2
const ICE_BALL_LIFETIME_TICKS = 40

const chargeStartTicks = new Map()
const iceBallIds = new Set()
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

  player.dimension.playSound('my.ice', player.location, {
    volume: 1,
    pitch: 1
  })
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
