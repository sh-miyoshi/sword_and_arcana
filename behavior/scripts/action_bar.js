let mana = 1
let chargeCount = 0

export const setActionMana = (value, player) => {
  mana = value
  updateActionBarText(player)
}

export const setActionChargeCount = (value, player) => {
  chargeCount = value
  updateActionBarText(player)
}

const updateActionBarText = player => {
  const manaCode = `M${String(mana).padStart(2, '0')}`
  const chargeCode = `C${String(chargeCount).padStart(2, '0')}`
  const charged = chargeCount > 0 ? 'C_ON' : 'C_OFF'
  player.onScreenDisplay.setActionBar(`${manaCode}|${chargeCode}|${charged}`)
}
