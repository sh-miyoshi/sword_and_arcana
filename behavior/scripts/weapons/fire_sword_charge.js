import {
  EntityDamageCause,
  EquipmentSlot,
  world,
  system
} from '@minecraft/server'

import { useMana } from '../player/mana.js'
import { getElementalChargeDamage } from '../items/elemental_berries.js'
import { setActionChargeCount } from '../action_bar.js'
import { getAttackChargeRequiredTicks } from '../skills/skill_data.js'

const FIRE_SWORD_ID = 'my:fire_sword'
const CHARGED_MANA_COST = 1
const CHARGED_ATTACK_DAMAGE = 8
const FIRE_DURATION_SECONDS = 5
const HIT_RANGE = 5
const HIT_HALF_ANGLE = 70
const HIT_MIN_HEIGHT = -1.5
const HIT_MAX_HEIGHT = 2.5
const DEBUG_HITBOX = false
const chargeStartTicks = new Map()

system.beforeEvents.startup.subscribe(event => {
  event.itemComponentRegistry.registerCustomComponent('my:fire_sword_charge', {
    onCompleteUse (event) {
      finishCharge(event.source)
    }
  })
})

world.afterEvents.itemStartUse.subscribe(event => {
  const item = event.itemStack

  if (!item || item.typeId !== FIRE_SWORD_ID) {
    return
  }

  chargeStartTicks.set(event.source.id, system.currentTick)
})

world.afterEvents.itemReleaseUse.subscribe(event => {
  const item = event.itemStack

  if (!item || item.typeId !== FIRE_SWORD_ID) {
    return
  }

  finishCharge(event.source)
})

function finishCharge (player) {
  const startTick = chargeStartTicks.get(player.id)

  chargeStartTicks.delete(player.id)
  setActionChargeCount(0, player)

  if (startTick === undefined) {
    return
  }

  const chargedTicks = system.currentTick - startTick
  const chargeRequiredTicks = getAttackChargeRequiredTicks(player)

  if (chargedTicks < chargeRequiredTicks) {
    return
  }

  if (!useMana(player, CHARGED_MANA_COST)) {
    player.sendMessage('MPが足りません。')
    return
  }

  system.run(() => {
    fireSwordChargeAttack(player)
  })
}

system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    const startTick = chargeStartTicks.get(player.id)

    if (startTick === undefined) {
      continue
    }

    const equippable = player.getComponent('minecraft:equippable')
    const heldItem = equippable?.getEquipment(EquipmentSlot.Mainhand)

    if (!heldItem || heldItem.typeId !== FIRE_SWORD_ID) {
      chargeStartTicks.delete(player.id)
      setActionChargeCount(0, player)
      continue
    }

    const chargedTicks = system.currentTick - startTick
    const chargeRequiredTicks = getAttackChargeRequiredTicks(player)
    const ratio = Math.min(chargedTicks / chargeRequiredTicks, 1)
    const filled = Math.floor(ratio * 10)
    setActionChargeCount(filled, player)
  }
}, 2)

function fireSwordChargeAttack (player) {
  const view = player.getViewDirection()

  // 水平方向に正規化
  const length = Math.sqrt(view.x * view.x + view.z * view.z)

  if (length === 0) {
    return
  }

  const forward = {
    x: view.x / length,
    z: view.z / length
  }

  spawnFireSlash(player, forward)
  player.dimension.playSound('my.fire', player.location, {
    volume: 1,
    pitch: 1
  })
}

function spawnFireSlash (player, forward) {
  const dimension = player.dimension
  const origin = player.location

  // プレイヤーの前方3.5ブロックを中心にする
  const centerX = origin.x + forward.x * 3.5
  const centerZ = origin.z + forward.z * 3.5

  // 横方向ベクトル
  const right = {
    x: -forward.z,
    z: forward.x
  }

  // -70度 ～ +70度
  for (let angle = -70; angle <= 70; angle += 7) {
    const rad = (angle * Math.PI) / 180

    // 半径
    const radius = 3.5

    // 半月の形
    const side = Math.sin(rad) * radius
    const front = Math.cos(rad) * 1.2

    const particlePos = {
      x: centerX + right.x * side + forward.x * front,

      y: origin.y + 1.2 + Math.sin(rad) * 0.6,

      z: centerZ + right.z * side + forward.z * front
    }

    dimension.spawnParticle('minecraft:basic_flame_particle', particlePos)
  }

  const targets = getFireSlashTargets(player, forward)

  for (const target of targets) {
    target.applyDamage(getElementalChargeDamage(player, 'fire', CHARGED_ATTACK_DAMAGE), {
      cause: EntityDamageCause.entityAttack,
      damagingEntity: player
    })
    target.setOnFire(FIRE_DURATION_SECONDS, true)

    const targetLocation = target.location

    dimension.spawnParticle('minecraft:critical_hit_emitter', {
      x: targetLocation.x,
      y: targetLocation.y + 1,
      z: targetLocation.z
    })
  }

  showFireSlashHitbox(player, forward)

  if (DEBUG_HITBOX) {
    player.sendMessage(`炎斬撃の命中数: ${targets.length}`)
  }
}

function getFireSlashTargets (player, forward) {
  const origin = player.location
  const minimumDot = Math.cos((HIT_HALF_ANGLE * Math.PI) / 180)

  return player.dimension
    .getEntities({
      location: origin,
      maxDistance: HIT_RANGE
    })
    .filter(target => {
      if (target.id === player.id || target.typeId === 'minecraft:item') {
        return false
      }

      const offsetX = target.location.x - origin.x
      const offsetY = target.location.y - origin.y
      const offsetZ = target.location.z - origin.z

      if (offsetY < HIT_MIN_HEIGHT || offsetY > HIT_MAX_HEIGHT) {
        return false
      }

      const horizontalDistance = Math.sqrt(
        offsetX * offsetX + offsetZ * offsetZ
      )

      if (horizontalDistance === 0 || horizontalDistance > HIT_RANGE) {
        return false
      }

      const directionDot =
        (offsetX * forward.x + offsetZ * forward.z) / horizontalDistance

      return directionDot >= minimumDot
    })
}

function showFireSlashHitbox (player, forward) {
  const dimension = player.dimension
  const origin = player.location
  const right = {
    x: -forward.z,
    z: forward.x
  }

  for (let distance = 1; distance <= HIT_RANGE; distance += 1) {
    for (let angle = -HIT_HALF_ANGLE; angle <= HIT_HALF_ANGLE; angle += 14) {
      const rad = (angle * Math.PI) / 180
      const hitPosition = {
        x:
          origin.x +
          forward.x * Math.cos(rad) * distance +
          right.x * Math.sin(rad) * distance,
        y: origin.y + 0.15,
        z:
          origin.z +
          forward.z * Math.cos(rad) * distance +
          right.z * Math.sin(rad) * distance
      }

      dimension.spawnParticle('minecraft:basic_flame_particle', hitPosition)
    }
  }
}
