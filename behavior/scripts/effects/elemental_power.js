import { system, world } from '@minecraft/server'
import { setActionElement } from '../action_bar.js'

export const ELEMENTAL_POWER_DURATION_TICKS = 120 * 20
export const ELEMENTAL_POWER_DAMAGE_MULTIPLIER = 1.5

// 属性効果は一人につき一つ。期限はゲーム内tickで管理する。
const effects = new Map()

export function getElementalPowerMultiplier (player, element) {
  const active = effects.get(player.id)
  return active && active.element === element && system.currentTick < active.expiresAt
    ? ELEMENTAL_POWER_DAMAGE_MULTIPLIER
    : 1
}

export function activateElementalPower (player, element) {
  const active = { element, expiresAt: system.currentTick + ELEMENTAL_POWER_DURATION_TICKS }
  effects.set(player.id, active)
  setActionElement(element, player)
  system.runTimeout(() => {
    // 更新前のタイマーは、食べ直し・属性切り替え後の効果を解除しない。
    if (!player.isValid || effects.get(player.id) !== active) return
    clearElementalPower(player)
  }, ELEMENTAL_POWER_DURATION_TICKS)
}

function clearElementalPower (player) {
  effects.delete(player.id)
  setActionElement(undefined, player)
}

world.afterEvents.entityDie.subscribe(({ deadEntity }) => {
  if (deadEntity.typeId === 'minecraft:player') clearElementalPower(deadEntity)
})

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  effects.delete(playerId)
})
