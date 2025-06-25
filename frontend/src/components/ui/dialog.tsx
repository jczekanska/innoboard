import React, { createContext, useContext, ReactNode, ReactElement, useState } from "react";
import clsx from "clsx";

interface DialogContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}
const DialogContext = createContext<DialogContextType | null>(null);

export const Dialog: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  );
};

export const DialogTrigger: React.FC<{ asChild?: boolean; children: ReactElement }> = ({
  children,
}) => {
  const ctx = useContext(DialogContext)!;
  return React.cloneElement(children, {
    onClick: () => ctx.setOpen(true),
  });
};

export const DialogContent: React.FC<{ children: ReactNode }> = ({ children }) => {
  const ctx = useContext(DialogContext)!;
  if (!ctx.open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={() => ctx.setOpen(false)}
    >
      <div
        className="bg-white rounded-lg shadow-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export const DialogHeader: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={clsx("mb-4", className)}>{children}</div>
);

export const DialogTitle: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <h2 className={clsx("text-xl font-semibold", className)}>{children}</h2>
);

export const DialogFooter: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={clsx("mt-6 flex justify-end space-x-2", className)}>{children}</div>
);
