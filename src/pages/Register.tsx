import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';
import { AuthShell } from '../components/auth-shell';
import { TextField } from '../components/ui/field';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Callout } from '../components/ui/misc';

const BENEFITS = [
  'Gerenciar múltiplos cartões',
  'Controle de parcelas automático',
  'Categorização de gastos',
  'Compartilhamento com familiares',
  'Resumos mensais detalhados',
];

function PasswordHint({ ok, okText, errorText }: { ok: boolean; okText: string; errorText: string }) {
  return ok ? (
    <span className="flex items-center gap-1 text-success">
      <CheckCircle className="w-3 h-3" /> {okText}
    </span>
  ) : (
    <span className="text-danger">{errorText}</span>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validações
    if (!name || !email || !password || !confirmPassword) {
      setError('Preencha todos os campos');
      return;
    }

    if (name.length < 3) {
      setError('Nome deve ter pelo menos 3 caracteres');
      return;
    }

    if (password.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    const result = await register(name, email, password, confirmPassword);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message || 'Erro ao criar conta');
    }
  };

  return (
    <AuthShell
      title="Criar conta"
      subtitle="Comece a gerenciar suas faturas hoje"
      footer={(
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold text-foreground">O que você terá acesso:</h3>
          <ul className="space-y-2">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2 text-sm text-muted">
                <CheckCircle className="w-4 h-4 text-success shrink-0" />
                {benefit}
              </li>
            ))}
          </ul>
        </Card>
      )}
    >
      {error && <Callout tone="danger" icon={AlertCircle}>{error}</Callout>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <TextField
            id="name"
            label="Nome completo"
            leadingIcon={User}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            autoComplete="name"
            disabled={isLoading}
            autoFocus
          />
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
          />
          <TextField
            id="password"
            label="Senha"
            leadingIcon={Lock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            secureToggle
            disabled={isLoading}
            hint={password && <PasswordHint ok={password.length >= 6} okText="Senha válida" errorText="Mínimo 6 caracteres" />}
          />
          <TextField
            id="confirmPassword"
            label="Confirmar senha"
            leadingIcon={Lock}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            secureToggle
            disabled={isLoading}
            hint={confirmPassword && <PasswordHint ok={password === confirmPassword} okText="Senhas coincidem" errorText="As senhas não coincidem" />}
          />
        </div>

        <Button type="submit" label={isLoading ? 'Criando conta...' : 'Criar conta'} loading={isLoading} fullWidth />
      </form>

      <p className="text-center text-sm text-muted">
        Já tem uma conta?{' '}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}
