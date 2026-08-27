'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Users } from 'lucide-react'

const links = [
  { href: '/admin/peladas', label: 'Peladas', icon: CalendarDays },
  { href: '/admin/jogadores', label: 'Jogadores', icon: Users },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-2 rounded-2xl border border-white/10 bg-black/30 p-1">
      {links.map((link) => {
        const active = pathname.startsWith(link.href)

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              active ? 'bg-brand-900 text-slate-50' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <link.icon size={16} />
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
