import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useSearchParams } from 'react-router'
import { ApiError } from '../api/client'
import { useAuth } from './authContext'

/** Only allow returning to a path in this app (no open redirects). */
function safeReturnTo(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Fel användarnamn eller lösenord.'
    if (error.status === 429) return 'För många misslyckade försök. Vänta en minut och försök igen.'
  }
  return 'Kunde inte logga in. Kontrollera anslutningen och försök igen.'
}

export function LoginPage() {
  const { session, endReason, login } = useAuth()
  const [params] = useSearchParams()
  const returnTo = safeReturnTo(params.get('returnTo'))

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [slow, setSlow] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The free hosting tier sleeps; tell the user why the first sign-in can take a while.
  useEffect(() => {
    if (!pending) return
    const timer = setTimeout(() => setSlow(true), 4000)
    return () => {
      clearTimeout(timer)
      setSlow(false)
    }
  }, [pending])

  if (session) {
    return <Navigate to={returnTo} replace />
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      await login(username.trim(), password)
    } catch (e) {
      setError(errorMessage(e))
      setPassword('')
    } finally {
      setPending(false)
    }
  }

  return (
    <Paper
      variant="outlined"
      sx={{ p: { xs: 2, sm: 3 }, maxWidth: 400, mx: 'auto', mt: { sm: 4 } }}
    >
      <Typography variant="h5" component="h1" gutterBottom>
        Logga in
      </Typography>
      <Stack component="form" spacing={2} noValidate onSubmit={submit}>
        {endReason === 'expired' && !error && (
          <Alert severity="info">Din inloggning har gått ut. Logga in igen.</Alert>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Användarnamn"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          autoFocus
          required
        />
        <TextField
          label="Lösenord"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
        <Button
          type="submit"
          variant="contained"
          loading={pending}
          disabled={!username.trim() || !password}
        >
          Logga in
        </Button>
        {slow && (
          <Typography variant="body2" color="text.secondary">
            Servern startar – första inloggningen efter en paus kan ta upp till ett par minuter.
          </Typography>
        )}
      </Stack>
    </Paper>
  )
}
