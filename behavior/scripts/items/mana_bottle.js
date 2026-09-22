import { system, world } from '@minecraft/server'

const MANA_BOTTLE_PROJECTILE_ID = 'my:mana_bottle_projectile'
const MAGIC_CIRCLE_ID = 'my:magic_circle'

function createMagicCircle (event) {
  const { dimension, location } = event

  // remove_on_hit で発射体が消えても参照できる着弾イベントの情報を使う。
  const spawnLocation = {
    x: location.x,
    y: location.y + 0.05,
    z: location.z
  }

  system.run(() => {
    dimension.spawnEntity(MAGIC_CIRCLE_ID, spawnLocation)
  })
}

world.afterEvents.projectileHitBlock.subscribe(event => {
  if (event.projectile.typeId !== MANA_BOTTLE_PROJECTILE_ID) return
  createMagicCircle(event)
})

world.afterEvents.projectileHitEntity.subscribe(event => {
  if (event.projectile.typeId !== MANA_BOTTLE_PROJECTILE_ID) return
  createMagicCircle(event)
})
