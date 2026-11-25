import TextField, { type TextFieldProps } from '@mui/material/TextField'
import { useEffect, useRef, useState } from 'react'

type Props = Omit<TextFieldProps, 'value' | 'onChange'> & {
  value: string
  onCommit: (value: string) => void
  delayMs?: number
}

/**
 * A text field that reports its value after the user pauses typing.
 * Adopts external changes to `value` (e.g. when filters are reset) without
 * overwriting half-typed input such as "40,".
 */
export function DebouncedTextField({ value, onCommit, delayMs = 300, ...props }: Props) {
  const [text, setText] = useState(value)
  const [previousValue, setPreviousValue] = useState(value)

  if (value !== previousValue) {
    setPreviousValue(value)
    setText(value)
  }

  // Latest props, read when the timer fires, so the effect only re-runs on typing.
  const latest = useRef({ value, onCommit })
  useEffect(() => {
    latest.current = { value, onCommit }
  })

  useEffect(() => {
    if (text === latest.current.value) return
    const timer = setTimeout(() => latest.current.onCommit(text), delayMs)
    return () => clearTimeout(timer)
  }, [text, delayMs])

  return <TextField {...props} value={text} onChange={(event) => setText(event.target.value)} />
}
