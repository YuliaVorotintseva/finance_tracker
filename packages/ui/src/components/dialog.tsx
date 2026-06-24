import { useEffect, type ReactNode, type HTMLAttributes } from "react";

import { cn } from "../lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export const Dialog = ({ open, onClose, children }: DialogProps) => {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-50 w-full max-w-lg rounded-lg bg-background p-6 shadow-lg",
          "animate-in fade-in zoom-in-95 duration-200",
        )}
      >
        {children}
      </div>
    </div>
  );
};

export const DialogHeader = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mb-4", className)} {...props} />
);

export const DialogTitle = ({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn("text-lg font-semibold", className)} {...props} />
);

export const DialogFooter = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-6 flex justify-end gap-2", className)} {...props} />
);
