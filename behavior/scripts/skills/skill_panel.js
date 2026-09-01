import {
  CustomForm,
  ObservableString,
  ObservableBoolean
} from '@minecraft/server-ui'

import {
  getHealthSkill,
  getAttackSkill,
  getMagicSkill,
  getSkillPoints,
  upgradeHealthSkill,
  upgradeAttackSkill,
  upgradeMagicSkill,
  MAX_SKILL_LEVEL,
  exchangeExperienceForSkillPoint,
  SKILL_POINT_LEVEL_COST
} from './skill_data.js'

import { applyHealthSkill } from '../player/health.js'

export function showSkillPanel (player) {
  // -------------------------
  // 表示用Observable
  // -------------------------

  const pointsText = new ObservableString(
    `§eスキルポイント: ${getSkillPoints(player)}`
  )

  const experienceText = new ObservableString(`経験値 Lv ${player.level}`)

  const healthText = new ObservableString(
    `§c❤ 体力  Lv ${getHealthSkill(player)} / ${MAX_SKILL_LEVEL}`
  )

  const attackText = new ObservableString(
    `§f⚔ 攻撃力  Lv ${getAttackSkill(player)} / ${MAX_SKILL_LEVEL}`
  )

  const magicText = new ObservableString(
    `✦ 魔力  Lv ${getMagicSkill(player)} / ${MAX_SKILL_LEVEL}`
  )

  // -------------------------
  // ボタンの有効/無効
  // -------------------------

  const healthButtonDisabled = new ObservableBoolean(!canUpgradeHealth(player))
  const attackButtonDisabled = new ObservableBoolean(!canUpgradeAttack(player))
  const magicButtonDisabled = new ObservableBoolean(!canUpgradeMagic(player))
  const exchangeButtonDisabled = new ObservableBoolean(
    player.level < SKILL_POINT_LEVEL_COST
  )

  // -------------------------
  // 表示更新
  // -------------------------

  function updateDisplay () {
    const points = getSkillPoints(player)
    const healthLevel = getHealthSkill(player)
    const attackLevel = getAttackSkill(player)
    const magicLevel = getMagicSkill(player)

    pointsText.setData(`§eスキルポイント: ${points}`)
    experienceText.setData(`経験値 Lv ${player.level}`)
    healthText.setData(`§c❤ 体力  Lv ${healthLevel} / ${MAX_SKILL_LEVEL}`)
    attackText.setData(`§f⚔ 攻撃力  Lv ${attackLevel} / ${MAX_SKILL_LEVEL}`)
    magicText.setData(`✦ 魔力  Lv ${magicLevel} / ${MAX_SKILL_LEVEL}`)

    healthButtonDisabled.setData(!canUpgradeHealth(player))
    attackButtonDisabled.setData(!canUpgradeAttack(player))
    magicButtonDisabled.setData(!canUpgradeMagic(player))
    exchangeButtonDisabled.setData(player.level < SKILL_POINT_LEVEL_COST)
  }

  // -------------------------
  // UI
  // -------------------------

  const form = new CustomForm(player, '§lスキル')
    .header(pointsText)
    .spacer()
    .label(experienceText)
    .button(
      `経験値Lv${SKILL_POINT_LEVEL_COST} → スキルポイント+1`,
      () => {
        if (!exchangeExperienceForSkillPoint(player)) {
          return
        }

        updateDisplay()
      },
      {
        disabled: exchangeButtonDisabled,
        tooltip: `経験値レベルを${SKILL_POINT_LEVEL_COST}消費します`
      }
    )
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
    .divider()

    .label(magicText)
    .button(
      '＋ 魔力を強化',
      () => {
        if (!upgradeMagicSkill(player)) {
          return
        }

        updateDisplay()
      },
      {
        disabled: magicButtonDisabled,
        tooltip: 'Lv1でチャージ攻撃を解放します'
      }
    )
    .spacer()
    .closeButton()

  form.show().catch(error => {
    console.error(`Skill panel error: ${error}`)
  })
}

function canUpgradeHealth (player) {
  return getSkillPoints(player) > 0 && getHealthSkill(player) < MAX_SKILL_LEVEL
}

function canUpgradeAttack (player) {
  return getSkillPoints(player) > 0 && getAttackSkill(player) < MAX_SKILL_LEVEL
}

function canUpgradeMagic (player) {
  return getSkillPoints(player) > 0 && getMagicSkill(player) < MAX_SKILL_LEVEL
}
