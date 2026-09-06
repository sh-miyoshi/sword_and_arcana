import { system, world, ItemStack } from '@minecraft/server'

import { getMaxMana, setMana } from '../player/mana.js'

// 魔力の実を使用した時の処理
system.beforeEvents.startup.subscribe(event => {
  event.itemComponentRegistry.registerCustomComponent('my:restore_mana', {
    onConsume (event) {
      const player = event.source

      system.run(() => {
        setMana(player, getMaxMana(player))
        player.sendMessage('§bMPが最大まで回復しました。')
      })
    }
  })
})

// 手に入れるときの処理
const LEAVES = new Set([
  'minecraft:oak_leaves',
  'minecraft:spruce_leaves',
  'minecraft:birch_leaves',
  'minecraft:jungle_leaves',
  'minecraft:acacia_leaves',
  'minecraft:dark_oak_leaves',
  'minecraft:mangrove_leaves',
  'minecraft:cherry_leaves'
])

world.afterEvents.playerBreakBlock.subscribe(event => {
  const blockId = event.brokenBlockPermutation.type.id

  // 葉っぱ以外なら何もしない
  if (!LEAVES.has(blockId)) {
    return
  }

  // 10%の確率でドロップ
  if (Math.random() >= 0.1) {
    return
  }

  const manaBerry = new ItemStack('my:mana_berry', 1)

  event.player.dimension.spawnItem(manaBerry, event.block.location)
})
