import { world, system, EntitySwingSource } from '@minecraft/server'

import { shootEnergyBall } from '../projectiles/energy_ball.js'
import { useMana } from '../player/mana.js'

const FIRE_ROD_ID = 'my:fire_rod'
const MANA_COST = 1
const lastShotTick = new Map()

world.afterEvents.playerSwingStart.subscribe(event => {
  if (event.swingSource !== EntitySwingSource.Attack) {
    return
  }

  const item = event.heldItemStack

  if (!item || item.typeId !== FIRE_ROD_ID) {
    return
  }

  const player = event.player
  const lastTick = lastShotTick.get(player.id) ?? -1000

  if (system.currentTick - lastTick < 8) {
    return
  }

  if (!useMana(player, MANA_COST)) {
    return
  }

  lastShotTick.set(player.id, system.currentTick)
  shootEnergyBall(player)
})
