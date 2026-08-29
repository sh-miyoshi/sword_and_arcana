import {
  CustomForm,
  ObservableString,
  ObservableBoolean
} from '@minecraft/server-ui'

import {
  getHealthSkill,
  getAttackSkill,
  getSkillPoints,
  upgradeHealthSkill,
  upgradeAttackSkill,
  MAX_SKILL_LEVEL
} from './skill_data.js'

import { applyHealthSkill } from '../player/health.js'

export function showSkillPanel (player) {
  // -------------------------
  // 表示用Observable
  // -------------------------

  const pointsText = new ObservableString(
    `§eスキルポイント: ${getSkillPoints(player)}`
  )

  const healthText = new ObservableString(
    `§c❤ 体力  Lv ${getHealthSkill(player)} / ${MAX_SKILL_LEVEL}`
  )

  const attackText = new ObservableString(
    `§f⚔ 攻撃力  Lv ${getAttackSkill(player)} / ${MAX_SKILL_LEVEL}`
  )

  // -------------------------
  // ボタンの有効/無効
  // -------------------------

  const healthButtonDisabled = new ObservableBoolean(!canUpgradeHealth(player))

  const attackButtonDisabled = new ObservableBoolean(!canUpgradeAttack(player))

  // -------------------------
  // 表示更新
  // -------------------------

  function updateDisplay () {
    const points = getSkillPoints(player)
    const healthLevel = getHealthSkill(player)
    const attackLevel = getAttackSkill(player)

    pointsText.setData(`§eスキルポイント: ${points}`)

    healthText.setData(`§c❤ 体力  Lv ${healthLevel} / ${MAX_SKILL_LEVEL}`)

    attackText.setData(`§f⚔ 攻撃力  Lv ${attackLevel} / ${MAX_SKILL_LEVEL}`)

    healthButtonDisabled.setData(!canUpgradeHealth(player))

    attackButtonDisabled.setData(!canUpgradeAttack(player))
  }

  // -------------------------
  // UI
  // -------------------------

  const form = new CustomForm(player, '§lスキル')
    .header(pointsText)

    .divider()

    .label(healthText)

    .button(
      '＋ 体力を強化',
      () => {
        if (!upgradeHealthSkill(player)) {
          return
        }

        // 実際の最大HPに反映
        applyHealthSkill(player)

        // UIだけ更新
        updateDisplay()
      },
      {
        disabled: healthButtonDisabled,
        tooltip: '体力スキルを1上げます'
      }
    )

    .spacer()

    .divider()

    .label(attackText)

    .button(
      '＋ 攻撃力を強化',
      () => {
        if (!upgradeAttackSkill(player)) {
          return
        }

        updateDisplay()
      },
      {
        disabled: attackButtonDisabled,
        tooltip: '攻撃力スキルを1上げます'
      }
    )

    .spacer()

    .closeButton()

  form.show().catch(error => {
    console.error(`Skill panel error: ${error}`)
  })
}

/**
 * 体力を強化可能か
 */
function canUpgradeHealth (player) {
  return getSkillPoints(player) > 0 && getHealthSkill(player) < MAX_SKILL_LEVEL
}

/**
 * 攻撃力を強化可能か
 */
function canUpgradeAttack (player) {
  return getSkillPoints(player) > 0 && getAttackSkill(player) < MAX_SKILL_LEVEL
}
