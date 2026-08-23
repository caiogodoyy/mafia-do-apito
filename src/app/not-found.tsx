import Link from 'next/link'
import { SearchX } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <SearchX size={40} className="text-slate-600" />
      <div>
        <h1 className="text-xl font-black text-slate-100">Página não encontrada</h1>
        <p className="mt-1 text-sm text-slate-500">Essa pelada não existe ou foi removida.</p>
      </div>
      <Link href="/" className="btn-primary">
        Voltar ao ranking
      </Link>
    </div>
  )
}
