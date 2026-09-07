import { system, world } from '@minecraft/server'

const FIRE_BALL_ID = 'my:fire_ball'
const SPEED = 1.5
const LIFETIME_TICKS = 40
const FIRE_DURATION_SECONDS = 5

const activeFireBalls = new Map()

export function shootFireBall (player) {
  const direction = player.getViewDirection()
  const head = player.getHeadLocation()
  const spawnLocation = {
    x: head.x + direction.x,
    y: head.y + direction.y,
    z: head.z + direction.z
  }

  const ball = player.dimension.spawnEntity(FIRE_BALL_ID, spawnLocation)
  const projectile = ball.getComponent('minecraft:projectile')

  if (!projectile) {
    ball.remove()
    return
  }

  projectile.owner = player
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

  activeFireBalls.set(ball.id, ball)

  system.runTimeout(() => {
    activeFireBalls.delete(ball.id)

    if (ball.isValid) {
      ball.remove()
    }
  }, LIFETIME_TICKS)
}

world.afterEvents.projectileHitEntity.subscribe(event => {
  if (event.projectile.typeId !== FIRE_BALL_ID) {
    return
  }

  activeFireBalls.delete(event.projectile.id)

  const hitEntity = event.getEntityHit()?.entity

  if (!hitEntity) {
    return
  }

  hitEntity.setOnFire(FIRE_DURATION_SECONDS, true)
})

world.afterEvents.projectileHitBlock.subscribe(event => {
  if (event.projectile.typeId === FIRE_BALL_ID) {
    activeFireBalls.delete(event.projectile.id)
  }
})

system.runInterval(() => {
  for (const [id, ball] of activeFireBalls) {
    if (!ball.isValid) {
      activeFireBalls.delete(id)
      continue
    }

    const location = ball.location

    ball.dimension.spawnParticle('minecraft:basic_flame_particle', location)
    ball.dimension.spawnParticle('minecraft:basic_flame_particle', {
      x: location.x + (Math.random() - 0.5) * 0.35,
      y: location.y + (Math.random() - 0.5) * 0.35,
      z: location.z + (Math.random() - 0.5) * 0.35
    })
  }
}, 1)
