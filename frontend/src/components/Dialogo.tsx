import { useEffect, useRef, type ReactNode } from 'react'
import '../styles/lancamentos.css'

interface DialogoProps {
  id: string
  titulo: string
  aoFechar: () => void
  bloqueado?: boolean
  children: ReactNode
}

/** Janela modal nativa (<dialog>): foco preso, Esc fecha e leitores de tela entendem. */
export default function Dialogo({
  id,
  titulo,
  aoFechar,
  bloqueado = false,
  children,
}: DialogoProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialogo = ref.current
    if (dialogo && !dialogo.open) dialogo.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      className="dialogo"
      aria-labelledby={`${id}-titulo`}
      onCancel={(event) => {
        if (bloqueado) event.preventDefault()
      }}
      onClose={aoFechar}
      onMouseDown={(event) => {
        if (event.target === ref.current && !bloqueado) ref.current?.close()
      }}
    >
      <div className="dialogo-corpo">
        <h2 className="dialogo-titulo" id={`${id}-titulo`}>
          {titulo}
        </h2>
        {children}
      </div>
    </dialog>
  )
}