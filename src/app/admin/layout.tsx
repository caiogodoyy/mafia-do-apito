import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Home, LogOut } from 'lucide-react'
import AdminNav from '@/components/AdminNav'
import { logout } from '@/actions/auth'
import { isAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect('/login')

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pt-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.jpeg"
            alt="Máfia do Apito"
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-xl object-cover ring-1 ring-white/10"
          />
          <span className="text-lg font-black tracking-tight text-slate-50">Admin</span>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/" className="stepper" aria-label="Ver ranking público">
            <Home size={16} />
          </Link>
          <form action={logout}>
            <button type="submit" className="stepper" aria-label="Sair">
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </header>

      <div className="mt-4">
        <AdminNav />
      </div>

      <main className="safe-bottom mt-5 flex-1">{children}</main>
    </div>
  )
}
