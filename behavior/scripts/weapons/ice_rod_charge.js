import { EquipmentSlot, world, system } from '@minecraft/server'

import { setActionChargeCount } from '../action_bar.js'
import { shootIceBall } from '../projectiles/ice_ball.js'
import { useMana } from '../player/mana.js'

const ICE_ROD_ID = 'my:ice_rod'
const CHARGE_REQUIRED_TICKS = 20
const CHARGED_MANA_COST = 3
const SLOWDOWN_DURATION_TICKS = 100
const SLOWDOWN_AMPLIFIER = 1
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

  if (chargedTicks < CHARGE_REQUIRED_TICKS) {
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

  hitEntity.addEffect('slowness', SLOWDOWN_DURATION_TICKS, {
    amplifier: SLOWDOWN_AMPLIFIER,
    showParticles: true
  })
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
    const ratio = Math.min(chargedTicks / CHARGE_REQUIRED_TICKS, 1)
    const filled = Math.floor(ratio * 10)
    setActionChargeCount(filled, player)
  }
}, 2)
