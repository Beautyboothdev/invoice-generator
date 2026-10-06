import { useEffect, useMemo, useState } from 'react'
import { Building2, Eye, FileDown, Package, Receipt, RotateCcw, UserRound } from 'lucide-react'
import { Modal } from './Modal'
import { InvoicePreview } from './InvoicePreview'
import { Button, cx } from './ui'
import { useToast } from './Toaster'
import { CURRENCY_OPTIONS, DEFAULT_BILL_TO, DEFAULT_COMPANY, DEFAULT_INVOICE, TERM_OPTIONS } from '../config'
import { detectTotalColumn, formatNumber, sumColumn } from '../lib/columns'
import { generateInvoicePdf, resolveBalance } from '../lib/invoicePdf'
import { storage } from '../lib/storage'
import { baseName } from '../lib/workbook'

const PREFS_KEY = 'invoice'

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** INV-0007 → INV-0008 (keeps zero padding). */
export function nextInvoiceNumber(previous) {
  if (!previous) return DEFAULT_INVOICE.invoiceNumber
  const m = String(previous).match(/^(.*?)(\d+)(\D*)$/)
  if (!m) return previous
  const [, prefix, digits, suffix] = m
  return prefix + String(Number(digits) + 1).padStart(digits.length, '0') + suffix
}

const splitLines = (text) =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

function defaultParty(party) {
  return { name: party.name, lines: party.lines.join('\n') }
}

function initialForm() {
  const prefs = storage.get(PREFS_KEY, {})
  return {
    companyName: prefs.companyName ?? DEFAULT_COMPANY.name,
    companyLines: prefs.companyLines ?? defaultParty(DEFAULT_COMPANY).lines,
    billToName: prefs.billToName ?? DEFAULT_BILL_TO.name,
    billToLines: prefs.billToLines ?? defaultParty(DEFAULT_BILL_TO).lines,
    invoiceNumber: prefs.lastInvoiceNumber ? nextInvoiceNumber(prefs.lastInvoiceNumber) : DEFAULT_INVOICE.invoiceNumber,
    date: today(),
    terms: prefs.terms ?? DEFAULT_INVOICE.terms,
    currency: prefs.currency ?? DEFAULT_INVOICE.currency,
    balanceDue: '',
    packages: '',
    grossWeight: '',
  }
}

function Section({ icon: Icon, title, hint, children }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex size-7 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-fg">
          <Icon className="size-3.5" aria-hidden />
        </span>
        <h3 className="text-sm font-bold tracking-tight text-fg">{title}</h3>
        {hint && <span className="text-xs text-fg-subtle">{hint}</span>}
      </div>
      <div className="grid gap-3.5">{children}</div>
    </section>
  )
}

function Field({ label, hint, children, className }) {
  return (
    <label className={cx('block', className)}>
      <span className="field-label">
        {label}
        {hint && <span className="ml-1.5 font-normal tracking-normal text-fg-subtle">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

export function InvoiceModal({ open, onClose, rows, columns, fileName }) {
  const { toast } = useToast()
  const [form, setForm] = useState(initialForm)
  const [busy, setBusy] = useState(false)

  // Fresh invoice number/date and empty summary fields every time it opens.
  useEffect(() => {
    if (open) setForm(initialForm())
  }, [open])

  // Remember sender, customer, terms and currency for next time.
  useEffect(() => {
    if (!open) return
    const prefs = storage.get(PREFS_KEY, {})
    storage.set(PREFS_KEY, {
      ...prefs,
      companyName: form.companyName,
      companyLines: form.companyLines,
      billToName: form.billToName,
      billToLines: form.billToLines,
      terms: form.terms,
      currency: form.currency,
    })
  }, [open, form.companyName, form.companyLines, form.billToName, form.billToLines, form.terms, form.currency])

  const totalColumn = useMemo(() => (open ? detectTotalColumn(rows, columns) : null), [open, rows, columns])
  const autoTotal = useMemo(() => sumColumn(rows, totalColumn), [rows, totalColumn])

  // Empty name/address fields fall back to the defaults.
  const meta = useMemo(
    () => ({
      company: {
        name: form.companyName.trim() || DEFAULT_COMPANY.name,
        lines: splitLines(form.companyLines).length ? splitLines(form.companyLines) : DEFAULT_COMPANY.lines,
      },
      billTo: {
        name: form.billToName.trim() || DEFAULT_BILL_TO.name,
        lines: splitLines(form.billToLines).length ? splitLines(form.billToLines) : DEFAULT_BILL_TO.lines,
      },
      invoiceNumber: form.invoiceNumber.trim(),
      date: form.date.trim(),
      terms: form.terms.trim(),
      currency: form.currency.trim().toUpperCase() || 'USD',
      balanceDue: form.balanceDue.trim(),
      packages: form.packages.trim(),
      grossWeight: form.grossWeight.trim(),
    }),
    [form],
  )

  const balance = resolveBalance(rows, columns, meta.balanceDue)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const resetParties = () =>
    setForm((f) => ({
      ...f,
      companyName: DEFAULT_COMPANY.name,
      companyLines: DEFAULT_COMPANY.lines.join('\n'),
      billToName: DEFAULT_BILL_TO.name,
      billToLines: DEFAULT_BILL_TO.lines.join('\n'),
    }))

  const generate = async () => {
    setBusy(true)
    const outName = `${baseName(fileName)}-invoice.pdf`
    try {
      await generateInvoicePdf({ rows, columns, meta, fileName: outName })
      storage.set(PREFS_KEY, { ...storage.get(PREFS_KEY, {}), lastInvoiceNumber: meta.invoiceNumber })
      toast({ title: 'Invoice PDF downloaded', description: outName })
      onClose()
    } catch (err) {
      toast({ tone: 'error', title: 'Could not generate PDF', description: err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Invoice PDF details"
      description="Pre-filled with your saved defaults. Review and edit before generating."
      footer={
        <>
          <button type="button" onClick={resetParties} className="mr-auto inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-fg-subtle transition hover:text-fg">
            <RotateCcw className="size-3.5" aria-hidden />
            <span className="sm:hidden">Reset</span>
            <span className="hidden sm:inline">Reset sender &amp; customer to defaults</span>
          </button>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={FileDown} loading={busy} onClick={generate}>
            Generate PDF
          </Button>
        </>
      }
    >
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div className="space-y-8 p-5 sm:p-6">
          <Section icon={Building2} title="From" hint="your company">
            <Field label="Company name">
              <input className="field" value={form.companyName} onChange={set('companyName')} />
            </Field>
            <Field label="Address / contact" hint="one per line">
              <textarea rows={4} className="field resize-y" value={form.companyLines} onChange={set('companyLines')} />
            </Field>
          </Section>

          <Section icon={UserRound} title="Bill to" hint="customer">
            <Field label="Customer name">
              <input className="field" value={form.billToName} onChange={set('billToName')} />
            </Field>
            <Field label="Address" hint="one per line">
              <textarea rows={3} className="field resize-y" value={form.billToLines} onChange={set('billToLines')} />
            </Field>
          </Section>

          <Section icon={Receipt} title="Invoice details">
            <div className="grid grid-cols-2 gap-3.5">
              <Field label="Invoice #">
                <input className="field font-mono" value={form.invoiceNumber} onChange={set('invoiceNumber')} />
              </Field>
              <Field label="Date">
                <input type="date" className="field" value={form.date} onChange={set('date')} />
              </Field>
              <Field label="Terms">
                <input className="field" list="invoice-terms" value={form.terms} onChange={set('terms')} placeholder="e.g. Net 30" />
              </Field>
              <Field label="Currency">
                <input className="field uppercase" list="invoice-currencies" value={form.currency} onChange={set('currency')} placeholder="USD, QAR, EUR…" />
              </Field>
            </div>
            <datalist id="invoice-terms">
              {TERM_OPTIONS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <datalist id="invoice-currencies">
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Section>

          <Section icon={Package} title="Summary & packaging">
            <Field label="Balance due">
              <input className="field tabular-nums" value={form.balanceDue} onChange={set('balanceDue')} placeholder={autoTotal.toFixed(2)} inputMode="decimal" />
              <span className="mt-1.5 block text-xs text-fg-subtle">
                {totalColumn ? (
                  <>
                    Leave blank to use the <span className="font-semibold text-fg-muted">{totalColumn}</span> column total:{' '}
                    <span className="font-semibold text-fg tabular-nums">{formatNumber(autoTotal)}</span>
                  </>
                ) : (
                  'No numeric amount column found. Enter the balance manually.'
                )}
              </span>
            </Field>
            <Field label="Description of packages">
              <textarea rows={3} className="field resize-y" value={form.packages} onChange={set('packages')} placeholder="e.g. 3 cartons, Beauty Products" />
            </Field>
            <Field label="Gross weight">
              <input className="field" value={form.grossWeight} onChange={set('grossWeight')} placeholder="e.g. 45.5 KG" />
            </Field>
          </Section>
        </div>

        <aside className="hidden border-l border-line bg-surface-2/70 p-5 lg:block">
          <div className="sticky top-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg-muted">
                <Eye className="size-3.5" aria-hidden />
                Live preview
              </span>
              <span className="text-[11px] text-fg-subtle">
                {rows.length} row{rows.length === 1 ? '' : 's'} · Letter
              </span>
            </div>
            <InvoicePreview meta={meta} balance={balance} rows={rows} columns={columns} />
          </div>
        </aside>
      </div>
    </Modal>
  )
}
