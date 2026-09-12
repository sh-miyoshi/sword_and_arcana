import { system } from '@minecraft/server'
import { activateElementalPower } from '../effects/elemental_power.js'

system.beforeEvents.startup.subscribe(event => {
  for (const element of ['fire', 'ice']) {
    event.itemComponentRegistry.registerCustomComponent(`my:${element}_power`, {
      onConsume ({ source: player }) {
        if (player.typeId !== 'minecraft:player') return
        activateElementalPower(player, element)
      }
    })
  }
})
