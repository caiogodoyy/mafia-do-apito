'use server'

import { redirect } from 'next/navigation'
import { checkPassword, endAdminSession, startAdminSession } from '@/lib/auth'

export type LoginState = { error: string | null }

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get('password') ?? '')

  if (!process.env.ADMIN_PASSWORD) {
    return { error: 'ADMIN_PASSWORD não configurada no servidor.' }
  }

  if (!password) {
    return { error: 'Informe a senha.' }
  }

  if (!checkPassword(password)) {
    return { error: 'Senha incorreta.' }
  }

  await startAdminSession()
  redirect('/admin/peladas')
}

export async function logout() {
  await endAdminSession()
  redirect('/')
}
