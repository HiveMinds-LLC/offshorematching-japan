type ImagePlaceholderProps = {
  label: string;
  hint?: string;
};

export function ImagePlaceholder({ label, hint }: ImagePlaceholderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-100/80 p-6">
      <div className="aspect-video rounded-xl border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200" />
      <div className="mt-3">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </div>
    </div>
  );
}
