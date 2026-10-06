# Sheetly · Excel Data Editor

Upload an Excel/CSV file, edit it in the browser, and export it as Excel or as a commercial invoice PDF.
A rebuild of https://bb-tanvir-sheetly.vercel.app/ with the same features and PDF layout, plus a redesigned UI.

Everything runs client-side; files never leave the browser.

## Run

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build in dist/
npm run preview   # serve dist/ locally
```

## Deploy

- **Vercel**: import the repo; `vercel.json` already rewrites all routes to `index.html`.
- **Apache / Laragon**: serve the `dist/` folder as the site root; `dist/.htaccess` handles the `/edit` route.

## Configure

Invoice defaults (sender company, bill-to customer, terms, currency) live in [`src/config.js`](src/config.js).
Users can override them in the invoice form; their changes are remembered in the browser.

## Features

Same as the original:
- `.xlsx` / `.xls` / `.csv` upload with multi-sheet tabs
- Inline cell editing, add/delete rows and columns, drag rows to reorder, search
- `Amount = Quantity × Unit Price` auto-calculation; unit prices with >2 decimals are flagged with "Jump to next"
- Export to Excel (`<name>-edited.xlsx`) and invoice PDF (`<name>-invoice.pdf`)

New in this version:
- Redesigned UI with light/dark theme and a mobile layout
- Work is auto-saved in the browser, so a refresh doesn't lose edits ("Continue where you left off")
- Undo/redo (`Ctrl+Z` / `Ctrl+Shift+Z`), plus undo toasts after deletes
- Live invoice preview next to the PDF form; sender/customer remembered, invoice number auto-increments
- Rename and duplicate rows/columns, "Round all" for long decimals, keyboard navigation (`Enter`, `↑`/`↓`, `/` to search)
- Try sample data or start from a blank sheet
- SheetJS and jsPDF load on demand, so the first page is lighter

## Stack

Vite · React 19 · React Router · Tailwind CSS v4 · SheetJS (xlsx 0.20.3) · jsPDF + jspdf-autotable · lucide-react
