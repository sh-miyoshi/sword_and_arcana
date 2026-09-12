import { world } from '@minecraft/server'

const playerStates = new Map()

function getState (player) {
  if (!playerStates.has(player.id)) {
    playerStates.set(player.id, { mana: 0, maxMana: 0, chargeCount: 0, element: undefined })
  }
  return playerStates.get(player.id)
}

export const setActionMana = (mana, maxMana, player) => {
  const state = getState(player)
  state.mana = mana
  state.maxMana = maxMana
  updateActionBarText(player, state)
}

export const setActionChargeCount = (value, player) => {
  const state = getState(player)
  state.chargeCount = value
  updateActionBarText(player, state)
}

export const setActionElement = (element, player) => {
  const state = getState(player)
  if (state.element === element) return
  state.element = element
  updateActionBarText(player, state)
}

function updateActionBarText (player, state) {
  const tokens = []
  // One background per maximum MP, one filled icon per current MP.
  for (let i = 1; i <= state.maxMana; i++) {
    const slot = String(i).padStart(2, '0')
    tokens.push('B' + slot)
    if (i <= state.mana) tokens.push('P' + slot)
  }
  tokens.push('C' + String(state.chargeCount).padStart(2, '0'))
  tokens.push(state.chargeCount > 0 ? 'C_ON' : 'C_OFF')
  if (state.element === 'fire') tokens.push('FIRE_BUFF')
  if (state.element === 'ice') tokens.push('ICE_BUFF')
  player.onScreenDisplay.setActionBar('|' + tokens.join('|') + '|')
}

world.afterEvents.playerLeave.subscribe(event => {
  playerStates.delete(event.playerId)
})
