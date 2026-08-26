'use client'

import { useRef } from 'react'
import { Upload } from 'lucide-react'
import { MAX_IMPORT_FILE_SIZE } from '@/lib/import-txt'

type Props = {
  label: string
  disabled?: boolean
  className?: string
  onLoad: (content: string) => void
  onError: (message: string) => void
}

export default function TxtImportButton({
  label,
  disabled,
  className = 'btn-ghost',
  onLoad,
  onError,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    if (!file.name.toLowerCase().endsWith('.txt')) {
      onError('Envie um arquivo .txt.')
      return
    }

    if (file.size > MAX_IMPORT_FILE_SIZE) {
      onError('Arquivo muito grande. O limite é 200 KB.')
      return
    }

    try {
      const content = await file.text()
      onLoad(content)
    } catch {
      onError('Não foi possível ler o arquivo.')
    }
  }

  return (
    <>
      <button
        type="button"
        className={className}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={14} />
        {label}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".txt,text/plain"
        className="hidden"
        onChange={handleChange}
      />
    </>
  )
}
