import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import LoginForm from '@/components/LoginForm'
import { isAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  if (await isAdmin()) redirect('/admin/peladas')

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <LoginForm />

      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-slate-300"
      >
        <ChevronLeft size={16} />
        Voltar ao ranking
      </Link>
    </div>
  )
}
