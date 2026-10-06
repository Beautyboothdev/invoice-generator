import { useLayoutEffect, useRef, useState } from 'react'
import { formatCurrency } from '../lib/columns'

const PAGE_WIDTH = 612 // US Letter width in points, rendered 1pt = 1px
const PREVIEW_ROWS = 8

/** HTML approximation of the generated PDF's first page. Always on white paper. */
export function InvoicePreview({ meta, balance, rows, columns }) {
  const wrapRef = useRef(null)
  const [scale, setScale] = useState(0.6)

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / PAGE_WIDTH)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const shown = rows.slice(0, PREVIEW_ROWS)
  const hidden = rows.length - shown.length

  return (
    <div ref={wrapRef} className="w-full">
      <div
        style={{ zoom: scale, width: PAGE_WIDTH, fontFamily: 'Helvetica, Arial, sans-serif' }}
        className="min-h-[700px] rounded-[3px] bg-white p-10 text-[rgb(30,30,30)] shadow-[0_1px_3px_rgb(0_0_0/0.12),0_12px_32px_-8px_rgb(15_23_42/0.25)] ring-1 ring-black/5"
      >
        {/* Header */}
        <div className="flex min-h-[86px] items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="text-[14px] leading-[18px] font-bold text-[rgb(30,30,60)]">{meta.company.name}</div>
            <div className="mt-[6px] space-y-[1px] text-[9px] leading-[11px] text-[rgb(70,70,70)]">
              {meta.company.lines.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
          <div className="text-[30px] leading-none font-bold tracking-tight text-[rgb(40,40,70)]">INVOICE</div>
        </div>

        {/* Bill to + meta */}
        <div className="mt-3 flex items-start justify-between gap-6">
          <div className="w-[260px] min-w-0">
            <div className="text-[8.5px] font-bold tracking-wide text-[rgb(130,130,130)]">BILL TO</div>
            <div className="mt-[6px] text-[10px] leading-[13px] font-bold break-words">{meta.billTo.name}</div>
            <div className="mt-[2px] space-y-[1px] text-[9px] leading-[12px] text-[rgb(60,60,60)]">
              {meta.billTo.lines.map((line, i) => (
                <div key={i} className="break-words">
                  {line}
                </div>
              ))}
            </div>
          </div>
          <dl className="grid w-[210px] grid-cols-[auto_1fr] gap-x-3 gap-y-[5px] text-[9px] leading-[11px]">
            {[
              ['Invoice #', meta.invoiceNumber],
              ['Date', meta.date],
              ['Terms', meta.terms],
              ['Currency', meta.currency],
            ].map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="font-bold text-[rgb(130,130,130)]">{label}</dt>
                <dd className="truncate text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Items table */}
        <table className="mt-6 w-full border-collapse text-left text-[8.5px] leading-[11px]">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c} className="border border-[rgb(220,220,225)] bg-[rgb(45,45,75)] p-[6px] align-top font-bold text-white">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={Math.max(columns.length, 1)} className="border border-[rgb(220,220,225)] p-[6px]">
                  (no rows)
                </td>
              </tr>
            ) : (
              shown.map((row, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c} className="border border-[rgb(220,220,225)] p-[6px] align-top break-words">
                      {String(row[c] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
            {hidden > 0 && (
              <tr>
                <td colSpan={columns.length} className="border border-dashed border-[rgb(200,200,210)] p-[6px] text-center text-[rgb(120,120,130)] italic">
                  + {hidden} more row{hidden === 1 ? '' : 's'} in the PDF
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Summary */}
        <div className="mt-7 text-right">
          <div className="text-[10px] font-bold text-[rgb(130,130,130)]">BALANCE DUE</div>
          <div className="mt-[4px] text-[18px] leading-[22px] font-bold">{formatCurrency(balance, meta.currency || 'USD')}</div>
        </div>
        <div className="mt-2 flex items-start justify-between gap-6">
          <div className="w-[300px] min-w-0">
            <div className="text-[9px] font-bold text-[rgb(130,130,130)]">DESCRIPTION OF PACKAGES</div>
            <div className="mt-[5px] min-h-[13px] text-[9.5px] leading-[13px] break-words whitespace-pre-wrap">{meta.packages}</div>
            <div className="mt-[12px] text-[9px] font-bold text-[rgb(130,130,130)]">GROSS WEIGHT</div>
            <div className="mt-[4px] min-h-[13px] text-[9.5px] leading-[13px]">{meta.grossWeight}</div>
          </div>
          <div className="mt-[58px] w-[190px] border-t border-[rgb(150,150,150)] pt-[5px] text-right text-[9px] text-[rgb(130,130,130)]">
            Authorized Signature &amp; Stamp
          </div>
        </div>
      </div>
    </div>
  )
}
