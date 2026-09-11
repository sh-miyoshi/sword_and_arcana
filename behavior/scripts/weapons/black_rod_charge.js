import { EntityDamageCause, EquipmentSlot, world, system } from '@minecraft/server'

import { setActionChargeCount } from '../action_bar.js'
import { getMana, useMana } from '../player/mana.js'
import { getChargeRequiredTicks } from '../skills/skill_data.js'

const BLACK_ROD_ID = 'my:black_rod'
const MAX_TARGET_DISTANCE = 32
const MIN_RADIUS = 0.5
const MAX_RADIUS = 4
const CHARGE_TIME_MULTIPLIER = 2 // 通常80tick。魔法スキルで短縮。
const MANA_COST = 5
const DAMAGE = 40
const DESTROY_DEPTH = 3
const HIT_HEIGHT = MAX_RADIUS // 照準位置を中心にした球の上端。
const SPHERE_ID = 'my:black_magic_sphere'
const SPHERE_RADIUS_PROPERTY = 'my:radius'
const IMPACT_DISPLAY_TICKS = 4
const charges = new Map()

// setType は通常の採掘制限を無視するため、特殊ブロックは明示的に除外する。
const PROTECTED_BLOCKS = new Set([
  'minecraft:bedrock', 'minecraft:barrier', 'minecraft:invisible_bedrock',
  'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block',
  'minecraft:structure_void', 'minecraft:jigsaw', 'minecraft:allow',
  'minecraft:deny', 'minecraft:border_block', 'minecraft:portal',
  'minecraft:end_portal', 'minecraft:end_portal_frame', 'minecraft:end_gateway',
  'minecraft:reinforced_deepslate'
])

// 既存の剣と同じ、消費も弾薬も不要な長押し用コンポーネント。
system.beforeEvents.startup.subscribe(event => {
  event.itemComponentRegistry.registerCustomComponent('my:black_rod_charge', {
    onCompleteUse (event) {
      cancelCharge(event.source)
    }
  })
})

function cancelCharge (player) {
  const charge = charges.get(player.id)
  if (!charge) return
  charges.delete(player.id)
  removeSphere(charge)
  setActionChargeCount(0, player)
}

function removeSphere (charge) {
  try {
    if (charge.sphere?.isValid) charge.sphere.remove()
  } catch (error) {
    console.warn(`[black_rod] 球の削除失敗: ${error}`)
  }
  charge.sphere = undefined
}

function reportVisualFailure (player, charge, error) {
  if (charge.visualFailed) return
  charge.visualFailed = true
  removeSphere(charge)
  console.warn(`[black_rod] 球の表示失敗（攻撃は継続）: ${error}`)
  player.sendMessage(`黒魔術の球を表示できません: ${error}`)
}

function updateSphere (player, charge, radius) {
  if (charge.visualFailed) return
  try {
    if (!charge.sphere?.isValid) throw new Error('black_magic_sphere が無効です。')
    charge.sphere.setProperty(SPHERE_RADIUS_PROPERTY, radius)
  } catch (error) {
    reportVisualFailure(player, charge, error)
  }
}

function getTargetCenter (player) {
  const origin = player.getHeadLocation()
  const direction = player.getViewDirection()
  const blockHit = player.dimension.getBlockFromRay(origin, direction, {
    maxDistance: MAX_TARGET_DISTANCE,
    includeLiquidBlocks: false,
    includePassableBlocks: false
  })
  // 何にも当たらない場合は、目の位置から視線方向へ最大射程まで進んだ地点。
  let center = {
    x: origin.x + direction.x * MAX_TARGET_DISTANCE,
    y: origin.y + direction.y * MAX_TARGET_DISTANCE,
    z: origin.z + direction.z * MAX_TARGET_DISTANCE
  }
  let nearestDistance = MAX_TARGET_DISTANCE
  if (blockHit) {
    // faceLocationはブロック内の相対座標。狙った面の正確な位置へ変換する。
    center = {
      x: blockHit.block.location.x + blockHit.faceLocation.x,
      y: blockHit.block.location.y + blockHit.faceLocation.y,
      z: blockHit.block.location.z + blockHit.faceLocation.z
    }
    nearestDistance = Math.hypot(center.x - origin.x, center.y - origin.y, center.z - origin.z)
  }
  const entityHits = player.getEntitiesFromViewDirection({
    maxDistance: MAX_TARGET_DISTANCE,
    ignoreBlockCollision: false,
    includeLiquidBlocks: false,
    includePassableBlocks: false,
    excludeTypes: [SPHERE_ID, 'minecraft:item']
  })
  for (const hit of entityHits) {
    if (!hit.entity.isValid || hit.entity.id === player.id || hit.distance > nearestDistance) continue
    nearestDistance = hit.distance
    center = {
      x: origin.x + direction.x * hit.distance,
      y: origin.y + direction.y * hit.distance,
      z: origin.z + direction.z * hit.distance
    }
  }
  return center
}

world.afterEvents.itemStartUse.subscribe(event => {
  if (event.itemStack?.typeId !== BLACK_ROD_ID) return
  const player = event.source
  if (charges.has(player.id)) return
  if (getMana(player) < MANA_COST) {
    player.sendMessage('MPが足りません。黒魔術の杖にはMPが5必要です。')
    return
  }
  try {
    const center = getTargetCenter(player)
    const charge = {
      center,
      dimension: player.dimension,
      slot: player.selectedSlotIndex,
      startTick: system.currentTick,
      requiredTicks: getChargeRequiredTicks(player) * CHARGE_TIME_MULTIPLIER
    }
    charges.set(player.id, charge)
    // 半径1の立体モデルを一つだけ生成し、中心を固定したまま拡大する。
    // 表示と攻撃に同じ照準位置を使い、高さの補正は加えない。
    try {
      charge.sphere = player.dimension.spawnEntity(SPHERE_ID, center)
      // 初期半径はエンティティ定義のdefaultを使い、生成したtickでは
      // プロパティに触れない。サイズ更新は次のtickから行う。
    } catch (error) {
      reportVisualFailure(player, charge, error)
    }
    setActionChargeCount(0, player)
  } catch (error) {
    cancelCharge(player)
    console.warn(`[black_rod] チャージ開始失敗: ${error}`)
  }
})

// 完了時に自動発動するため、離した時点では攻撃しない。
for (const signal of [world.afterEvents.itemReleaseUse, world.afterEvents.itemStopUse]) {
  signal.subscribe(event => {
    if (event.itemStack?.typeId === BLACK_ROD_ID) cancelCharge(event.source)
  })
}
world.afterEvents.playerLeave.subscribe(event => {
  const charge = charges.get(event.playerId)
  charges.delete(event.playerId)
  if (charge) removeSphere(charge)
})
world.afterEvents.entityDie.subscribe(event => {
  if (event.deadEntity.typeId === 'minecraft:player') cancelCharge(event.deadEntity)
})
world.afterEvents.playerDimensionChange.subscribe(event => cancelCharge(event.player))

function destroyGround (dimension, center) {
  // 球を地面に投影した円の内側だけを削る。
  for (let x = Math.floor(center.x - MAX_RADIUS); x <= Math.floor(center.x + MAX_RADIUS); x++) {
    for (let z = Math.floor(center.z - MAX_RADIUS); z <= Math.floor(center.z + MAX_RADIUS); z++) {
      if ((x + 0.5 - center.x) ** 2 + (z + 0.5 - center.z) ** 2 > MAX_RADIUS ** 2) continue
      for (let depth = 1; depth <= DESTROY_DEPTH; depth++) {
        const y = Math.ceil(center.y) - depth
        if (y < dimension.heightRange.min) break
        if (y >= dimension.heightRange.max) continue
        const block = dimension.getBlock({ x, y, z })
        if (!block) continue
        if (PROTECTED_BLOCKS.has(block.typeId) || block.typeId.startsWith('minecraft:light_block')) break
        if (block.isAir || block.isLiquid) continue
        // ドロップを大量生成せず、魔法で地形を消し去る。
        block.setType('minecraft:air')
      }
    }
  }
}

function detonate (player, charge) {
  const { dimension, center } = charge
  const targets = dimension.getEntities({
    location: center,
    maxDistance: Math.hypot(MAX_RADIUS, Math.max(HIT_HEIGHT, DESTROY_DEPTH))
  })
  let inRangeCount = 0
  let damagedCount = 0
  for (const target of targets) {
    try {
      // monster分類に依存せず、既存武器と同様に体力のある対象を調べる。
      // プレイヤーと表示用エンティティには当てない。
      if (!target.isValid || target.typeId === 'minecraft:player' ||
          target.typeId === SPHERE_ID || target.typeId === 'minecraft:armor_stand' ||
          !target.getComponent('minecraft:health')) continue
      const offsetX = target.location.x - center.x
      const offsetY = target.location.y - center.y
      const offsetZ = target.location.z - center.z
      if (offsetX ** 2 + offsetZ ** 2 > MAX_RADIUS ** 2 || offsetY < -DESTROY_DEPTH || offsetY > HIT_HEIGHT) continue
      inRangeCount++
      if (target.applyDamage(DAMAGE, { cause: EntityDamageCause.magic, damagingEntity: player })) {
        damagedCount++
      } else {
        console.warn(`[black_rod] ダメージが適用されませんでした: ${target.typeId}`)
      }
    } catch (error) {
      // 一体への適用失敗で、残りの対象と地形破壊を止めない。
      console.warn(`[black_rod] 対象へのダメージ処理失敗: ${error}`)
    }
  }
  if (damagedCount === 0) {
    console.warn(`[black_rod] 命中なし: 範囲内=${inRangeCount}, 中心=${center.x},${center.y},${center.z}, 半径=${MAX_RADIUS}`)
  }
  destroyGround(dimension, center)
  dimension.playSound('random.explode', center, { volume: 1, pitch: 0.6 })
}

system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    const charge = charges.get(player.id)
    if (!charge) continue
    try {
      const heldItem = player.getComponent('minecraft:equippable')?.getEquipment(EquipmentSlot.Mainhand)
      if (heldItem?.typeId !== BLACK_ROD_ID || player.selectedSlotIndex !== charge.slot ||
          player.dimension.id !== charge.dimension.id ||
          player.getComponent('minecraft:health')?.currentValue <= 0) {
        cancelCharge(player)
        continue
      }
      const elapsed = system.currentTick - charge.startTick
      const ratio = Math.min(elapsed / charge.requiredTicks, 1)
      setActionChargeCount(Math.floor(ratio * 10), player)
      updateSphere(player, charge, MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * ratio)
      if (ratio >= 1) {
        // 先に状態を消して、長押し継続や複数イベントによる二重発動を防ぐ。
        charges.delete(player.id)
        setActionChargeCount(0, player)
        if (!useMana(player, MANA_COST)) {
          removeSphere(charge)
          player.sendMessage('MPが足りません。')
          continue
        }
        // 最大サイズを短く表示してから消す。再生成や円形パーティクルは不要。
        system.runTimeout(() => removeSphere(charge), IMPACT_DISPLAY_TICKS)
        detonate(player, charge)
      }
    } catch (error) {
      cancelCharge(player)
      console.warn(`[black_rod] チャージ攻撃失敗: ${error}`)
    }
  }
}, 1)
