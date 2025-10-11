"use client";

import * as React from "react";
import { createPortal } from "react-dom";

type DialogContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  titleId: string;
  descriptionId: string;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialog(component: string): DialogContextValue {
  const context = React.useContext(DialogContext);
  if (!context) throw new Error(`${component} must be used within a Dialog`);
  return context;
}

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  const titleId = React.useId();
  const descriptionId = React.useId();
  const value = React.useMemo(
    () => ({ open, setOpen: onOpenChange, titleId, descriptionId }),
    [open, onOpenChange, titleId, descriptionId]
  );
  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>;
};

const DialogContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, ...props }, ref) => {
    const { open, setOpen, titleId, descriptionId } = useDialog("DialogContent");
    const contentRef = React.useRef<HTMLDivElement | null>(null);
    const [mountNode, setMountNode] = React.useState<HTMLElement | null>(null);

    React.useEffect(() => {
      setMountNode(document.body);
    }, []);

    React.useEffect(() => {
      const container = contentRef.current;
      if (!open || !container) return undefined;

      const prevFocus = document.activeElement as HTMLElement | null;
      (getFocusable(container)[0] ?? container).focus({ preventScroll: true });

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.preventDefault();
          setOpen(false);
          return;
        }
        if (event.key !== "Tab") return;
        const items = getFocusable(container);
        if (!items.length) {
          event.preventDefault();
          return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement as HTMLElement | null;
        const outOfBounds = !items.includes(active as HTMLElement);
        if (event.shiftKey) {
          if (active === first || outOfBounds) {
            event.preventDefault();
            last.focus();
          }
        } else if (active === last) {
          event.preventDefault();
          first.focus();
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      const body = document.body;
      const previousOverflow = body.style.overflow;
      body.style.overflow = "hidden";

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        body.style.overflow = previousOverflow;
        prevFocus?.focus({ preventScroll: true });
      };
    }, [open, setOpen]);

    const assignRefs = (node: HTMLDivElement | null) => {
      contentRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
    };

    if (!open || !mountNode) return null;

    return createPortal(
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
      >
        <div
          ref={assignRefs}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg focus:outline-none"
          tabIndex={-1}
          {...props}
        >
          {children}
        </div>
      </div>,
      mountNode
    );
  }
);
DialogContent.displayName = "DialogContent";

const focusSelectors = "a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex='-1'])";

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(focusSelectors)).filter(
    (element) =>
      !element.hasAttribute("disabled") &&
      element.getAttribute("aria-hidden") !== "true" &&
      element.tabIndex !== -1
  );
}

export { Dialog, DialogContent, useDialog };
