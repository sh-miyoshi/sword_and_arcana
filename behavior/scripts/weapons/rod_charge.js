import { world, system } from '@minecraft/server'
import { shootChargedEnergyBall } from '../projectiles/charged_energy_ball.js'
import { useMana } from '../player/mana.js'
import { getMagicSkill } from '../skills/skill_data.js'

const ROD_ID = 'my:rod'

const CHARGE_REQUIRED_TICKS = 20 // 20tick = 約1秒
const CHARGED_MANA_COST = 2
const REQUIRED_MAGIC_LEVEL = 1

const chargeStartTicks = new Map()

/**
 * チャージ開始
 */
world.afterEvents.itemStartUse.subscribe(event => {
  const item = event.itemStack

  if (!item || item.typeId !== ROD_ID) {
    return
  }

  const player = event.source

  if (getMagicSkill(player) < REQUIRED_MAGIC_LEVEL) {
    return
  }

  chargeStartTicks.set(player.id, system.currentTick)
})

/**
 * チャージ解除
 */
world.afterEvents.itemReleaseUse.subscribe(event => {
  const item = event.itemStack

  if (!item || item.typeId !== ROD_ID) {
    return
  }

  const player = event.source

  const startTick = chargeStartTicks.get(player.id)

  // チャージ状態解除
  chargeStartTicks.delete(player.id)

  // ゲージを消す
  player.onScreenDisplay.setActionBar('')

  if (startTick === undefined) {
    return
  }

  const chargedTicks = system.currentTick - startTick

  // -------------------------
  // 1秒未満なら不発
  // -------------------------

  if (chargedTicks < CHARGE_REQUIRED_TICKS) {
    return
  }

  // -------------------------
  // MP確認
  // -------------------------

  if (!useMana(player, CHARGED_MANA_COST)) {
    player.sendMessage('MPが足りません。')
    return
  }

  // -------------------------
  // チャージ弾発射
  // -------------------------

  shootChargedEnergyBall(player)
})

/**
 * チャージゲージ表示
 */
system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    const startTick = chargeStartTicks.get(player.id)

    if (startTick === undefined) {
      continue
    }

    const chargedTicks = system.currentTick - startTick

    const ratio = Math.min(chargedTicks / CHARGE_REQUIRED_TICKS, 1)

    const filled = Math.floor(ratio * 10)

    const gauge = '■'.repeat(filled) + '□'.repeat(10 - filled)

    if (ratio >= 1) {
      player.onScreenDisplay.setActionBar(`[${gauge}] CHARGED!`)
    } else {
      player.onScreenDisplay.setActionBar(`[${gauge}]`)
    }
  }
}, 2)
