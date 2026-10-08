import { useState } from 'react';
import { CircleAlert, type LucideIcon } from 'lucide-react';
import { Dialog } from './ui/sheet';
import { Button } from './ui/button';
import { cn } from '../lib/cn';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Se devolver uma Promise, o diálogo fica aberto com loading até ela terminar */
  onConfirm: () => void | Promise<unknown>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  icon?: LucideIcon;
}

/** Confirmação no visual dos diálogos do app: ícone no círculo, texto centralizado e dois botões */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDestructive = false,
  icon: Icon = CircleAlert,
}: ConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  const close = () => {
    if (!loading) onClose();
  };

  const handleConfirm = async () => {
    const result = onConfirm();
    if (result instanceof Promise) {
      setLoading(true);
      await result.catch(() => {});
      setLoading(false);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={close}>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className={cn('w-16 h-16 rounded-full flex items-center justify-center', isDestructive ? 'bg-danger/12 text-danger' : 'bg-warning/12 text-warning')}>
          <Icon size={28} strokeWidth={2.2} />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-xl font-semibold text-foreground">{title}</h3>
          <p className="text-[15px] leading-[22px] text-muted whitespace-pre-wrap">{message}</p>
        </div>

        <div className="flex gap-3 self-stretch mt-1">
          <Button label={cancelText} variant="secondary" onClick={close} disabled={loading} className="flex-1" />
          <Button
            label={confirmText}
            variant={isDestructive ? 'danger' : 'primary'}
            onClick={handleConfirm}
            loading={loading}
            className="flex-1"
          />
        </div>
      </div>
    </Dialog>
  );
}
