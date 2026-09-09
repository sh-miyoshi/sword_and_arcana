import { EntityDamageCause, world } from '@minecraft/server'
import { getAttackDamageBonus } from '../skills/skill_data.js'

world.beforeEvents.entityHurt.subscribe(event => {
  const { cause, damagingEntity } = event.damageSource
  if (event.cancel || event.damage <= 0 ||
      cause !== EntityDamageCause.entityAttack ||
      damagingEntity?.typeId !== 'minecraft:player') {
    return
  }

  // Includes sword charge attacks, which use entityAttack as their damage cause.
  event.damage += getAttackDamageBonus(damagingEntity)
})
