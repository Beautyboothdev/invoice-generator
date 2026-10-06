// Reading and writing spreadsheets. SheetJS is loaded on demand so the
// landing page stays light.

export const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.csv']

export const baseName = (fileName) => (fileName || 'untitled').replace(/\.[^.]+$/, '')

export function isAcceptedFile(file) {
  const name = file?.name?.toLowerCase() || ''
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))
}

export async function parseSpreadsheet(file) {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' })

  const sheets = {}
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name]
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' }).map((row) => ({ ...row }))
    // Keep the header even when a sheet has no data rows.
    const columns = rows.length
      ? Object.keys(rows[0])
      : (XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })[0] || []).map(String).filter(Boolean)
    sheets[name] = { columns, rows }
  }

  return { sheets, sheetNames: wb.SheetNames, fileName: file.name }
}

export async function exportWorkbook(doc) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  for (const name of doc.sheetNames) {
    const { columns, rows } = doc.sheets[name]
    const ws = rows.length
      ? XLSX.utils.json_to_sheet(rows, { header: columns })
      : XLSX.utils.aoa_to_sheet([columns])
    XLSX.utils.book_append_sheet(wb, ws, name)
  }
  const outName = `${baseName(doc.fileName)}-edited.xlsx`
  XLSX.writeFile(wb, outName)
  return outName
}
