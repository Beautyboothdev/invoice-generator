// Default values pre-filled in the invoice form. Edit these to change the
// defaults for every new browser; users can also override them in the form
// (their changes are remembered locally).

export const DEFAULT_COMPANY = {
  name: 'Baycos Inc.',
  lines: ['501 Silverside Rd', 'Wilmington, DE 19809 US', '+1 9293939688', 'CONTACT@BAYCOS.COM'],
}

export const DEFAULT_BILL_TO = {
  name: 'RAMNODE AND BEAUTY BOOTH TRADING W.L.L',
  lines: ['B1-135 DRAGON MART BARWA COMMERCIAL', 'AVENUE DOHA Qatar 13625'],
}

export const DEFAULT_INVOICE = {
  invoiceNumber: 'INV-0001',
  terms: 'Net 30',
  currency: 'USD',
}

export const TERM_OPTIONS = ['Due on receipt', 'Prepaid', 'Net 7', 'Net 15', 'Net 30', 'Net 45', 'Net 60']
export const CURRENCY_OPTIONS = ['USD', 'QAR', 'EUR', 'GBP', 'AED', 'SAR', 'BDT', 'INR', 'CNY']
