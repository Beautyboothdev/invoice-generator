import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Calculator, Copy, GripVertical, Pencil, Plus, SearchX, Trash2, X } from 'lucide-react'
import { Button, IconButton, cx } from './ui'
import { hasExtraDecimals } from '../lib/columns'

const REVEAL = 'opacity-0 transition group-hover/row:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100'

function columnWidth(name, rows) {
  let longest = String(name).length
  for (let i = 0; i < Math.min(rows.length, 300); i++) {
    longest = Math.max(longest, String(rows[i][name] ?? '').length)
  }
  return Math.round(Math.min(Math.max(longest, 6), 42) * 7.4 + 34)
}

function ColumnHeader({ name, width, isCalc, numeric, onRename, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)

  const commit = () => {
    const next = draft.trim()
    if (next && next !== name && !onRename(name, next)) return
    setEditing(false)
  }

  return (
    <th scope="col" style={{ minWidth: width }} className="group/th sticky top-0 z-10 border-b border-line bg-surface-2 px-1.5 text-left font-normal">
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') {
              setDraft(name)
              setEditing(false)
            }
          }}
          aria-label={`Rename column ${name}`}
          className="my-1.5 h-7 w-full rounded-md border border-brand bg-surface px-2 text-xs font-semibold text-fg ring-4 ring-ring outline-none"
        />
      ) : (
        <div className={cx('flex h-10 items-center gap-1.5', numeric ? 'flex-row-reverse pr-1.5' : 'pl-1.5')}>
          <span className="truncate text-[11px] font-semibold tracking-wider text-fg-muted uppercase" title={name}>
            {name}
          </span>
          {isCalc && (
            <span className="inline-flex items-center gap-0.5 rounded bg-calc-bg px-1 py-0.5 text-[10px] font-semibold text-calc-fg" aria-label="Auto-calculated">
              <Calculator className="size-3" aria-hidden />
              auto
            </span>
          )}
          <div
            className={cx(
              'flex opacity-0 transition group-hover/th:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100',
              numeric ? 'mr-auto' : 'ml-auto',
            )}
          >
            <IconButton
              size="sm"
              icon={Pencil}
              label={`Rename column ${name}`}
              onClick={() => {
                setDraft(name)
                setEditing(true)
              }}
            />
            <IconButton size="sm" tone="danger" icon={X} label={`Delete column ${name}`} onClick={() => onDelete(name)} />
          </div>
        </div>
      )}
    </th>
  )
}

const DataRow = memo(function DataRow({
  index,
  position,
  row,
  columns,
  calcColumn,
  priceColumn,
  numericKey,
  query,
  canDrag,
  isDragging,
  dropEdge,
  onCell,
  onSeal,
  onKeyNav,
  onDragStartRow,
  onDragOverRow,
  onDropRow,
  onDragEndRow,
  onDuplicate,
  onDelete,
}) {
  const numeric = useMemo(() => new Set(numericKey.split('\u0000')), [numericKey])
  const q = query.toLowerCase()

  return (
    <tr
      onDragOver={canDrag ? (e) => onDragOverRow(e, index) : undefined}
      onDrop={canDrag ? (e) => onDropRow(e, index) : undefined}
      onDragEnd={onDragEndRow}
      className={cx(
        'group/row',
        isDragging && 'opacity-40',
        dropEdge === 'top' && '[&>td]:shadow-[inset_0_2px_0_var(--brand)]',
        dropEdge === 'bottom' && '[&>td]:shadow-[inset_0_-2px_0_var(--brand)]',
      )}
    >
      <td className="sticky left-0 z-[5] w-16 border-b border-line bg-surface px-1 transition-colors group-hover/row:bg-surface-2">
        <div className="flex items-center gap-0.5">
          {canDrag ? (
            <div
              draggable
              onDragStart={(e) => onDragStartRow(e, index)}
              title="Drag to reorder"
              className="flex h-7 w-5 cursor-grab items-center justify-center rounded text-fg-subtle/60 transition hover:bg-surface-3 hover:text-fg active:cursor-grabbing"
            >
              <GripVertical className="size-3.5" aria-hidden />
            </div>
          ) : (
            <span className="w-5" />
          )}
          <span className="font-mono text-[11px] text-fg-subtle tabular-nums">{index + 1}</span>
        </div>
      </td>
      {columns.map((col, ci) => {
        const value = row[col]
        const isCalc = col === calcColumn
        const invalid = col === priceColumn && hasExtraDecimals(value)
        const match = q && String(value ?? '').toLowerCase().includes(q)
        return (
          <td key={col} className="border-b border-line p-1 transition-colors group-hover/row:bg-surface-2/50">
            <input
              type="text"
              size={1}
              data-cell
              data-r={position}
              data-c={ci}
              value={value ?? ''}
              readOnly={isCalc}
              onChange={(e) => onCell(index, col, e.target.value)}
              onBlur={onSeal}
              onKeyDown={onKeyNav}
              data-invalid-price={invalid ? 'true' : undefined}
              aria-label={`${col}, row ${index + 1}`}
              aria-invalid={invalid || undefined}
              title={
                isCalc
                  ? 'Auto-calculated: Quantity × Unit Price'
                  : invalid
                    ? 'More than 2 decimal places. Edit to keep only 2 digits after the decimal point.'
                    : undefined
              }
              className={cx(
                'block h-8 w-full rounded-md border px-2 text-[13px] outline-none transition',
                numeric.has(col) && 'text-right tabular-nums',
                isCalc
                  ? 'cursor-default border-transparent bg-calc-bg font-semibold text-calc-fg'
                  : invalid
                    ? 'border-danger-line bg-danger-soft font-semibold text-danger-fg focus:border-danger focus:ring-4 focus:ring-danger/15'
                    : cx(
                        'border-transparent text-fg hover:border-line focus:border-brand focus:bg-surface focus:ring-4 focus:ring-ring',
                        match ? 'bg-brand-soft' : 'bg-transparent',
                      ),
              )}
            />
          </td>
        )
      })}
      <td className="sticky right-0 z-[5] w-[72px] border-b border-line bg-surface px-1 transition-colors group-hover/row:bg-surface-2">
        <div className={cx('flex justify-end', REVEAL)}>
          <IconButton size="sm" icon={Copy} label={`Duplicate row ${index + 1}`} onClick={() => onDuplicate(index)} />
          <IconButton size="sm" tone="danger" icon={Trash2} label={`Delete row ${index + 1}`} onClick={() => onDelete(index)} />
        </div>
      </td>
    </tr>
  )
})

export function DataTable({
  sheet,
  columns,
  rows,
  visible,
  query,
  calc,
  autoCalc,
  numericKey,
  onCell,
  onSeal,
  onMove,
  onDuplicate,
  onDelete,
  onRenameColumn,
  onDeleteColumn,
  onAddRow,
  onClearSearch,
}) {
  const tableRef = useRef(null)
  const dragFrom = useRef(null)
  const [dragging, setDragging] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)
  const canDrag = !query
  const numeric = useMemo(() => new Set(numericKey.split('\u0000')), [numericKey])

  useEffect(() => {
    dragFrom.current = null
    setDragging(null)
    setDropTarget(null)
  }, [sheet])

  // Widths are measured once per sheet/column set so typing doesn't make columns jump.
  const widths = useMemo(
    () => Object.fromEntries(columns.map((c) => [c, columnWidth(c, rows)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sheet, columns],
  )

  const onKeyNav = useCallback((e) => {
    const r = Number(e.currentTarget.dataset.r)
    const c = Number(e.currentTarget.dataset.c)
    let target
    if (e.key === 'Enter') target = e.shiftKey ? r - 1 : r + 1
    else if (e.key === 'ArrowDown') target = r + 1
    else if (e.key === 'ArrowUp') target = r - 1
    else if (e.key === 'Escape') {
      e.currentTarget.blur()
      return
    } else return
    e.preventDefault()
    const next = tableRef.current?.querySelector(`input[data-r="${target}"][data-c="${c}"]`)
    if (next) {
      next.focus()
      next.select()
    }
  }, [])

  const onDragStartRow = useCallback((e, index) => {
    dragFrom.current = index
    setDragging(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
    const tr = e.currentTarget.closest('tr')
    if (tr) e.dataTransfer.setDragImage(tr, 24, 20)
  }, [])

  const onDragOverRow = useCallback((e, index) => {
    if (dragFrom.current === null) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget(index)
  }, [])

  const onDropRow = useCallback(
    (e, index) => {
      e.preventDefault()
      const from = dragFrom.current
      if (from !== null && from !== index) onMove(from, index)
      dragFrom.current = null
      setDragging(null)
      setDropTarget(null)
    },
    [onMove],
  )

  const onDragEndRow = useCallback(() => {
    dragFrom.current = null
    setDragging(null)
    setDropTarget(null)
  }, [])

  if (!columns.length) {
    return (
      <EmptyState icon={Plus} title="This sheet has no columns yet" text="Add a column with the toolbar above to start entering data." />
    )
  }

  if (!rows.length) {
    return (
      <EmptyState icon={Plus} title="No rows yet" text="Add your first row to start entering data.">
        <Button variant="primary" icon={Plus} onClick={onAddRow} className="mt-4">
          Add first row
        </Button>
      </EmptyState>
    )
  }

  return (
    <div className="relative">
      <table ref={tableRef} className="w-max min-w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th scope="col" className="sticky top-0 left-0 z-20 w-16 border-b border-line bg-surface-2 pl-7 text-left text-[11px] font-semibold text-fg-subtle">
              #
            </th>
            {columns.map((c) => (
              <ColumnHeader
                key={c}
                name={c}
                width={widths[c] ?? 120}
                numeric={numeric.has(c)}
                isCalc={autoCalc && c === calc.amount}
                onRename={onRenameColumn}
                onDelete={onDeleteColumn}
              />
            ))}
            <th scope="col" className="sticky top-0 right-0 z-20 w-[72px] border-b border-line bg-surface-2">
              <span className="sr-only">Row actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {visible.map((index, position) => (
            <DataRow
              key={index}
              index={index}
              position={position}
              row={rows[index]}
              columns={columns}
              calcColumn={autoCalc ? calc.amount : null}
              priceColumn={calc.price}
              numericKey={numericKey}
              query={query}
              canDrag={canDrag}
              isDragging={dragging === index}
              dropEdge={dropTarget === index && dragging !== null && dragging !== index ? (dragging > index ? 'top' : 'bottom') : null}
              onCell={onCell}
              onSeal={onSeal}
              onKeyNav={onKeyNav}
              onDragStartRow={onDragStartRow}
              onDragOverRow={onDragOverRow}
              onDropRow={onDropRow}
              onDragEndRow={onDragEndRow}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
      {visible.length === 0 && (
        <EmptyState icon={SearchX} title="No matching rows" text={`Nothing in this sheet contains “${query}”.`}>
          <Button size="sm" onClick={onClearSearch} className="mt-4">
            Clear search
          </Button>
        </EmptyState>
      )}
    </div>
  )
}

function EmptyState({ icon: Icon, title, text, children }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-surface-2 text-fg-subtle ring-1 ring-line">
        <Icon className="size-5" aria-hidden />
      </div>
      <h3 className="text-sm font-semibold text-fg">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-fg-muted">{text}</p>
      {children}
    </div>
  )
}
