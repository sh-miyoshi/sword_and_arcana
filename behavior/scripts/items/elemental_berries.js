import { EntityDamageCause, system, world } from '@minecraft/server'
import { setActionElement } from '../action_bar.js'

export const ELEMENTAL_BERRY_DURATION_TICKS = 120 * 20
export const ELEMENTAL_BERRY_DAMAGE_MULTIPLIER = 1.5

// Session-local effects expire in game ticks and are cleared on death/logout.
const effects = new Map()

export function getElementalChargeDamage (player, element, baseDamage) {
  const expiresAt = effects.get(player.id)?.[element] ?? 0
  return (
    baseDamage *
    (system.currentTick < expiresAt ? ELEMENTAL_BERRY_DAMAGE_MULTIPLIER : 1)
  )
}

system.beforeEvents.startup.subscribe(event => {
  for (const element of ['fire', 'ice']) {
    event.itemComponentRegistry.registerCustomComponent(`my:${element}_power`, {
      onConsume ({ source: player }) {
        if (player.typeId !== 'minecraft:player') return

        // 新しい効果だけを保存し、反対属性の効果を解除する。
        const active = {
          [element]: system.currentTick + ELEMENTAL_BERRY_DURATION_TICKS
        }
        effects.set(player.id, active)
        setActionElement(element, player)
        system.runTimeout(() => {
          // 食べ直し・属性切り替え後に、以前のタイマーで解除しない。
          if (!player.isValid || effects.get(player.id) !== active) return
          effects.delete(player.id)
          setActionElement(undefined, player)
        }, ELEMENTAL_BERRY_DURATION_TICKS)
      }
    })
  }
})

// Modify the original projectile hit, preserving its knockback and hit effects.
world.beforeEvents.entityHurt.subscribe(event => {
  if (event.cancel || event.damage <= 0) return
  const {
    cause,
    damagingEntity: player,
    damagingProjectile
  } = event.damageSource
  if (
    cause !== EntityDamageCause.projectile ||
    player?.typeId !== 'minecraft:player'
  )
    return

  const element =
    damagingProjectile?.typeId === 'my:fire_ball'
      ? 'fire'
      : damagingProjectile?.typeId === 'my:ice_ball'
      ? 'ice'
      : undefined
  if (element) {
    event.damage = getElementalChargeDamage(player, element, event.damage)
  }
})

world.afterEvents.entityDie.subscribe(({ deadEntity }) => {
  effects.delete(deadEntity.id)
  if (deadEntity.typeId === 'minecraft:player')
    setActionElement(undefined, deadEntity)
})

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  effects.delete(playerId)
})
