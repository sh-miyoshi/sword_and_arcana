// scripts/projectiles/ice_ball.js

import { system } from '@minecraft/server'

const ICE_BALL_ID = 'my:ice_ball'

const SPEED = 1.5
const LIFETIME = 40

/**
 * プレイヤーからエナジーボールを発射する
 */
export function shootIceBall (player) {
  const direction = player.getViewDirection()
  const head = player.getHeadLocation()

  // プレイヤーの少し前から生成する
  const spawnLocation = {
    x: head.x + direction.x,
    y: head.y + direction.y,
    z: head.z + direction.z
  }

  const ball = player.dimension.spawnEntity(ICE_BALL_ID, spawnLocation)

  const projectile = ball.getComponent('minecraft:projectile')

  if (!projectile) {
    ball.remove()
    return
  }

  // この弾を撃ったプレイヤー
  projectile.owner = player

  // 視線方向へ発射
  projectile.shoot(
    {
      x: direction.x * SPEED,
      y: direction.y * SPEED,
      z: direction.z * SPEED
    },
    {
      uncertainty: 0
    }
  )

  // 当たらず残り続けた場合の保険
  system.runTimeout(() => {
    if (ball.isValid) {
      ball.remove()
    }
  }, LIFETIME)
}
