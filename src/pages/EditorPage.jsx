import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Calculator,
  CloudCheck,
  CloudOff,
  Columns3,
  CornerDownLeft,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  Plus,
  Redo2,
  Search,
  TriangleAlert,
  Undo2,
  Wand2,
  X,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../components/Toaster'
import { LogoMark } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'
import { DataTable } from '../components/DataTable'
import { InvoiceModal } from '../components/InvoiceModal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Banner, Button, IconButton, Kbd, cx } from '../components/ui'
import { detectCalcColumns, detectTotalColumn, formatNumber, hasExtraDecimals, isAutoCalc, numericColumns, sumColumn } from '../lib/columns'
import { exportWorkbook } from '../lib/workbook'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
const MOD = isMac ? '⌘' : 'Ctrl'

function SaveStatus({ status }) {
  const states = {
    saving: { icon: LoaderCircle, text: 'Saving…', className: 'text-fg-subtle', spin: true },
    saved: { icon: CloudCheck, text: 'Saved in this browser', className: 'text-ok-fg' },
    error: { icon: CloudOff, text: 'Too large to auto-save', className: 'text-warn-fg' },
  }
  const s = states[status] || states.saved
  return (
    <span className={cx('hidden items-center gap-1 text-[11px] font-medium md:inline-flex', s.className)} title={status === 'error' ? 'This file is too big for browser storage. Export to Excel to keep your changes.' : undefined}>
      <s.icon className={cx('size-3.5', s.spin && 'animate-spin')} aria-hidden />
      {s.text}
    </span>
  )
}

function Stat({ label, value, tone }) {
  return (
    <div
      className={cx(
        'flex items-baseline gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs',
        tone === 'danger' ? 'border-danger-line bg-danger-soft text-danger-fg' : 'border-line bg-surface',
      )}
    >
      <span className={tone === 'danger' ? '' : 'text-fg-subtle'}>{label}</span>
      <span className={cx('font-semibold tabular-nums', tone !== 'danger' && 'text-fg')}>{value}</span>
    </div>
  )
}

export default function EditorPage() {
  const navigate = useNavigate()
  const data = useData()
  const { doc, updateCell, seal, addRow, duplicateRow, deleteRow, moveRow, addColumn, renameColumn, deleteColumn, roundColumn, undo, redo, reset } = data
  const { toast } = useToast()

  const [activeSheet, setActiveSheet] = useState(() => doc?.sheetNames[0] ?? '')
  const [query, setQuery] = useState('')
  const [newColumn, setNewColumn] = useState('')
  const [columnError, setColumnError] = useState('')
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [exporting, setExporting] = useState(false)
  const searchRef = useRef(null)
  const jumpIndex = useRef(0)

  useEffect(() => {
    if (!doc) navigate('/', { replace: true })
  }, [doc, navigate])

  const sheetName = doc?.sheets[activeSheet] ? activeSheet : doc?.sheetNames[0]
  const sheet = doc?.sheets[sheetName]
  const columns = useMemo(() => sheet?.columns ?? [], [sheet])
  const rows = useMemo(() => sheet?.rows ?? [], [sheet])

  useEffect(() => {
    jumpIndex.current = 0
    setColumnError('')
  }, [sheetName])

  const calc = useMemo(() => detectCalcColumns(columns), [columns])
  const autoCalc = isAutoCalc(calc)
  const numericKey = useMemo(() => [...numericColumns(rows, columns, { strict: true })].join('\u0000'), [rows, columns])
  const totalColumn = useMemo(() => detectTotalColumn(rows, columns), [rows, columns])
  const total = useMemo(() => sumColumn(rows, totalColumn), [rows, totalColumn])
  const invalidCount = useMemo(() => (calc.price ? rows.filter((r) => hasExtraDecimals(r[calc.price])).length : 0), [rows, calc.price])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const all = rows.map((_, i) => i)
    if (!q) return all
    return all.filter((i) => Object.values(rows[i]).some((v) => String(v ?? '').toLowerCase().includes(q)))
  }, [rows, query])

  // ---- Actions ---------------------------------------------------------

  const onCell = useCallback((row, column, value) => updateCell(sheetName, row, column, value), [updateCell, sheetName])
  const onMove = useCallback((from, to) => moveRow(sheetName, from, to), [moveRow, sheetName])
  const onDuplicate = useCallback((row) => duplicateRow(sheetName, row), [duplicateRow, sheetName])

  const onDelete = useCallback(
    (row) => {
      deleteRow(sheetName, row)
      toast({ title: `Row ${row + 1} deleted`, tone: 'info', action: { label: 'Undo', onClick: undo } })
    },
    [deleteRow, sheetName, toast, undo],
  )

  const onRenameColumn = useCallback(
    (from, to) => {
      if (columns.includes(to)) {
        toast({ tone: 'error', title: `Column “${to}” already exists` })
        return false
      }
      renameColumn(sheetName, from, to)
      return true
    },
    [columns, renameColumn, sheetName, toast],
  )

  const onDeleteColumn = useCallback(
    (column) =>
      setConfirm({
        title: 'Delete column?',
        message: `Column “${column}” will be removed from every row in this sheet.`,
        confirmText: 'Delete column',
        onConfirm: () => {
          deleteColumn(sheetName, column)
          toast({ title: `Column “${column}” deleted`, tone: 'info', action: { label: 'Undo', onClick: undo } })
        },
      }),
    [deleteColumn, sheetName, toast, undo],
  )

  const submitColumn = () => {
    const name = newColumn.trim()
    if (!name) return
    if (columns.includes(name)) {
      setColumnError(`Column “${name}” already exists.`)
      return
    }
    addColumn(sheetName, name)
    setNewColumn('')
    setColumnError('')
  }

  const jumpToInvalid = () => {
    const inputs = document.querySelectorAll('input[data-invalid-price="true"]')
    if (!inputs.length) return
    const i = jumpIndex.current % inputs.length
    const el = inputs[i]
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    el.focus({ preventScroll: true })
    el.select()
    jumpIndex.current = i + 1
  }

  const roundAll = () => {
    roundColumn(sheetName, calc.price)
    toast({ title: `Rounded ${invalidCount} ${calc.price} value${invalidCount === 1 ? '' : 's'} to 2 decimals`, action: { label: 'Undo', onClick: undo } })
  }

  const exportExcel = async () => {
    setExporting(true)
    try {
      const name = await exportWorkbook(doc)
      toast({ title: 'Excel file downloaded', description: name })
    } catch (err) {
      toast({ tone: 'error', title: 'Export failed', description: err.message })
    } finally {
      setExporting(false)
    }
  }

  const newFile = () =>
    setConfirm({
      title: 'Start a new file?',
      message: 'Your current changes will be cleared from this browser. Export to Excel first if you want to keep them.',
      confirmText: 'Yes, start over',
      onConfirm: () => {
        reset()
        navigate('/')
      },
    })

  // ---- Keyboard shortcuts ---------------------------------------------

  useEffect(() => {
    const onKey = (e) => {
      if (document.querySelector('[role="dialog"]')) return
      const el = document.activeElement
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && !el.hasAttribute('data-cell')
      const mod = e.ctrlKey || e.metaKey
      if (e.key === '/' && !mod && !(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'))) {
        e.preventDefault()
        searchRef.current?.focus()
        return
      }
      if (!mod || typing) return
      const key = e.key.toLowerCase()
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  if (!doc || !sheet) return null

  const filtered = query.trim().length > 0

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button type="button" onClick={() => navigate('/')} className="shrink-0 rounded-xl" title="Back to home" aria-label="Back to home">
              <LogoMark className="size-9" />
            </button>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-1.5">
                <FileSpreadsheet className="size-4 shrink-0 text-ok" aria-hidden />
                <h1 className="truncate text-sm font-semibold tracking-tight text-fg" title={doc.fileName}>
                  {doc.fileName || 'Untitled'}
                </h1>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-fg-subtle">
                <span>
                  {doc.sheetNames.length} sheet{doc.sheetNames.length === 1 ? '' : 's'}
                </span>
                <span aria-hidden className="hidden md:inline">
                  ·
                </span>
                <SaveStatus status={data.saveStatus} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-lg border border-line bg-surface p-0.5">
              <IconButton icon={Undo2} size="sm" label={`Undo (${MOD}+Z)`} onClick={undo} disabled={!data.canUndo} />
              <IconButton icon={Redo2} size="sm" label={`Redo (${MOD}+Shift+Z)`} onClick={redo} disabled={!data.canRedo} />
            </div>
            <Button icon={FileSpreadsheet} loading={exporting} onClick={exportExcel} className="[&>svg]:text-ok" aria-label="Export Excel">
              <span className="sm:hidden">Excel</span>
              <span className="hidden sm:inline">Export Excel</span>
            </Button>
            <Button variant="primary" icon={FileText} onClick={() => setInvoiceOpen(true)} aria-label="Download PDF">
              <span className="sm:hidden">PDF</span>
              <span className="hidden sm:inline">Download PDF</span>
            </Button>
            <Button variant="ghost" icon={FilePlus2} onClick={newFile} aria-label="New file" title="New file">
              <span className="hidden sm:inline">New file</span>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-3 px-4 py-4 sm:px-6 lg:min-h-0">
        {/* Sheet tabs + stats */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {doc.sheetNames.length > 1 ? (
            <div className="scroll-area -mx-1 flex max-w-full overflow-x-auto px-1" role="tablist" aria-label="Sheets">
              <div className="flex gap-1 rounded-xl bg-surface-3/70 p-1">
                {doc.sheetNames.map((name) => {
                  const active = name === sheetName
                  return (
                    <button
                      key={name}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveSheet(name)}
                      className={cx(
                        'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition',
                        active ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
                      )}
                    >
                      {name}
                      <span className={cx('rounded-md px-1.5 text-[11px] tabular-nums', active ? 'bg-brand-soft text-brand-soft-fg' : 'bg-surface/60 text-fg-subtle')}>
                        {doc.sheets[name].rows.length}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
              <span className="size-2 rounded-full bg-brand" aria-hidden />
              {sheetName}
            </h2>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Stat label="Rows" value={rows.length.toLocaleString()} />
            <Stat label="Columns" value={columns.length} />
            {totalColumn && <Stat label={`${totalColumn} total`} value={formatNumber(total)} />}
            {invalidCount > 0 && <Stat tone="danger" label="Issues" value={invalidCount} />}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-2 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
          <div className="relative grow basis-full sm:basis-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
              placeholder="Search any cell…"
              aria-label="Search rows"
              className="field h-9 pr-16 pl-9 [&::-webkit-search-cancel-button]:hidden"
            />
            <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
              {query ? <IconButton icon={X} size="sm" label="Clear search" onClick={() => setQuery('')} /> : <Kbd>/</Kbd>}
            </div>
          </div>

          <div className="flex min-w-[220px] grow gap-2 sm:grow-0">
            <div className="relative min-w-0 grow sm:w-56 sm:grow-0">
              <Columns3 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
              <input
                type="text"
                value={newColumn}
                onChange={(e) => {
                  setNewColumn(e.target.value)
                  if (columnError) setColumnError('')
                }}
                onKeyDown={(e) => e.key === 'Enter' && submitColumn()}
                placeholder="New column name"
                aria-label="New column name"
                aria-invalid={Boolean(columnError) || undefined}
                className={cx('field h-9 pl-9', columnError && 'border-danger focus:border-danger focus:ring-danger/15')}
              />
            </div>
            <Button icon={Plus} onClick={submitColumn} disabled={!newColumn.trim()}>
              Column
            </Button>
          </div>

          <Button variant="primary" icon={Plus} onClick={() => addRow(sheetName)}>
            Row
          </Button>
        </div>

        {/* Notices */}
        {(columnError || autoCalc || invalidCount > 0) && (
          <div className="grid gap-2">
            {columnError && (
              <Banner tone="danger" icon={TriangleAlert}>
                {columnError}
              </Banner>
            )}
            {autoCalc && (
              <Banner tone="warn" icon={Calculator}>
                <span className="font-semibold">{calc.amount}</span> is calculated automatically from <span className="font-semibold">{calc.qty}</span> ×{' '}
                <span className="font-semibold">{calc.price}</span>.
              </Banner>
            )}
            {invalidCount > 0 && (
              <Banner
                tone="danger"
                icon={TriangleAlert}
                action={
                  <>
                    <Button size="xs" variant="ghost" icon={Wand2} onClick={roundAll} className="text-danger-fg hover:bg-danger/10 hover:text-danger-fg">
                      Round all
                    </Button>
                    <Button size="xs" variant="danger" onClick={jumpToInvalid}>
                      Jump to next
                      <ArrowRight className="size-3.5" aria-hidden />
                    </Button>
                  </>
                }
              >
                <span className="font-semibold">{invalidCount}</span> <span className="font-semibold">{calc.price}</span> cell
                {invalidCount === 1 ? ' has' : 's have'} more than 2 decimal places. Fix them manually or round them all at once.
              </Banner>
            )}
          </div>
        )}

        {/* Grid */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.04)] lg:min-h-0 lg:flex-1">
          <div className="scroll-area max-h-[70vh] min-h-[240px] overflow-auto lg:max-h-none lg:min-h-0 lg:flex-1">
            <DataTable
              sheet={sheetName}
              columns={columns}
              rows={rows}
              visible={visible}
              query={query.trim()}
              calc={calc}
              autoCalc={autoCalc}
              numericKey={numericKey}
              onCell={onCell}
              onSeal={seal}
              onMove={onMove}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onRenameColumn={onRenameColumn}
              onDeleteColumn={onDeleteColumn}
              onAddRow={() => addRow(sheetName)}
              onClearSearch={() => setQuery('')}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line bg-surface-2/60 px-4 py-2 text-xs text-fg-muted">
            <span>
              Showing <span className="font-semibold text-fg tabular-nums">{visible.length.toLocaleString()}</span> of {rows.length.toLocaleString()} rows
              {filtered && <span className="text-fg-subtle"> (filtered, so drag to reorder is off)</span>}
            </span>
            <span className="hidden items-center gap-3 text-fg-subtle lg:flex">
              <span className="inline-flex items-center gap-1">
                <Kbd>
                  <CornerDownLeft className="size-3" aria-hidden />
                </Kbd>
                next row
              </span>
              <span className="inline-flex items-center gap-1">
                <Kbd>{MOD}</Kbd>
                <Kbd>Z</Kbd>
                undo
              </span>
              <span className="inline-flex items-center gap-1">
                <Kbd>/</Kbd>
                search
              </span>
            </span>
          </div>
        </div>
      </main>

      <InvoiceModal open={invoiceOpen} onClose={() => setInvoiceOpen(false)} rows={rows} columns={columns} fileName={doc.fileName} />
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title}
        message={confirm?.message}
        confirmText={confirm?.confirmText}
        onConfirm={confirm?.onConfirm}
        onClose={() => setConfirm(null)}
      />
    </div>
  )
}
