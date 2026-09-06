import './weapons/rod_charge.js'
import './weapons/fire_rod_charge.js'
import './weapons/ice_rod_charge.js'
import './weapons/fire_sword_charge.js'
import './player/mana.js'
import './player/health.js'
import './items/skill_book.js'
import './items/mana_berry.js'

import { system, Player } from '@minecraft/server'

import { resetSkills } from './skills/skill_data.js'

import { applyHealthSkill } from './player/health.js'

system.afterEvents.scriptEventReceive.subscribe(event => {
  if (event.id !== 'my:reset_skills') {
    return
  }

  const player = event.sourceEntity

  if (!(player instanceof Player)) {
    return
  }

  resetSkills(player)

  // 体力スキルの効果も解除
  applyHealthSkill(player)

  player.sendMessage('§aスキルを初期化しました。')
})
