import { system } from '@minecraft/server'

import { showSkillPanel } from '../skills/skill_panel.js'

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
