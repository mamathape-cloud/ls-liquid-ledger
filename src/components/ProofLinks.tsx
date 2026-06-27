interface ProofFile {
  originalName: string;
  storedPath: string;
  mimeType?: string;
}

export function ProofLinks({ files }: { files?: ProofFile[] | unknown }) {
  const list = Array.isArray(files) ? (files as ProofFile[]) : [];
  if (!list.length) return <span className="text-slate-400">-</span>;

  return (
    <div className="flex flex-col gap-1">
      {list.map((file) => (
        <a
          key={file.storedPath}
          href={`/api/uploads/${file.storedPath}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[var(--primary)] underline hover:text-[var(--primary-hover)]"
          onClick={(e) => e.stopPropagation()}
        >
          {file.originalName}
        </a>
      ))}
    </div>
  );
}
