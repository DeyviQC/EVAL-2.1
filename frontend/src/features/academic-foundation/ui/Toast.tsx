import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'danger' | 'info';

export type ToastMessage = {
  id: string;
  type: ToastType;
  title: string;
  description?: string | undefined;
};

type ToastContextType = {
  showToast: (title: string, description?: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (title: string, description?: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback when outside provider
    return {
      showToast: (title: string, description?: string) => {
        console.log('[Toast]', title, description);
      },
    };
  }
  return context;
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    danger: <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-primary shrink-0" />,
  };

  return (
    <div className="pointer-events-auto flex items-start gap-3 p-4 rounded-xl bg-surface border border-border shadow-xl animate-in slide-in-from-bottom-5 duration-200">
      {icons[toast.type]}
      <div className="min-w-0 flex-1">
        <h6 className="text-xs font-semibold text-text">{toast.title}</h6>
        {toast.description && (
          <p className="text-[11px] text-text-muted mt-0.5">{toast.description}</p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
