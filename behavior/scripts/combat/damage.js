import { getElementalPowerMultiplier } from '../effects/elemental_power.js'
import { getAttackDamageBonus } from '../skills/skill_data.js'

// 計算順序は「基礎値 × 属性倍率 + 攻撃スキル加算」。
// beforeEventsからも呼ぶため、この関数では状態を書き換えない。
export function calculateDamage ({ attacker, baseDamage, element, includeAttackBonus = false }) {
  const multiplier = element ? getElementalPowerMultiplier(attacker, element) : 1
  const bonus = includeAttackBonus ? getAttackDamageBonus(attacker) : 0
  return baseDamage * multiplier + bonus
}

export function applyChargeDamage ({ attacker, target, baseDamage, element, cause }) {
  // entityAttackのスキル加算はdamage_events.jsが一度だけ担当する。
  // ここで加算すると、applyDamageが発生させるイベントで二重加算になる。
  const damage = calculateDamage({ attacker, baseDamage, element })
  return target.applyDamage(damage, { cause, damagingEntity: attacker })
}
