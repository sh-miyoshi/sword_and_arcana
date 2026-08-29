const HEALTH_SKILL_PROPERTY = 'my:skill_health'
const ATTACK_SKILL_PROPERTY = 'my:skill_attack'
const SKILL_POINTS_PROPERTY = 'my:skill_points'

export const MAX_SKILL_LEVEL = 20

/**
 * Dynamic Propertyから数値を取得する
 */
function getNumber (player, property, defaultValue = 0) {
  const value = player.getDynamicProperty(property)

  if (typeof value !== 'number') {
    player.setDynamicProperty(property, defaultValue)
    return defaultValue
  }

  return value
}

/**
 * 体力スキル
 */
export function getHealthSkill (player) {
  return getNumber(player, HEALTH_SKILL_PROPERTY, 0)
}

/**
 * 攻撃力スキル
 */
export function getAttackSkill (player) {
  return getNumber(player, ATTACK_SKILL_PROPERTY, 0)
}

/**
 * スキルポイント
 */
export function getSkillPoints (player) {
  return getNumber(player, SKILL_POINTS_PROPERTY, 5)
}

/**
 * スキルポイントを設定
 */
export function setSkillPoints (player, amount) {
  player.setDynamicProperty(SKILL_POINTS_PROPERTY, Math.max(0, amount))
}

/**
 * 体力スキルを1上げる
 */
export function upgradeHealthSkill (player) {
  const level = getHealthSkill(player)
  const points = getSkillPoints(player)

  if (level >= MAX_SKILL_LEVEL) {
    return false
  }

  if (points <= 0) {
    return false
  }

  player.setDynamicProperty(HEALTH_SKILL_PROPERTY, level + 1)

  setSkillPoints(player, points - 1)

  return true
}

/**
 * 攻撃力スキルを1上げる
 */
export function upgradeAttackSkill (player) {
  const level = getAttackSkill(player)
  const points = getSkillPoints(player)

  if (level >= MAX_SKILL_LEVEL) {
    return false
  }

  if (points <= 0) {
    return false
  }

  player.setDynamicProperty(ATTACK_SKILL_PROPERTY, level + 1)

  setSkillPoints(player, points - 1)

  return true
}

export function resetSkills (player) {
  player.setDynamicProperty(HEALTH_SKILL_PROPERTY, 0)

  player.setDynamicProperty(ATTACK_SKILL_PROPERTY, 0)

  player.setDynamicProperty(SKILL_POINTS_PROPERTY, 5)
}
