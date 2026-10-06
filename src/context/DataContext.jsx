import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import { computeAmount, detectCalcColumns, hasExtraDecimals, isAutoCalc, toFixed2 } from '../lib/columns'
import { storage } from '../lib/storage'

/*
 * Document shape:
 *   { fileName, sheetNames: string[], sheets: { [name]: { columns: string[], rows: object[] } } }
 *
 * Every edit is an immutable update, so undo/redo is a stack of documents.
 * Consecutive keystrokes in one cell are merged into a single history step.
 */

const HISTORY_LIMIT = 100
const SESSION_KEY = 'session'

const DataContext = createContext(null)

function formatAmountColumns(doc) {
  const sheets = {}
  for (const name of doc.sheetNames) {
    const sheet = doc.sheets[name]
    const { amount } = detectCalcColumns(sheet.columns)
    sheets[name] = amount
      ? { ...sheet, rows: sheet.rows.map((row) => ({ ...row, [amount]: toFixed2(row[amount]) })) }
      : sheet
  }
  return { ...doc, sheets }
}

const emptyRow = (columns) => Object.fromEntries(columns.map((c) => [c, '']))

function withSheet(doc, name, update) {
  const sheet = doc.sheets[name]
  if (!sheet) return doc
  const next = update(sheet)
  return next === sheet ? doc : { ...doc, sheets: { ...doc.sheets, [name]: next } }
}

function applyEdit(doc, action) {
  const { sheet: name } = action
  switch (action.type) {
    case 'updateCell':
      return withSheet(doc, name, (sheet) => {
        const { row, column, value } = action
        const rows = [...sheet.rows]
        const next = { ...rows[row], [column]: value }
        const calc = detectCalcColumns(sheet.columns)
        if (isAutoCalc(calc) && (column === calc.qty || column === calc.price)) {
          next[calc.amount] = computeAmount(next[calc.qty], next[calc.price])
        }
        rows[row] = next
        return { ...sheet, rows }
      })

    case 'addRow':
      return withSheet(doc, name, (sheet) => {
        const rows = [...sheet.rows]
        const at = action.after == null ? rows.length : action.after + 1
        rows.splice(at, 0, emptyRow(sheet.columns))
        return { ...sheet, rows }
      })

    case 'duplicateRow':
      return withSheet(doc, name, (sheet) => {
        const rows = [...sheet.rows]
        rows.splice(action.row + 1, 0, { ...rows[action.row] })
        return { ...sheet, rows }
      })

    case 'deleteRow':
      return withSheet(doc, name, (sheet) => ({ ...sheet, rows: sheet.rows.filter((_, i) => i !== action.row) }))

    case 'moveRow':
      return withSheet(doc, name, (sheet) => {
        const { from, to } = action
        const rows = [...sheet.rows]
        if (from === to || from < 0 || to < 0 || from >= rows.length || to >= rows.length) return sheet
        const [moved] = rows.splice(from, 1)
        rows.splice(to, 0, moved)
        return { ...sheet, rows }
      })

    case 'addColumn':
      return withSheet(doc, name, (sheet) => {
        const column = action.column
        if (!column || sheet.columns.includes(column)) return sheet
        const columns = [...sheet.columns, column]
        const rows = sheet.rows.length ? sheet.rows.map((r) => ({ ...r, [column]: '' })) : [emptyRow(columns)]
        return { columns, rows }
      })

    case 'renameColumn':
      return withSheet(doc, name, (sheet) => {
        const { from, to } = action
        if (!to || from === to || sheet.columns.includes(to)) return sheet
        const columns = sheet.columns.map((c) => (c === from ? to : c))
        const rows = sheet.rows.map((r) => Object.fromEntries(columns.map((c) => [c, r[c === to ? from : c] ?? ''])))
        return { columns, rows }
      })

    case 'deleteColumn':
      return withSheet(doc, name, (sheet) => ({
        columns: sheet.columns.filter((c) => c !== action.column),
        rows: sheet.rows.map(({ [action.column]: _removed, ...rest }) => rest),
      }))

    case 'roundColumn':
      return withSheet(doc, name, (sheet) => {
        const { column } = action
        const calc = detectCalcColumns(sheet.columns)
        const recalc = isAutoCalc(calc) && (column === calc.qty || column === calc.price)
        let changed = false
        const rows = sheet.rows.map((row) => {
          if (!hasExtraDecimals(row[column])) return row
          changed = true
          const next = { ...row, [column]: toFixed2(row[column]) }
          if (recalc) next[calc.amount] = computeAmount(next[calc.qty], next[calc.price])
          return next
        })
        return changed ? { ...sheet, rows } : sheet
      })

    default:
      return doc
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'load':
      return { doc: formatAmountColumns(action.doc), past: [], future: [], editKey: null }

    case 'reset':
      return { doc: null, past: [], future: [], editKey: null }

    case 'undo': {
      if (!state.past.length) return state
      return {
        doc: state.past[state.past.length - 1],
        past: state.past.slice(0, -1),
        future: [state.doc, ...state.future],
        editKey: null,
      }
    }

    case 'redo': {
      if (!state.future.length) return state
      return {
        doc: state.future[0],
        past: [...state.past, state.doc],
        future: state.future.slice(1),
        editKey: null,
      }
    }

    case 'seal':
      return state.editKey ? { ...state, editKey: null } : state

    default: {
      if (!state.doc) return state
      const doc = applyEdit(state.doc, action)
      if (doc === state.doc) return state
      const editKey = action.type === 'updateCell' ? `${action.sheet}\u0000${action.row}\u0000${action.column}` : null
      if (editKey && editKey === state.editKey) return { ...state, doc }
      return {
        doc,
        past: [...state.past, state.doc].slice(-HISTORY_LIMIT),
        future: [],
        editKey,
      }
    }
  }
}

function initState() {
  const saved = storage.get(SESSION_KEY)
  const valid = saved?.sheets && Array.isArray(saved.sheetNames) && saved.sheetNames.every((n) => saved.sheets[n]?.columns)
  return { doc: valid ? saved : null, past: [], future: [], editKey: null }
}

export function DataProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState)
  const [saveStatus, setSaveStatus] = useState('saved')

  // Auto-save the current document (debounced).
  useEffect(() => {
    if (!state.doc) {
      storage.remove(SESSION_KEY)
      return
    }
    setSaveStatus('saving')
    const id = setTimeout(() => setSaveStatus(storage.set(SESSION_KEY, state.doc) ? 'saved' : 'error'), 400)
    return () => clearTimeout(id)
  }, [state.doc])

  const act = useCallback((type, payload) => dispatch({ type, ...payload }), [])

  const api = useMemo(
    () => ({
      loadDocument: (doc) => act('load', { doc }),
      reset: () => act('reset'),
      undo: () => act('undo'),
      redo: () => act('redo'),
      seal: () => act('seal'),
      updateCell: (sheet, row, column, value) => act('updateCell', { sheet, row, column, value }),
      addRow: (sheet, after) => act('addRow', { sheet, after }),
      duplicateRow: (sheet, row) => act('duplicateRow', { sheet, row }),
      deleteRow: (sheet, row) => act('deleteRow', { sheet, row }),
      moveRow: (sheet, from, to) => act('moveRow', { sheet, from, to }),
      addColumn: (sheet, column) => act('addColumn', { sheet, column }),
      renameColumn: (sheet, from, to) => act('renameColumn', { sheet, from, to }),
      deleteColumn: (sheet, column) => act('deleteColumn', { sheet, column }),
      roundColumn: (sheet, column) => act('roundColumn', { sheet, column }),
    }),
    [act],
  )

  const value = useMemo(
    () => ({
      ...api,
      doc: state.doc,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      saveStatus,
    }),
    [api, state.doc, state.past.length, state.future.length, saveStatus],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside DataProvider')
  return ctx
}
