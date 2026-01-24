import { toast } from 'sonner';

export const successToast = (message: string, description?: string) => {
  toast.success(message, {
    description,
    duration: 3000,
  });
};

export const errorToast = (message: string, description?: string) => {
  toast.error(message, {
    description,
    duration: 5000,
  });
};

export const loadingToast = (message: string) => {
  return toast.loading(message, {
    duration: Infinity
  });
};

export const dismissToast = (toastId: string | number) => {
  toast.dismiss(toastId);
};

export const promiseToast = <T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  }
) => {
  return toast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
  });
};
