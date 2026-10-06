import { Link } from 'react-router-dom'

export function LogoMark({ className = 'size-9' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#logo-g)" />
      <rect x="16" y="15" width="32" height="34" rx="5" fill="#fff" fillOpacity=".16" />
      <path d="M16 26h32M16 37h32M28 15v34" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="45" cy="45" r="9" fill="#34d399" stroke="#4338ca" strokeWidth="3" />
      <path d="M41 45.2l2.6 2.6 5-5.2" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Logo({ subtitle = 'Excel Data Editor', to = '/' }) {
  return (
    <Link to={to} className="group flex min-w-0 items-center gap-2.5 rounded-lg">
      <LogoMark className="size-9 shrink-0 transition group-hover:scale-[1.04]" />
      <div className="min-w-0 leading-tight">
        <div className="text-[15px] font-bold tracking-tight text-fg">Sheetly</div>
        <div className="truncate text-xs text-fg-subtle">{subtitle}</div>
      </div>
    </Link>
  )
}
