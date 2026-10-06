import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { IconButton } from './ui'
import { storage } from '../lib/storage'

export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  const toggle = () => {
    const next = !dark
    document.documentElement.classList.toggle('dark', next)
    storage.set('theme', next ? 'dark' : 'light')
    setDark(next)
  }

  return <IconButton icon={dark ? Sun : Moon} label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggle} />
}
