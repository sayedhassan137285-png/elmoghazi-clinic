"use client";

import { Icon } from "./icons";

export function Modal({
  open, onClose, title, children, wide,
}: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`card relative max-h-[90vh] w-full ${wide ? "max-w-2xl" : "max-w-md"} overflow-y-auto`}>
        <div className="flex items-center justify-between border-b border-line p-4">
          <h3 className="font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-surface-2" aria-label="إغلاق">
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="label">{label}</label>{children}</div>;
}

export function Spinner({ label = "جارٍ التحميل..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-muted">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      <span className="text-sm font-bold">{label}</span>
    </div>
  );
}

export function EmptyState({
  title, subtitle, icon = "database",
}: { title: string; subtitle?: string; icon?: string }) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
        <Icon name={icon} className="h-7 w-7" />
      </div>
      <p className="mt-3 font-bold">{title}</p>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}
