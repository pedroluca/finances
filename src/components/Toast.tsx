import { useState, createContext, useContext, useRef, useCallback, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import { cn } from '../lib/cn';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info };
const ICON_COLORS = { success: 'text-success', error: 'text-danger', info: 'text-info' };

/** Aviso no topo da tela, no visual do app (cartão claro com o ícone colorido) */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message, type });
    timer.current = setTimeout(() => setToast(null), type === 'error' ? 4000 : 2800);
  }, []);

  const Icon = toast ? ICONS[toast.type] : Info;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className="fixed inset-x-0 top-0 z-[80] flex justify-center px-4 pt-[calc(env(safe-area-inset-top)+12px)] pointer-events-none">
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            onClick={() => setToast(null)}
            className="pointer-events-auto flex items-center gap-2.5 max-w-md bg-surface border border-border rounded-2xl px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.14)] animate-toast-in cursor-pointer"
          >
            <Icon size={18} className={cn('shrink-0', ICON_COLORS[toast.type])} />
            <p className="text-sm font-medium text-foreground">{toast.message}</p>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
