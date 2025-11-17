import { toast } from "vue-sonner";

export interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useToast() {
  const showSuccess = (message: string, options?: ToastOptions) => {
    toast.success(message, {
      description: options?.description,
      duration: options?.duration || 4000,
      action: options?.action,
    });
  };

  const showError = (message: string, options?: ToastOptions) => {
    toast.error(message, {
      description: options?.description,
      duration: options?.duration || 5000,
      action: options?.action,
    });
  };

  const showWarning = (message: string, options?: ToastOptions) => {
    toast.warning(message, {
      description: options?.description,
      duration: options?.duration || 4000,
      action: options?.action,
    });
  };

  const showInfo = (message: string, options?: ToastOptions) => {
    toast.info(message, {
      description: options?.description,
      duration: options?.duration || 4000,
      action: options?.action,
    });
  };

  const showLoading = (message: string, options?: ToastOptions) => {
    return toast.loading(message, {
      description: options?.description,
      duration: options?.duration || Infinity,
    });
  };

  const dismiss = (toastId?: string | number) => {
    toast.dismiss(toastId);
  };

  const dismissAll = () => {
    toast.dismiss();
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    dismiss,
    dismissAll,
  };
}

export type FlashToast = {
  kind: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number; // ms
};

const FLASH_TOAST_KEY = 'app:flashToast';

export function setFlashToast(toast: FlashToast) {
  try {
    sessionStorage.setItem(FLASH_TOAST_KEY, JSON.stringify(toast));
  } catch {
    // no-op
  }
}

export function consumeFlashToast(): FlashToast | null {
  try {
    const raw = sessionStorage.getItem(FLASH_TOAST_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(FLASH_TOAST_KEY);
    return JSON.parse(raw) as FlashToast;
  } catch {
    return null;
  }
}
