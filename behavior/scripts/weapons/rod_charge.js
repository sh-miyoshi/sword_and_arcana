import { EquipmentSlot, world, system } from '@minecraft/server'
import { shootEnergyBall } from '../projectiles/energy_ball.js'
import { useMana } from '../player/mana.js'
import { setActionChargeCount } from '../action_bar.js'

const ROD_ID = 'my:rod'

const CHARGE_REQUIRED_TICKS = 20 // 20tick = 約1秒
const CHARGED_MANA_COST = 2

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
  setActionChargeCount(0, player)

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

  shootEnergyBall(player)
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

    const equippable = player.getComponent('minecraft:equippable')
    const heldItem = equippable?.getEquipment(EquipmentSlot.Mainhand)

    if (!heldItem || heldItem.typeId !== ROD_ID) {
      chargeStartTicks.delete(player.id)
      setActionChargeCount(0, player)
      continue
    }

    const chargedTicks = system.currentTick - startTick
    const ratio = Math.min(chargedTicks / CHARGE_REQUIRED_TICKS, 1)
    const filled = Math.floor(ratio * 10)
    setActionChargeCount(filled, player)
  }
}, 2)
