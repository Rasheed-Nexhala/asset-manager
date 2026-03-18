import { Icon } from '../shared/Icon';
import { isSafeOpenableUrl } from '../../utils/urlUtils';

export interface PODocumentCardProps {
  fileName: string;
  fileUrl: string;
  type: 'invoice' | 'other';
}

/**
 * Displays a PO document (invoice/bill) with safe link handling.
 * Opens fileUrl in a new tab when clicked; validates http/https only before opening.
 */
export function PODocumentCard({ fileName, fileUrl, type }: PODocumentCardProps) {
  const isSafe = isSafeOpenableUrl(fileUrl);
  const typeLabel = type === 'invoice' ? 'Invoice' : 'Document';

  const content = (
    <>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-800/15">
        <Icon name="document-text" className="h-6 w-6 text-blue-800" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium text-slate-900">
          {fileName}
        </p>
        <p className="mt-0.5 text-[13px] text-slate-500">{typeLabel}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <span className="text-[15px] font-semibold text-blue-800">View</span>
        <Icon name="arrow-top-right-on-square" className="h-[18px] w-[18px] text-blue-800" />
      </div>
    </>
  );

  if (isSafe) {
    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-[10px] border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50 hover:border-slate-300"
        aria-label={`View ${typeLabel}: ${fileName}`}
      >
        {content}
      </a>
    );
  }

  return (
    <div
      className="flex cursor-not-allowed items-center gap-3 rounded-[10px] border border-slate-200 bg-slate-50 p-4 opacity-75"
      aria-label={`${typeLabel}: ${fileName} (link unavailable)`}
      title="This document link cannot be opened for security reasons."
    >
      {content}
    </div>
  );
}
