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
