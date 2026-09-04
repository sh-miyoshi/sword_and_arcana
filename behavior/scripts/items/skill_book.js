import {
  system,
  world,
  ItemStack,
  EntityComponentTypes
} from '@minecraft/server'

import { showSkillPanel } from '../skills/skill_panel.js'

// スキルパネルを開く処理
const SkillBookComponent = {
  onUse (event) {
    const player = event.source

    // 次のtickでスキル画面を開く
    system.run(() => {
      showSkillPanel(player)
    })
  }
}

system.beforeEvents.startup.subscribe(event => {
  event.itemComponentRegistry.registerCustomComponent(
    'my:open_skill_panel',
    SkillBookComponent
  )
})

// 初期荷物に入れる処理
world.afterEvents.playerSpawn.subscribe(event => {
  const player = event.player

  // 死亡後のリスポーンでは処理しない
  if (!event.initialSpawn) return

  // すでにスキルブックを受け取っているなら処理しない
  const received = player.getDynamicProperty('skill_book_received')
  if (received) return

  const inventory = player.getComponent(EntityComponentTypes.Inventory)

  if (!inventory?.container) return

  // スキルブックを1個追加
  const skillBook = new ItemStack('my:skill_book', 1)

  inventory.container.addItem(skillBook)

  // 受け取り済みにする
  player.setDynamicProperty('skill_book_received', true)
})
