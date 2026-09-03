import { system } from '@minecraft/server'

import { MAX_MANA, setMana } from '../player/mana.js'

system.beforeEvents.startup.subscribe(event => {
  event.itemComponentRegistry.registerCustomComponent('my:restore_mana', {
    onConsume (event) {
      const player = event.source

      system.run(() => {
        setMana(player, MAX_MANA)
        player.sendMessage('§bMPが最大まで回復しました。')
      })
    }
  })
})
