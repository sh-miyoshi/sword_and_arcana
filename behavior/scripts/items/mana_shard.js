import { ItemStack, world } from '@minecraft/server'

const AMETHYST_CLUSTER_ID = 'minecraft:amethyst_cluster'
const MANA_SHARD_DROP_CHANCE = 0.25

world.afterEvents.playerBreakBlock.subscribe(event => {
  if (event.brokenBlockPermutation.type.id !== AMETHYST_CLUSTER_ID) {
    return
  }

  if (Math.random() >= MANA_SHARD_DROP_CHANCE) {
    return
  }

  event.player.dimension.spawnItem(
    new ItemStack('my:mana_shard', 1),
    event.block.location
  )
})
