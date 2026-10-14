import { useTranslation } from 'react-i18next';
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

const BENEFITS = ['cards', 'installments', 'categories', 'sharing', 'summaries'] as const;

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
  const { t } = useTranslation();
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
      setError(t('auth.fillAllFields'));
      return;
    }

    if (name.length < 3) {
      setError(t('auth.nameTooShort'));
      return;
    }

    if (password.length < 6) {
      setError(t('auth.passwordTooShort'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.passwordsDontMatch'));
      return;
    }

    const result = await register(name, email, password, confirmPassword);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message || t('auth.registerError'));
    }
  };

  return (
    <AuthShell
      title={t('auth.createAccount')}
      subtitle={t('auth.registerSubtitle')}
      footer={(
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold text-foreground">{t('auth.benefitsTitle')}</h3>
          <ul className="space-y-2">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2 text-sm text-muted">
                <CheckCircle className="w-4 h-4 text-success shrink-0" />
                {t(`auth.benefits.${benefit}`)}
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
            label={t('auth.fullName')}
            leadingIcon={User}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('auth.namePlaceholder')}
            autoComplete="name"
            disabled={isLoading}
            autoFocus
          />
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
          />
          <TextField
            id="password"
            label={t('auth.password')}
            leadingIcon={Lock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            secureToggle
            disabled={isLoading}
            hint={password && <PasswordHint ok={password.length >= 6} okText={t('auth.passwordValid')} errorText={t('auth.passwordMin')} />}
          />
          <TextField
            id="confirmPassword"
            label={t('auth.confirmPassword')}
            leadingIcon={Lock}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            secureToggle
            disabled={isLoading}
            hint={confirmPassword && <PasswordHint ok={password === confirmPassword} okText={t('auth.passwordsMatch')} errorText={t('auth.passwordsDontMatch')} />}
          />
        </div>

        <Button type="submit" label={isLoading ? t('auth.creatingAccount') : t('auth.createAccount')} loading={isLoading} fullWidth />
      </form>

      <p className="text-center text-sm text-muted">
        {t('auth.haveAccount')}{' '}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          {t('auth.signIn')}
        </Link>
      </p>
    </AuthShell>
  );
}
