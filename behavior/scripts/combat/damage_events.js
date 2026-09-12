import { EntityDamageCause, world } from '@minecraft/server'
import { calculateDamage } from './damage.js'

const PROJECTILE_ELEMENTS = {
  'my:fire_ball': 'fire',
  'my:ice_ball': 'ice'
}

world.beforeEvents.entityHurt.subscribe(event => {
  if (event.cancel || event.damage <= 0) return
  const { cause, damagingEntity: attacker, damagingProjectile } = event.damageSource
  if (attacker?.typeId !== 'minecraft:player') return

  if (cause === EntityDamageCause.entityAttack) {
    // 通常攻撃と剣のチャージ攻撃。属性倍率はチャージの適用前に計算済み。
    event.damage = calculateDamage({ attacker, baseDamage: event.damage, includeAttackBonus: true })
  } else if (cause === EntityDamageCause.projectile) {
    const element = PROJECTILE_ELEMENTS[damagingProjectile?.typeId]
    if (!element) return
    // 元の着弾ダメージを補正し、追加攻撃やノックバックの重複を避ける。
    event.damage = calculateDamage({ attacker, baseDamage: event.damage, element })
  }
})
