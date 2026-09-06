import { world, system } from '@minecraft/server'
import { setActionMana } from '../action_bar.js'
import { getMagicSkill } from '../skills/skill_data.js'

const MANA_PROPERTY = 'my:mana'

export const MAX_MANA = 5
export const MANA_REGEN_AMOUNT = 1
export const MANA_REGEN_INTERVAL = 100 // 20tick = 約1秒
export const MANA_DISPLAY_INTERVAL = 10

export function getMaxMana (player) {
  return MAX_MANA + getMagicSkill(player)
}

/**
 * MPを取得する
 */
export function getMana (player) {
  const mana = player.getDynamicProperty(MANA_PROPERTY)
  const maxMana = getMaxMana(player)

  // まだMPが設定されていない場合
  if (typeof mana !== 'number') {
    player.setDynamicProperty(MANA_PROPERTY, maxMana)
    return maxMana
  }

  const clampedMana = Math.max(0, Math.min(maxMana, mana))

  if (clampedMana !== mana) {
    player.setDynamicProperty(MANA_PROPERTY, clampedMana)
  }

  return clampedMana
}

/**
 * MPを設定する
 */
export function setMana (player, amount) {
  // 0～MAX_MANAの範囲に収める
  const newMana = Math.max(0, Math.min(getMaxMana(player), amount))

  player.setDynamicProperty(MANA_PROPERTY, newMana)
  updateManaHud(player)
}

/**
 * MPを消費する
 *
 * 消費できた場合 true
 * MP不足の場合 false
 */
export function useMana (player, amount) {
  const mana = getMana(player)

  if (mana < amount) {
    return false
  }

  setMana(player, mana - amount)

  return true
}

/**
 * MPを回復する
 */
export function restoreMana (player, amount) {
  const mana = getMana(player)

  setMana(player, mana + amount)
}

function updateManaHud (player) {
  const mana = getMana(player)
  const maxMana = getMaxMana(player)

  const ratio = maxMana <= 0 ? 0 : Math.max(0, Math.min(1, mana / maxMana))

  const step = Math.round(ratio * 10)
  setActionMana(step, player)
}

/**
 * プレイヤーがワールドに入ったときに初期化
 */
world.afterEvents.playerSpawn.subscribe(event => {
  const player = event.player

  getMana(player)
  updateManaHud(player)
})

/**
 * MP回復
 */
system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    const mana = getMana(player)
    const maxMana = getMaxMana(player)

    if (mana < maxMana) {
      restoreMana(player, MANA_REGEN_AMOUNT)
    }
  }
}, MANA_REGEN_INTERVAL)

system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    updateManaHud(player)
  }
}, MANA_DISPLAY_INTERVAL)
