import { EntityDamageCause, EquipmentSlot, world, system } from '@minecraft/server'

import { useMana } from '../player/mana.js'
import { applyChargeDamage } from '../combat/damage.js'
import { setActionChargeCount } from '../action_bar.js'
import { getAttackChargeRequiredTicks } from '../skills/skill_data.js'

const THUNDER_SWORD_ID = 'my:thunder_sword'
const CHARGED_MANA_COST = 1
const CHARGED_ATTACK_DAMAGE = 8
const HIT_RANGE = 12
const HIT_HALF_WIDTH = 0.75
const HIT_MIN_HEIGHT = -1.5
const HIT_MAX_HEIGHT = 2.5
const BOLT_SEGMENTS = 24
const PARTICLE_SPACING = 0.14
const FLASH_DELAYS = [3, 6]
const charges = new Map()

system.beforeEvents.startup.subscribe(event => {
  event.itemComponentRegistry.registerCustomComponent('my:thunder_sword_charge', {
    onCompleteUse (event) { finishCharge(event.source) }
  })
})

function cancelCharge (player) {
  if (charges.delete(player.id)) setActionChargeCount(0, player)
}

function isChargeValid (player, charge) {
  const held = player.getComponent('minecraft:equippable')?.getEquipment(EquipmentSlot.Mainhand)
  return held?.typeId === THUNDER_SWORD_ID &&
    player.selectedSlotIndex === charge.slot &&
    player.dimension.id === charge.dimensionId &&
    player.getComponent('minecraft:health')?.currentValue > 0
}

world.afterEvents.itemStartUse.subscribe(event => {
  if (event.itemStack?.typeId !== THUNDER_SWORD_ID) return
  const player = event.source
  charges.set(player.id, {
    startTick: system.currentTick,
    requiredTicks: getAttackChargeRequiredTicks(player),
    slot: player.selectedSlotIndex,
    dimensionId: player.dimension.id
  })
  setActionChargeCount(0, player)
})

world.afterEvents.itemReleaseUse.subscribe(event => {
  if (event.itemStack?.typeId === THUNDER_SWORD_ID) finishCharge(event.source)
})

world.afterEvents.itemStopUse.subscribe(event => {
  if (event.itemStack?.typeId !== THUNDER_SWORD_ID) return
  const player = event.source
  const charge = charges.get(player.id)
  // 同じtickのReleaseUse/CompleteUseを先に処理し、新しいチャージも消さない。
  system.run(() => {
    if (charge && player.isValid && charges.get(player.id) === charge) cancelCharge(player)
  })
})

world.afterEvents.playerLeave.subscribe(event => charges.delete(event.playerId))
world.afterEvents.playerDimensionChange.subscribe(event => cancelCharge(event.player))
world.afterEvents.entityDie.subscribe(event => {
  if (event.deadEntity.typeId === 'minecraft:player') cancelCharge(event.deadEntity)
})

function finishCharge (player) {
  const charge = charges.get(player.id)
  if (!charge) return
  cancelCharge(player)
  if (!isChargeValid(player, charge) || system.currentTick - charge.startTick < charge.requiredTicks) return
  if (!useMana(player, CHARGED_MANA_COST)) {
    player.sendMessage('MPが足りません。')
    return
  }

  const dimension = player.dimension
  const origin = { ...player.location }
  // 真上・真下を見ている場合も、水平の向きはプレイヤーのyawから決める。
  const yaw = player.getRotation().y * Math.PI / 180
  const forward = { x: -Math.sin(yaw), z: Math.cos(yaw) }
  const right = { x: forward.z, z: -forward.x }
  damageLine(player, dimension, origin, forward, right)

  // 演出の読み込み失敗でダメージ処理が止まらないよう、演出は後に行う。
  showThunderLine(dimension, origin, forward, right)
  for (const delay of FLASH_DELAYS) {
    system.runTimeout(() => showThunderLine(dimension, origin, forward, right), delay)
  }
  try {
    dimension.playSound('ambient.weather.thunder', origin, { volume: 0.7, pitch: 1.1 })
  } catch (error) {
    console.warn(`[thunder_sword] 雷鳴の再生失敗: ${error}`)
  }
}

function damageLine (player, dimension, origin, forward, right) {
  const targets = dimension.getEntities({
    location: origin,
    maxDistance: Math.hypot(HIT_RANGE, HIT_HALF_WIDTH, Math.max(-HIT_MIN_HEIGHT, HIT_MAX_HEIGHT))
  })
  for (const target of targets) {
    try {
      if (!target.isValid || target.typeId === 'minecraft:player' ||
          target.typeId === 'minecraft:armor_stand' || !target.getComponent('minecraft:health')) continue
      const dx = target.location.x - origin.x
      const dy = target.location.y - origin.y
      const dz = target.location.z - origin.z
      const distanceForward = dx * forward.x + dz * forward.z
      const distanceSide = dx * right.x + dz * right.z
      if (distanceForward <= 0 || distanceForward > HIT_RANGE ||
          Math.abs(distanceSide) > HIT_HALF_WIDTH || dy < HIT_MIN_HEIGHT || dy > HIT_MAX_HEIGHT) continue
      // entityAttackを使うため、既存の攻撃スキルによる加算も適用される。
      applyChargeDamage({
        attacker: player,
        target,
        baseDamage: CHARGED_ATTACK_DAMAGE,
        cause: EntityDamageCause.entityAttack
      })
    } catch (error) {
      console.warn(`[thunder_sword] ダメージ処理失敗: ${error}`)
    }
  }
}

function drawBoltSegment (dimension, start, end) {
  const steps = Math.ceil(Math.hypot(end.x - start.x, end.y - start.y, end.z - start.z) / PARTICLE_SPACING)
  for (let step = 1; step <= steps; step++) {
    const ratio = step / steps
    dimension.spawnParticle('my:thunder_slash', {
      x: start.x + (end.x - start.x) * ratio,
      y: start.y + (end.y - start.y) * ratio,
      z: start.z + (end.z - start.z) * ratio
    })
  }
}

function showThunderLine (dimension, origin, forward, right) {
  try {
    // 太い三本の電撃と枝分かれを、一直線の攻撃範囲内に描く。
    for (const height of [0.3, 1.0, 1.7]) {
      let previous = { x: origin.x, y: origin.y + height, z: origin.z }
      for (let segment = 1; segment <= BOLT_SEGMENTS; segment++) {
        const distance = HIT_RANGE * segment / BOLT_SEGMENTS
        const side = segment === BOLT_SEGMENTS ? 0 : (Math.random() - 0.5) * HIT_HALF_WIDTH * 1.4
        const next = {
          x: origin.x + forward.x * distance + right.x * side,
          y: origin.y + height + (Math.random() - 0.5) * 0.4,
          z: origin.z + forward.z * distance + right.z * side
        }
        drawBoltSegment(dimension, previous, next)
        if (height === 1.0 && segment % 3 === 0) {
          for (const sign of [-1, 1]) {
            const branchEnd = {
              x: origin.x + forward.x * distance + right.x * HIT_HALF_WIDTH * 0.85 * sign,
              y: origin.y + 1 + sign * 0.7,
              z: origin.z + forward.z * distance + right.z * HIT_HALF_WIDTH * 0.85 * sign
            }
            drawBoltSegment(dimension, next, branchEnd)
          }
        }
        if (height === 1.0 && segment % 6 === 0) {
          dimension.spawnParticle('my:thunder_flash', next)
        }
        previous = next
      }
    }
  } catch (error) {
    console.warn(`[thunder_sword] 雷の演出失敗: ${error}`)
  }
}

system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    const charge = charges.get(player.id)
    if (!charge) continue
    if (!isChargeValid(player, charge)) {
      cancelCharge(player)
      continue
    }
    const ratio = Math.min((system.currentTick - charge.startTick) / charge.requiredTicks, 1)
    setActionChargeCount(Math.floor(ratio * 10), player)
  }
}, 2)
