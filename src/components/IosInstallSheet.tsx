'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, Share, SquarePlus, X } from 'lucide-react'
import {
  installHintDiagnostics,
  rememberInstallHintDismissal,
  shouldShowInstallHint,
  type InstallHintDiagnostics,
} from '@/lib/pwa'

const SHOW_DELAY = 1200

const STEPS = [
  {
    icon: Share,
    title: 'Toque em Compartilhar',
    description: 'É o quadrado com a seta para cima, na barra de baixo do Safari.',
  },
  {
    icon: ChevronDown,
    title: 'Role o menu para baixo',
    description: 'Se não encontrar a opção de cara, toque em "Mais" ou "Editar ações".',
  },
  {
    icon: SquarePlus,
    title: 'Adicionar à Tela de Início',
    description: 'Confirme em "Adicionar" e a Máfia aparece junto dos seus outros apps.',
  },
]

export default function IosInstallSheet() {
  const [open, setOpen] = useState(false)
  const [diagnostics, setDiagnostics] = useState<InstallHintDiagnostics | null>(null)

  const dismiss = useCallback(() => {
    rememberInstallHintDismissal()
    setOpen(false)
  }, [])

  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).get('pwa') === 'debug'

    if (!forced && !shouldShowInstallHint()) return

    const timer = setTimeout(() => {
      if (forced) setDiagnostics(installHintDiagnostics())
      setOpen(true)
    }, forced ? 0 : SHOW_DELAY)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!open) return

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss()
    }

    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, dismiss])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        aria-label="Fechar"
        onClick={dismiss}
        className="absolute inset-0 animate-fade-in cursor-default bg-black/60 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ios-install-title"
        className="safe-bottom relative w-full max-w-md animate-slide-up rounded-t-3xl border-t border-white/10 bg-pitch-900 px-5 pt-3 shadow-2xl"
      >
        <span className="mx-auto mb-4 block h-1 w-10 rounded-full bg-white/15" />

        <header className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 id="ios-install-title" className="text-lg font-black tracking-tight text-slate-50">
              Instale na tela de início
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Navegue em tela cheia, sem as barras do navegador e com acesso mais rápido.
            </p>
          </div>

          <button onClick={dismiss} aria-label="Fechar" className="stepper mt-0.5">
            <X size={16} />
          </button>
        </header>

        <ol className="mt-5 space-y-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-400/10 text-brand-300">
                <step.icon size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-100">
                  <span className="text-slate-500">{index + 1}.</span> {step.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>

        {diagnostics ? (
          <dl className="mt-5 space-y-1 rounded-2xl border border-white/10 bg-black/30 p-3 text-[11px] text-slate-400">
            {[
              ['iOS', String(diagnostics.ios)],
              ['Safari', String(diagnostics.safari)],
              ['Já instalado', String(diagnostics.standalone)],
              ['Fechado em', diagnostics.dismissedAt ? new Date(diagnostics.dismissedAt).toLocaleString('pt-BR') : 'nunca'],
              ['Apareceria sozinho', String(diagnostics.eligible)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt>{label}</dt>
                <dd className="font-bold text-slate-200">{value}</dd>
              </div>
            ))}
            <p className="break-all pt-2 text-[10px] leading-relaxed text-slate-500">
              {diagnostics.userAgent}
            </p>
          </dl>
        ) : null}

        <button onClick={dismiss} className="btn-primary mt-6 w-full">
          Entendi
        </button>
      </div>
    </div>
  )
}
