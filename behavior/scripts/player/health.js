import { world, system } from '@minecraft/server'

import { getHealthSkill } from '../skills/skill_data.js'

const HEALTH_BOOST_DURATION = 20000000

/**
 * 体力スキルを実際の最大HPへ反映する
 */
export function applyHealthSkill (player) {
  const level = getHealthSkill(player)

  // Lv0ならHealth Boostなし
  if (level <= 0) {
    player.removeEffect('health_boost')
    return
  }

  player.addEffect('health_boost', HEALTH_BOOST_DURATION, {
    // amplifier 0 = Health Boost I
    amplifier: level - 1,
    showParticles: false
  })
}

/**
 * ログイン・リスポーン時に反映
 */
world.afterEvents.playerSpawn.subscribe(event => {
  system.run(() => {
    applyHealthSkill(event.player)
  })
})
