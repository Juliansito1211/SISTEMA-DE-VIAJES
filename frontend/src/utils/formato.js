/**
 * Normaliza una placa: mayúsculas, solo alfanuméricos, máximo 6 caracteres.
 * Ej: "dqn-228" → "DQN228" | "ABC 12!" → "ABC12"
 */
export function normalizarPlaca(val) {
  return val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}

/**
 * Valida que una placa tenga exactamente 6 caracteres alfanuméricos.
 */
export function placaValida(val) {
  return /^[A-Z0-9]{6}$/.test(val)
}

/**
 * Formatea un valor numérico como moneda colombiana (COP).
 * Ejemplos: 600000 → "$ 600.000" | 1500000 → "$ 1.500.000"
 */
export function formatMonto(m) {
  if (m == null) return null
  const n = parseFloat(m)
  if (isNaN(n)) return null
  return '$ ' + new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}
