import { EquipmentSlot, world, system } from '@minecraft/server'

import { shootEnergyBall } from '../projectiles/energy_ball.js'
import { useMana } from '../player/mana.js'
import { setActionChargeCount } from '../action_bar.js'

const FIRE_ROD_ID = 'my:fire_rod'
const CHARGE_REQUIRED_TICKS = 20
const CHARGED_MANA_COST = 3
const FIRE_DURATION_SECONDS = 5
const ENERGY_BALL_LIFETIME_TICKS = 40
const chargeStartTicks = new Map()
const fireEnergyBallIds = new Set()

world.afterEvents.itemStartUse.subscribe(event => {
  const item = event.itemStack

  if (!item || item.typeId !== FIRE_ROD_ID) {
    return
  }

  chargeStartTicks.set(event.source.id, system.currentTick)
})

world.afterEvents.itemReleaseUse.subscribe(event => {
  const item = event.itemStack

  if (!item || item.typeId !== FIRE_ROD_ID) {
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

  const ball = shootEnergyBall(player)

  if (ball) {
    fireEnergyBallIds.add(ball.id)

    system.runTimeout(() => {
      fireEnergyBallIds.delete(ball.id)
    }, ENERGY_BALL_LIFETIME_TICKS)
  }
})

world.afterEvents.projectileHitEntity.subscribe(event => {
  if (!fireEnergyBallIds.delete(event.projectile.id)) {
    return
  }

  const hitEntity = event.getEntityHit()?.entity

  if (!hitEntity) {
    return
  }

  hitEntity.setOnFire(FIRE_DURATION_SECONDS, true)
})

world.afterEvents.projectileHitBlock.subscribe(event => {
  fireEnergyBallIds.delete(event.projectile.id)
})

system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    const startTick = chargeStartTicks.get(player.id)

    if (startTick === undefined) {
      continue
    }

    const equippable = player.getComponent('minecraft:equippable')
    const heldItem = equippable?.getEquipment(EquipmentSlot.Mainhand)

    if (!heldItem || heldItem.typeId !== FIRE_ROD_ID) {
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
