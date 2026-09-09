const HEALTH_SKILL_PROPERTY = 'my:skill_health'
const ATTACK_SKILL_PROPERTY = 'my:skill_attack'
const MAGIC_SKILL_PROPERTY = 'my:skill_magic'
const SKILL_POINTS_PROPERTY = 'my:skill_points'

export const MAX_SKILL_LEVEL = 10
export const SKILL_POINT_LEVEL_COST = 3
export const ATTACK_DAMAGE_PER_LEVEL = 0.5

export function getAttackDamageBonus (player) {
  // Read-only: this is also called from beforeEvents.
  const level = player.getDynamicProperty(ATTACK_SKILL_PROPERTY)
  if (typeof level !== 'number' || !Number.isFinite(level)) return 0
  return Math.max(0, Math.min(MAX_SKILL_LEVEL, level)) * ATTACK_DAMAGE_PER_LEVEL
}

function getNumber (player, property, defaultValue = 0) {
  const value = player.getDynamicProperty(property)

  if (typeof value !== 'number') {
    player.setDynamicProperty(property, defaultValue)
    return defaultValue
  }

  return value
}

export function getHealthSkill (player) {
  return getNumber(player, HEALTH_SKILL_PROPERTY, 0)
}

export function getAttackSkill (player) {
  return getNumber(player, ATTACK_SKILL_PROPERTY, 0)
}

export function getMagicSkill (player) {
  return getNumber(player, MAGIC_SKILL_PROPERTY, 0)
}

export function getChargeRequiredTicks (player) {
  return getRequiredChargeTicks(getMagicSkill(player))
}

export function getAttackChargeRequiredTicks (player) {
  return getRequiredChargeTicks(getAttackSkill(player))
}

function getRequiredChargeTicks (skillLevel) {
  if (skillLevel >= 10) return 10
  if (skillLevel >= 7) return 17
  if (skillLevel >= 5) return 20
  if (skillLevel >= 3) return 25
  if (skillLevel >= 1) return 30

  return 40
}

export function getSkillPoints (player) {
  return getNumber(player, SKILL_POINTS_PROPERTY, 5)
}

export function setSkillPoints (player, amount) {
  player.setDynamicProperty(SKILL_POINTS_PROPERTY, Math.max(0, amount))
}

export function addSkillPoints (player, amount) {
  const points = getSkillPoints(player)

  setSkillPoints(player, points + amount)
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

export function upgradeMagicSkill (player) {
  const level = getMagicSkill(player)
  const points = getSkillPoints(player)

  if (level >= MAX_SKILL_LEVEL) {
    return false
  }

  if (points <= 0) {
    return false
  }

  player.setDynamicProperty(MAGIC_SKILL_PROPERTY, level + 1)

  setSkillPoints(player, points - 1)

  return true
}

export function resetSkills (player) {
  player.setDynamicProperty(HEALTH_SKILL_PROPERTY, 0)
  player.setDynamicProperty(ATTACK_SKILL_PROPERTY, 0)
  player.setDynamicProperty(MAGIC_SKILL_PROPERTY, 0)
  player.setDynamicProperty(SKILL_POINTS_PROPERTY, 5)
}

export function exchangeExperienceForSkillPoint (player) {
  if (player.level < SKILL_POINT_LEVEL_COST) {
    return false
  }

  player.addLevels(-SKILL_POINT_LEVEL_COST)
  addSkillPoints(player, 1)
  return true
}
