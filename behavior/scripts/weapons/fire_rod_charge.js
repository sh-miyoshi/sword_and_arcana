import { EquipmentSlot, world, system } from '@minecraft/server'

import { shootFireBall } from '../projectiles/fire_ball.js'
import { useMana } from '../player/mana.js'
import { setActionChargeCount } from '../action_bar.js'
import { getChargeRequiredTicks } from '../skills/skill_data.js'

const FIRE_ROD_ID = 'my:fire_rod'
const CHARGED_MANA_COST = 2
const chargeStartTicks = new Map()

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
  const chargeRequiredTicks = getChargeRequiredTicks(player)

  if (chargedTicks < chargeRequiredTicks) {
    return
  }

  if (!useMana(player, CHARGED_MANA_COST)) {
    player.sendMessage('MPが足りません。')
    return
  }

  const ball = shootFireBall(player)

  if (!ball) {
    return
  }

  player.dimension.playSound('my.fire', player.location, {
    volume: 1,
    pitch: 1
  })
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
    const chargeRequiredTicks = getChargeRequiredTicks(player)
    const ratio = Math.min(chargedTicks / chargeRequiredTicks, 1)
    const filled = Math.floor(ratio * 10)
    setActionChargeCount(filled, player)
  }
}, 2)
