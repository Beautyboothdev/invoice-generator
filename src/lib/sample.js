// Starter documents for "Try sample data" and "Start blank".

const ITEMS = [
  ['Hydrating Face Serum 30ml', '3304.99', 48, 6.5],
  ['Vitamin C Brightening Cream 50g', '3304.99', 36, 8.75],
  ['Matte Liquid Lipstick – Rose', '3304.10', 120, 2.4],
  ['Micellar Cleansing Water 400ml', '3304.99', 60, 3.125],
  ['SPF 50 Sunscreen Lotion 100ml', '3304.99', 72, 5.2],
  ['Argan Oil Hair Mask 250ml', '3305.90', 40, 4.8],
  ['Volumising Mascara – Black', '3304.20', 90, 2.15],
]

export function sampleDocument() {
  const columns = ['SL', 'Description', 'HS Code', 'Quantity', 'Unit Price', 'Amount']
  const rows = ITEMS.map(([description, hs, qty, price], i) => ({
    SL: i + 1,
    Description: description,
    'HS Code': hs,
    Quantity: qty,
    'Unit Price': price,
    Amount: (qty * price).toFixed(2),
  }))
  return {
    fileName: 'sample-invoice.xlsx',
    sheetNames: ['Invoice Items'],
    sheets: { 'Invoice Items': { columns, rows } },
  }
}

export function blankDocument() {
  const columns = ['Description', 'Quantity', 'Unit Price', 'Amount']
  return {
    fileName: 'untitled.xlsx',
    sheetNames: ['Sheet1'],
    sheets: { Sheet1: { columns, rows: [Object.fromEntries(columns.map((c) => [c, '']))] } },
  }
}
