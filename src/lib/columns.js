// Helpers for recognising well-known columns (Quantity, Unit Price, Amount)
// and for reading loosely formatted numbers out of spreadsheet cells.

export const normalize = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

export function parseNumber(value) {
  const n = parseFloat(String(value ?? '').replace(/[^0-9.\-]/g, ''))
  return Number.isFinite(n) ? n : NaN
}

function findColumn(columns, exact, partial) {
  for (const key of exact) {
    const hit = columns.find((c) => normalize(c) === key)
    if (hit) return hit
  }
  for (const key of partial) {
    const hit = columns.find((c) => normalize(c).includes(key))
    if (hit) return hit
  }
  return null
}

/** Columns that drive the Amount = Quantity × Unit Price auto-calculation. */
export function detectCalcColumns(columns) {
  return {
    qty: findColumn(columns, ['quantity', 'qty'], ['quantity', 'qty']),
    price: findColumn(columns, ['unitprice', 'unitpriceusd', 'rate'], ['unitprice', 'price', 'rate']),
    amount: findColumn(columns, ['amount', 'total'], ['amount', 'total']),
  }
}

export function isAutoCalc({ qty, price, amount }) {
  return Boolean(qty && price && amount)
}

export function computeAmount(qty, price) {
  const q = parseNumber(qty)
  const p = parseNumber(price)
  return Number.isFinite(q) && Number.isFinite(p) ? (q * p).toFixed(2) : ''
}

export function toFixed2(value) {
  if (value === '' || value == null) return value
  const n = parseNumber(value)
  return Number.isFinite(n) ? n.toFixed(2) : value
}

/** True when a value has more than two digits after the decimal point. */
export function hasExtraDecimals(value) {
  if (value === '' || value == null) return false
  const m = String(value).trim().match(/\.(\d+)/)
  return Boolean(m) && m[1].length > 2
}

const STRICT_NUMBER = /^\s*[-+]?[$€£¥₹]?\s*(\d[\d,]*(\.\d+)?|\.\d+)\s*%?\s*$/

/** A cell that is really a number (unlike parseNumber, "Serum 30ml" doesn't count). */
export function isNumberLike(value) {
  if (typeof value === 'number') return Number.isFinite(value)
  return STRICT_NUMBER.test(String(value ?? ''))
}

/**
 * Columns where at least 60% of the non-empty cells are numeric.
 * `strict` is used for display (alignment); the loose test is used for
 * detecting the invoice totals column.
 */
export function numericColumns(rows, columns, { strict = false } = {}) {
  const test = strict ? isNumberLike : (v) => Number.isFinite(parseNumber(v))
  const result = new Set()
  for (const col of columns) {
    let filled = 0
    let numeric = 0
    for (const row of rows) {
      const v = row[col]
      if (v === '' || v == null) continue
      filled++
      if (test(v)) numeric++
    }
    if (filled > 0 && numeric / filled >= 0.6) result.add(col)
  }
  return result
}

const TOTAL_HINTS = ['amount', 'total', 'subtotal', 'linetotal', 'grandtotal']

/** Best guess at the column holding line totals, used for the invoice balance. */
export function detectTotalColumn(rows, columns) {
  if (!rows?.length) return null
  const numeric = numericColumns(rows, columns)
  for (const hint of TOTAL_HINTS) {
    const hit = columns.find((c) => numeric.has(c) && normalize(c).includes(hint))
    if (hit) return hit
  }
  for (let i = columns.length - 1; i >= 0; i--) {
    if (numeric.has(columns[i])) return columns[i]
  }
  return null
}

export function sumColumn(rows, column) {
  if (!column) return 0
  return rows.reduce((sum, row) => {
    const n = parseNumber(row[column])
    return sum + (Number.isFinite(n) ? n : 0)
  }, 0)
}

export function formatCurrency(amount, currency = 'USD') {
  if (!Number.isFinite(amount)) return ''
  const code = String(currency || 'USD').trim().toUpperCase()
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${code} ${amount.toFixed(2)}`
  }
}

export function formatNumber(amount) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
}
