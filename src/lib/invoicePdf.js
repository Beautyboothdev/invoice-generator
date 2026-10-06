// Commercial invoice PDF (US Letter, points). jsPDF is loaded on demand.
import { detectTotalColumn, formatCurrency, parseNumber, sumColumn } from './columns'

const MARGIN = 40
const INK = [30, 30, 60]
const HEAD_FILL = [45, 45, 75]
const GRID = [220, 220, 225]
const LABEL = 130
const PAGE_TOKEN = '{totalPages}'

/** Balance due: explicit value if it parses, otherwise the sum of the totals column. */
export function resolveBalance(rows, columns, explicit) {
  const typed = parseNumber(explicit)
  if (String(explicit ?? '').trim() && Number.isFinite(typed)) return typed
  return sumColumn(rows, detectTotalColumn(rows, columns))
}

function drawFooter(doc, pageWidth, pageHeight) {
  const page = doc.internal.getCurrentPageInfo().pageNumber
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(`Page: ${page} / ${PAGE_TOKEN}`, pageWidth / 2, pageHeight - 20, { align: 'center' })
  doc.setTextColor(0)
}

function drawHeader(doc, pageWidth, company) {
  let y = MARGIN
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...INK)
  doc.text(company.name, MARGIN, y + 12)

  y += 24
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(70)
  for (const line of company.lines) {
    if (!line) continue
    doc.text(String(line), MARGIN, y)
    y += 12
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(30)
  doc.setTextColor(40, 40, 70)
  doc.text('INVOICE', pageWidth - MARGIN, MARGIN + 24, { align: 'right' })
  doc.setTextColor(0)
}

/** Draws the Bill To block and invoice meta; returns the Y where the table starts. */
function drawBillTo(doc, pageWidth, billTo, meta) {
  const top = 140
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(LABEL)
  doc.text('BILL TO', MARGIN, top)

  doc.setTextColor(0)
  doc.setFontSize(10)
  const nameLines = doc.splitTextToSize(billTo.name || '', 260)
  nameLines.forEach((line, i) => doc.text(line, MARGIN, top + 16 + i * 13))

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(60)
  let y = top + 16 + nameLines.length * 13 + 2
  for (const line of billTo.lines || []) {
    if (!line) continue
    for (const part of doc.splitTextToSize(String(line), 260)) {
      doc.text(part, MARGIN, y)
      y += 12
    }
  }
  doc.setTextColor(0)

  const labelX = pageWidth - MARGIN - 210
  const rows = [
    ['Invoice #', meta.invoiceNumber],
    ['Date', meta.date],
    ['Terms', meta.terms],
    ['Currency', meta.currency],
  ]
  doc.setFontSize(9)
  rows.forEach(([label, value], i) => {
    const rowY = top + i * 16
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(LABEL)
    doc.text(label, labelX, rowY)
    doc.setTextColor(0)
    doc.setFont('helvetica', 'normal')
    doc.text(String(value || ''), pageWidth - MARGIN, rowY, { align: 'right' })
  })

  return Math.max(y, 204) + 20
}

function drawSummary(doc, pageWidth, pageHeight, startY, meta, balance) {
  let y = startY
  if (y + 180 > pageHeight - 40) {
    doc.addPage()
    drawFooter(doc, pageWidth, pageHeight)
    y = MARGIN + 10
  }
  const right = pageWidth - MARGIN

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(LABEL)
  doc.text('BALANCE DUE', right, y, { align: 'right' })
  doc.setTextColor(0)
  doc.setFontSize(18)
  doc.text(formatCurrency(balance, meta.currency), right, y + 22, { align: 'right' })

  const packagesY = y + 50
  doc.setFontSize(9)
  doc.setTextColor(LABEL)
  doc.text('DESCRIPTION OF PACKAGES', MARGIN, packagesY)
  doc.setTextColor(0)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  const packageLines = doc.splitTextToSize(String(meta.packages || ''), 300)
  packageLines.forEach((line, i) => doc.text(line, MARGIN, packagesY + 16 + i * 13))

  const weightY = packagesY + 16 + packageLines.length * 13 + 14
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(LABEL)
  doc.text('GROSS WEIGHT', MARGIN, weightY)
  doc.setTextColor(0)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.text(String(meta.grossWeight || ''), MARGIN, weightY + 14)

  const lineY = packagesY + 70
  doc.setDrawColor(150)
  doc.line(right - 190, lineY, right, lineY)
  doc.setFontSize(9)
  doc.setTextColor(LABEL)
  doc.text('Authorized Signature & Stamp', right, lineY + 14, { align: 'right' })
  doc.setTextColor(0)
}

/**
 * @param {{ rows: object[], columns: string[], meta: object, fileName: string }} input
 * meta: { company:{name,lines}, billTo:{name,lines}, invoiceNumber, date, terms,
 *         currency, balanceDue, packages, grossWeight }
 */
export async function generateInvoicePdf({ rows, columns, meta, fileName }) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])

  const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const currency = meta.currency || 'USD'

  drawHeader(doc, pageWidth, meta.company)
  const tableY = drawBillTo(doc, pageWidth, meta.billTo, { ...meta, currency })

  const body = rows.map((row) => columns.map((c) => String(row[c] ?? '')))
  autoTable(doc, {
    startY: tableY,
    head: [columns],
    body: body.length ? body : [columns.map((_, i) => (i === 0 ? '(no rows)' : ''))],
    margin: { left: MARGIN, right: MARGIN, bottom: 60 },
    theme: 'grid',
    tableWidth: 'auto',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 6,
      overflow: 'linebreak',
      halign: 'left',
      valign: 'top',
      lineColor: GRID,
      lineWidth: 0.5,
      textColor: 30,
    },
    headStyles: { fillColor: HEAD_FILL, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
    didDrawPage: () => drawFooter(doc, pageWidth, pageHeight),
  })

  const balance = resolveBalance(rows, columns, meta.balanceDue)
  drawSummary(doc, pageWidth, pageHeight, (doc.lastAutoTable?.finalY ?? tableY) + 28, { ...meta, currency }, balance)

  if (typeof doc.putTotalPages === 'function') {
    doc.putTotalPages(PAGE_TOKEN, String(doc.internal.getNumberOfPages()))
  }
  doc.save(fileName)
}
