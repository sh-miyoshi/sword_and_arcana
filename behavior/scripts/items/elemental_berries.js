import { EntityDamageCause, system, world } from '@minecraft/server'

export const ELEMENTAL_BERRY_DURATION_TICKS = 180 * 20
export const ELEMENTAL_BERRY_DAMAGE_MULTIPLIER = 1.5

// Session-local effects expire in game ticks and are cleared on death/logout.
const effects = new Map()

export function getElementalChargeDamage(player, element, baseDamage) {
  const expiresAt = effects.get(player.id)?.[element] ?? 0
  return baseDamage * (system.currentTick < expiresAt
    ? ELEMENTAL_BERRY_DAMAGE_MULTIPLIER
    : 1)
}

system.beforeEvents.startup.subscribe(event => {
  for (const [element, name] of [['fire', '炎力'], ['ice', '氷力']]) {
    event.itemComponentRegistry.registerCustomComponent(`my:${element}_power`, {
      onConsume({ source: player }) {
        if (player.typeId !== 'minecraft:player') return

        const active = effects.get(player.id) ?? {}
        active[element] = system.currentTick + ELEMENTAL_BERRY_DURATION_TICKS
        effects.set(player.id, active)
        player.sendMessage(`§e${name}の効果：3分間、対応するチャージ攻撃の基礎ダメージが1.5倍！`)
      }
    })
  }
})

// Modify the original projectile hit, preserving its knockback and hit effects.
world.beforeEvents.entityHurt.subscribe(event => {
  if (event.cancel || event.damage <= 0) return
  const { cause, damagingEntity: player, damagingProjectile } = event.damageSource
  if (cause !== EntityDamageCause.projectile || player?.typeId !== 'minecraft:player') return

  const element = damagingProjectile?.typeId === 'my:fire_ball'
    ? 'fire'
    : damagingProjectile?.typeId === 'my:ice_ball' ? 'ice' : undefined
  if (element) {
    event.damage = getElementalChargeDamage(player, element, event.damage)
  }
})

world.afterEvents.entityDie.subscribe(({ deadEntity }) => {
  effects.delete(deadEntity.id)
})

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  effects.delete(playerId)
})
