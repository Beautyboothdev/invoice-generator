import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Calculator, CircleAlert, CloudUpload, FilePlus2, FileSpreadsheet, FileText, LoaderCircle, ShieldCheck, Sparkles, TableProperties, Trash2 } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../components/Toaster'
import { Logo } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'
import { Button, cx } from '../components/ui'
import { ACCEPTED_EXTENSIONS, isAcceptedFile, parseSpreadsheet } from '../lib/workbook'
import { blankDocument, sampleDocument } from '../lib/sample'

const FEATURES = [
  { icon: TableProperties, title: 'Inline editing', text: 'Edit any cell, rename, add or remove columns and rows, and drag rows into order.' },
  { icon: Calculator, title: 'Auto calculations', text: 'Amount stays in sync with Quantity × Unit Price, and prices with too many decimals get flagged.' },
  { icon: FileText, title: 'Invoice PDF', text: 'Export a polished commercial invoice, with a live preview before you download.' },
  { icon: ShieldCheck, title: 'Private by design', text: 'Files never leave your device. Everything runs and saves in your browser.' },
]

const countRows = (doc) => doc.sheetNames.reduce((n, s) => n + doc.sheets[s].rows.length, 0)

export default function UploadPage() {
  const navigate = useNavigate()
  const { doc, loadDocument, reset } = useData()
  const { toast } = useToast()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)
  const dragDepth = useRef(0)

  const open = (next, message) => {
    loadDocument(next)
    if (message) toast(message)
    navigate('/edit')
  }

  const handleFile = async (file) => {
    if (!file || busy) return
    if (!isAcceptedFile(file)) {
      setError(`“${file.name}” isn't a supported file. Choose an ${ACCEPTED_EXTENSIONS.join(', ')} file.`)
      return
    }
    setError('')
    setBusy(true)
    try {
      const parsed = await parseSpreadsheet(file)
      const sheets = parsed.sheetNames.length
      open(parsed, {
        title: `Opened ${file.name}`,
        description: `${sheets} sheet${sheets === 1 ? '' : 's'} · ${countRows(parsed).toLocaleString()} rows`,
      })
    } catch (err) {
      setError(`Could not read this file: ${err.message}`)
      setBusy(false)
    }
  }

  const dropHandlers = {
    onDragEnter: (e) => {
      e.preventDefault()
      dragDepth.current += 1
      setDragging(true)
    },
    onDragOver: (e) => e.preventDefault(),
    onDragLeave: () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1)
      if (dragDepth.current === 0) setDragging(false)
    },
    onDrop: (e) => {
      e.preventDefault()
      dragDepth.current = 0
      setDragging(false)
      handleFile(e.dataTransfer.files?.[0])
    },
  }

  const browse = () => !busy && inputRef.current?.click()

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="relative z-10 border-b border-line/70 bg-surface/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo subtitle="Upload · Edit · Export" />
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-fg-muted sm:inline-flex">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-ok opacity-50" />
                <span className="relative inline-flex size-2 rounded-full bg-ok" />
              </span>
              Runs entirely in your browser
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative flex-1">
        <div className="bg-hero pointer-events-none absolute inset-x-0 top-0 h-[560px]" aria-hidden />

        <div className="relative mx-auto max-w-3xl px-4 pt-14 pb-16 sm:px-6 sm:pt-20">
          <div className="mb-10 text-center">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-soft-fg">
              <Sparkles className="size-3.5" aria-hidden />
              Excel · CSV · Multi-sheet workbooks
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight text-balance text-fg sm:text-[3.25rem] sm:leading-[1.08]">
              Edit your spreadsheets.
              <br />
              <span className="bg-gradient-to-r from-brand via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">Export beautiful invoices.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-pretty text-fg-muted">
              Drop in an Excel or CSV file, clean it up in a fast spreadsheet editor, then download it as Excel or as a professional invoice PDF.
            </p>
          </div>

          {doc && (
            <div className="mb-5 flex animate-pop-in flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-sm">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-ok-soft text-ok-fg">
                <FileSpreadsheet className="size-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-fg-subtle">Continue where you left off</p>
                <p className="truncate text-sm font-semibold text-fg">{doc.fileName}</p>
                <p className="text-xs text-fg-muted">
                  {doc.sheetNames.length} sheet{doc.sheetNames.length === 1 ? '' : 's'} · {countRows(doc).toLocaleString()} rows
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" icon={Trash2} onClick={reset}>
                  Discard
                </Button>
                <Button variant="primary" size="sm" onClick={() => navigate('/edit')}>
                  Continue
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
              </div>
            </div>
          )}

          <div
            role="button"
            tabIndex={0}
            aria-label="Upload a spreadsheet: drop a file here or press Enter to browse"
            aria-busy={busy}
            onClick={browse}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), browse())}
            {...dropHandlers}
            className={cx(
              'group relative overflow-hidden rounded-3xl border-2 bg-surface/90 shadow-sm backdrop-blur transition-all duration-200',
              busy
                ? 'border-brand/50'
                : dragging
                  ? 'scale-[1.01] border-brand bg-brand-soft shadow-xl shadow-brand/15'
                  : 'border-dashed border-line-strong hover:border-brand/60 hover:shadow-lg hover:shadow-brand/5',
            )}
          >
            <div className="px-6 py-14 text-center sm:py-16">
              <div
                className={cx(
                  'mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl transition-all duration-200',
                  busy || dragging ? 'bg-brand text-brand-fg' : 'bg-surface-2 text-fg-muted ring-1 ring-line group-hover:-translate-y-0.5 group-hover:bg-brand group-hover:text-brand-fg group-hover:ring-brand',
                )}
              >
                {busy ? <LoaderCircle className="size-7 animate-spin" aria-hidden /> : <CloudUpload className="size-7" aria-hidden />}
              </div>
              <h2 className="text-lg font-bold tracking-tight text-fg">
                {busy ? 'Reading your file…' : dragging ? 'Drop to open' : 'Drop a file here or click to browse'}
              </h2>
              <p className="mt-1.5 text-sm text-fg-muted">Up to a few thousand rows, across any number of sheets.</p>
              <div className="mt-5 flex items-center justify-center gap-1.5">
                {ACCEPTED_EXTENSIONS.map((ext) => (
                  <span key={ext} className="rounded-md border border-line bg-surface-2 px-2 py-0.5 font-mono text-[11px] font-medium text-fg-muted">
                    {ext}
                  </span>
                ))}
              </div>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS.join(',')}
              onChange={(e) => {
                handleFile(e.target.files?.[0])
                e.target.value = ''
              }}
              className="hidden"
              disabled={busy}
            />
          </div>

          {error && (
            <div className="mt-4 flex animate-pop-in items-start gap-3 rounded-xl border border-danger-line bg-danger-soft p-4 text-sm text-danger-fg" role="alert">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>{error}</p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm text-fg-subtle">
            <span>No file handy?</span>
            <Button size="sm" icon={Sparkles} onClick={() => open(sampleDocument(), { title: 'Sample data loaded', description: 'Try editing a quantity or price.', tone: 'info' })}>
              Try sample data
            </Button>
            <Button size="sm" icon={FilePlus2} onClick={() => open(blankDocument())}>
              Start a blank sheet
            </Button>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="group rounded-2xl border border-line bg-surface p-5 transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md">
                <div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand-soft-fg transition group-hover:bg-brand group-hover:text-brand-fg">
                  <Icon className="size-4.5" aria-hidden />
                </div>
                <h3 className="text-sm font-bold tracking-tight text-fg">{title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-fg-subtle sm:px-6">
          <span>© {new Date().getFullYear()} Sheetly · Excel Data Editor</span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" aria-hidden />
            All processing happens in your browser.
          </span>
        </div>
      </footer>
    </div>
  )
}
