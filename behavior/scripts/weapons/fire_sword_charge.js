import { system } from '@minecraft/server'

system.beforeEvents.startup.subscribe(event => {
  event.itemComponentRegistry.registerCustomComponent('my:fire_sword_charge', {
    onCompleteUse (event) {
      const player = event.source

      system.run(() => {
        fireSwordChargeAttack(player)
      })
    }
  })
})

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
