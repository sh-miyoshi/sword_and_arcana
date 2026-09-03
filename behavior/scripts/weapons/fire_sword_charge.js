import { world, system } from '@minecraft/server'

import { useMana } from '../player/mana.js'

const FIRE_SWORD_ID = 'my:fire_sword'
const CHARGE_REQUIRED_TICKS = 20
const CHARGED_MANA_COST = 3
const chargeStartTicks = new Map()

system.beforeEvents.startup.subscribe(event => {
  event.itemComponentRegistry.registerCustomComponent('my:fire_sword_charge', {
    onCompleteUse (event) {
      finishCharge(event.source)
    }
  })
})

world.afterEvents.itemStartUse.subscribe(event => {
  const item = event.itemStack

  if (!item || item.typeId !== FIRE_SWORD_ID) {
    return
  }

  chargeStartTicks.set(event.source.id, system.currentTick)
})

world.afterEvents.itemReleaseUse.subscribe(event => {
  const item = event.itemStack

  if (!item || item.typeId !== FIRE_SWORD_ID) {
    return
  }

  finishCharge(event.source)
})

function finishCharge (player) {
  const startTick = chargeStartTicks.get(player.id)

  chargeStartTicks.delete(player.id)
  player.onScreenDisplay.setActionBar('')

  if (startTick === undefined) {
    return
  }

  const chargedTicks = system.currentTick - startTick

  if (chargedTicks < CHARGE_REQUIRED_TICKS) {
    return
  }

  if (!useMana(player, CHARGED_MANA_COST)) {
    player.sendMessage('MPが足りません。')
    return
  }

  system.run(() => {
    fireSwordChargeAttack(player)
  })
}

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

function fireSwordChargeAttack (player) {
  const view = player.getViewDirection()

  // 水平方向に正規化
  const length = Math.sqrt(view.x * view.x + view.z * view.z)

  if (length === 0) {
    return
  }

  const forward = {
    x: view.x / length,
    z: view.z / length
  }

  spawnFireSlash(player, forward)
}

function spawnFireSlash (player, forward) {
  const dimension = player.dimension
  const origin = player.location

  // プレイヤーの前方2.5ブロックを中心にする
  const centerX = origin.x + forward.x * 2.5
  const centerZ = origin.z + forward.z * 2.5

  // 横方向ベクトル
  const right = {
    x: -forward.z,
    z: forward.x
  }

  // -70度 ～ +70度
  for (let angle = -70; angle <= 70; angle += 10) {
    const rad = (angle * Math.PI) / 180

    // 半径
    const radius = 2.2

    // 半月の形
    const side = Math.sin(rad) * radius
    const front = Math.cos(rad) * 0.8

    const particlePos = {
      x: centerX + right.x * side + forward.x * front,

      y: origin.y + 1.2 + Math.sin(rad) * 0.6,

      z: centerZ + right.z * side + forward.z * front
    }

    dimension.spawnParticle('minecraft:basic_flame_particle', particlePos)
  }
}
