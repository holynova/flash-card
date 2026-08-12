import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

export function FormField({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className={`form-field${error ? ' form-field--error' : ''}`}>
      <span className="form-field__label">{label}</span>
      {children}
      {error ? <span className="form-field__message" role="alert">{error}</span> : hint ? <span className="form-field__hint">{hint}</span> : null}
    </label>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="textarea" {...props} />
}
