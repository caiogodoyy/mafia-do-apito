'use client'

import { useActionState } from 'react'
import { KeyRound, LogIn } from 'lucide-react'
import { login, type LoginState } from '@/actions/auth'

const initialState: LoginState = { error: null }

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState)

  return (
    <form action={formAction} className="card w-full max-w-sm p-6">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400/15 text-lime-300">
        <KeyRound size={22} />
      </span>

      <h1 className="mt-4 text-xl font-bold text-slate-50">Área do Admin</h1>
      <p className="mt-1 text-sm text-slate-500">Acesso restrito ao mandachuva da pelada.</p>

      <input
        type="password"
        name="password"
        autoComplete="current-password"
        placeholder="Senha"
        className="field mt-6"
        autoFocus
      />

      {state.error ? (
        <p className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {state.error}
        </p>
      ) : null}

      <button type="submit" className="btn-primary mt-4 w-full" disabled={pending}>
        <LogIn size={16} />
        {pending ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  )
}
