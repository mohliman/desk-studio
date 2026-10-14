import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, Plus, Search, X } from "lucide-react";
import { cloneElement, isValidElement, useEffect, useId, useRef } from "react";
import type { ReactElement, ReactNode } from "react";
import { Link, useBlocker } from "react-router-dom";
export function Badge({ status }: { status: string }) {
  return (
    <span
      className={`badge badge-${status.toLowerCase().replaceAll(" ", "-")}`}
    >
      <span />
      {status}
    </span>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="subtitle">{description}</p>
      </div>
      {action}
    </header>
  );
}
export function AddButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="button primary" onClick={onClick}>
      <Plus size={16} />
      {children}
    </button>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-mark">✳</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function SearchBox({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="search-box">
      <Search size={17} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button aria-label="Clear search" onClick={() => onChange("")}>
          <X size={15} />
        </button>
      )}
    </div>
  );
}
export function SectionTitle({
  title,
  count,
  link,
  label = "View all",
}: {
  title: string;
  count?: number;
  link?: string;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <div className="section-title">
      <h2>
        {title}
        {count !== undefined && <span className="count">{count}</span>}
      </h2>
      {link && (
        <Link className="text-link" to={link}>
          {label}
          <ArrowUpRight size={15} />
        </Link>
      )}
    </div>
  );
}
export function Modal({
  title,
  description,
  children,
  onClose,
  dirty = false,
  wide = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  onClose: () => void;
  dirty?: boolean;
  wide?: boolean;
}) {
  const opener = useRef(document.activeElement as HTMLElement | null);
  const blocker = useBlocker(
    ({ historyAction }) => dirty && historyAction === "POP",
  );
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (window.confirm("Discard your unsaved changes and leave this page?"))
      blocker.proceed();
    else blocker.reset();
  }, [blocker]);
  const close = () => {
    if (!dirty || window.confirm("Discard your unsaved changes?")) onClose();
  };
  useEffect(() => {
    if (!dirty) return;
    const handle = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handle);
    return () => window.removeEventListener("beforeunload", handle);
  }, [dirty]);
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          className={`modal ${wide ? "modal-wide" : ""}`}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            const input = document.querySelector<HTMLElement>(
              ".modal input, .modal select, .modal textarea",
            );
            input?.focus({ preventScroll: true });
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            opener.current?.focus({ preventScroll: true });
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            close();
          }}
        >
          <div className="modal-heading">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>{description}</Dialog.Description>
            </div>
            <button
              className="icon-button"
              aria-label="Close dialog"
              onClick={close}
            >
              <X size={20} />
            </button>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  hint?: string;
}) {
  const fieldId = useId();
  const description = [
    hint ? `${fieldId}-hint` : "",
    error ? `${fieldId}-error` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id: fieldId,
        "aria-describedby": description || undefined,
      })
    : children;
  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      {control}
      {hint && (
        <p id={`${fieldId}-hint`} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${fieldId}-error`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
export function FormError({ errors }: { errors: Record<string, string> }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (Object.keys(errors).length) ref.current?.focus();
  }, [errors]);
  return Object.keys(errors).length ? (
    <div className="form-error" role="alert" tabIndex={-1} ref={ref}>
      Please check the highlighted fields. {Object.values(errors)[0]}
    </div>
  ) : null;
}
export function FormActions({
  disabled = false,
  onCancel,
  label = "Save changes",
}: {
  onCancel: () => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <div className="form-actions">
      <button className="button" type="button" onClick={onCancel}>
        Cancel
      </button>
      <button className="button primary" type="submit" disabled={disabled}>
        {label}
      </button>
    </div>
  );
}
