import { EquipmentSlot, world } from '@minecraft/server'

const FIRE_SWORD_ID = 'my:fire_sword'
const FIRE_DURATION_SECONDS = 5

world.afterEvents.entityHitEntity.subscribe(event => {
  const attacker = event.damagingEntity
  const equippable = attacker.getComponent('minecraft:equippable')
  const heldItem = equippable?.getEquipment(EquipmentSlot.Mainhand)

  if (!heldItem || heldItem.typeId !== FIRE_SWORD_ID) {
    return
  }

  event.hitEntity.setOnFire(FIRE_DURATION_SECONDS, true)
})
