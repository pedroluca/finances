import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import { Mail, Lock, AlertCircle } from 'lucide-react'
import { AuthShell } from '../components/auth-shell'
import { TextField } from '../components/ui/field'
import { Button } from '../components/ui/button'
import { Callout } from '../components/ui/misc'

export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login, isLoading } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError(t('auth.fillAllFields'))
      return
    }

    const result = await login(email, password)

    if (result.success) {
      navigate('/dashboard')
    } else {
      setError(result.message || t('auth.loginError'))
    }
  }

  return (
    <AuthShell
      title={t('auth.loginTitle')}
      subtitle={t('auth.loginSubtitle')}
      footer={(
        <p className="text-center text-sm text-muted">
          {t('auth.developedBy')}{' '}
          <a href="https://pedroluca.dev.br" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
            Pedro Luca Prates
          </a>
        </p>
      )}
    >
      {error && <Callout tone="danger" icon={AlertCircle}>{error}</Callout>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <TextField
            id="email"
            type="email"
            label={t('auth.email')}
            leadingIcon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.emailPlaceholder')}
            autoComplete="email"
            disabled={isLoading}
            autoFocus
          />
          <TextField
            id="password"
            label={t('auth.password')}
            leadingIcon={Lock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            secureToggle
            disabled={isLoading}
          />
        </div>

        <Button type="submit" label={isLoading ? t('auth.signingIn') : t('auth.signIn')} loading={isLoading} fullWidth />
      </form>

      <p className="text-center text-sm text-muted">
        {t('auth.noAccount')}{' '}
        <Link to="/register" className="font-semibold text-primary hover:underline">
          {t('auth.createAccount')}
        </Link>
      </p>
    </AuthShell>
  )
}
