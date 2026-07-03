interface ProofFile {
  originalName: string;
  storedPath: string;
  mimeType?: string;
}

function truncateName(name: string, maxLength: number) {
  if (name.length <= maxLength) return name;
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  const base = name.slice(0, name.length - ext.length);
  const keep = Math.max(1, maxLength - ext.length - 1);
  return `${base.slice(0, keep)}…${ext}`;
}

export function ProofLinks({
  files,
  truncateAt,
}: {
  files?: ProofFile[] | unknown;
  truncateAt?: number;
}) {
  const list = Array.isArray(files) ? (files as ProofFile[]) : [];
  if (!list.length) return <span className="text-slate-400">-</span>;

  return (
    <div className="flex flex-col gap-1">
      {list.map((file) => {
        const label =
          truncateAt && file.originalName.length > truncateAt
            ? truncateName(file.originalName, truncateAt)
            : file.originalName;

        return (
          <a
            key={file.storedPath}
            href={`/api/uploads/${file.storedPath}`}
            target="_blank"
            rel="noopener noreferrer"
            title={file.originalName}
            className="text-sm text-[var(--primary)] underline hover:text-[var(--primary-hover)]"
            onClick={(e) => e.stopPropagation()}
          >
            {label}
          </a>
        );
      })}
    </div>
  );
}
