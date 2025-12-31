import { Toaster as Sonner } from "sonner";

/**
 * Public-specific Toaster with top-center position
 * Avoids overlap with FloatingCartButton which is fixed at bottom
 */
export function PublicToaster() {
  return (
    <Sonner
      position="top-center"
      theme="dark"
      className="toaster group"
      toastOptions={{
        duration: 1500,
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white/10 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-white group-[.toaster]:border-white/10 group-[.toaster]:shadow-2xl",
          description: "group-[.toast]:text-white/70",
          actionButton: "group-[.toast]:bg-emerald-500 group-[.toast]:text-white",
          cancelButton: "group-[.toast]:bg-white/10 group-[.toast]:text-white/70",
        },
      }}
    />
  );
}
