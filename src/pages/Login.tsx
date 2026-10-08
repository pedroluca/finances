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
  const navigate = useNavigate()
  const { login, isLoading } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Preencha todos os campos')
      return
    }

    const result = await login(email, password)

    if (result.success) {
      navigate('/dashboard')
    } else {
      setError(result.message || 'Erro ao fazer login')
    }
  }

  return (
    <AuthShell
      title="Bem-vindo ao Finances"
      subtitle="Seu dashboard de controle de faturas"
      footer={(
        <p className="text-center text-sm text-muted">
          Desenvolvido por{' '}
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
            label="Email"
            leadingIcon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            autoComplete="email"
            disabled={isLoading}
            autoFocus
          />
          <TextField
            id="password"
            label="Senha"
            leadingIcon={Lock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            secureToggle
            disabled={isLoading}
          />
        </div>

        <Button type="submit" label={isLoading ? 'Entrando...' : 'Entrar'} loading={isLoading} fullWidth />
      </form>

      <p className="text-center text-sm text-muted">
        Não tem uma conta?{' '}
        <Link to="/register" className="font-semibold text-primary hover:underline">
          Criar conta
        </Link>
      </p>
    </AuthShell>
  )
}
