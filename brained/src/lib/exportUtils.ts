import { exportToPDF } from '../utils/pdfExportHelper';

export async function exportElementToPDF(el: HTMLElement, options?: { filename?: string; scale?: number }) {
  const filename = options?.filename || `export-${new Date().toISOString().slice(0,10)}.pdf`;
  const scale = options?.scale ?? 2;

  // Use the enhanced PDF export helper that handles OKLCH colors
  await exportToPDF(el, filename, {
    scale,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#ffffff'
  });
}

export function exportRowsToCSV(
  headers: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>,
  filename?: string
) {
  const safe = (v: string | number | boolean | null | undefined) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    // Quote if contains delimiter, quote or newline
    if (/[",\n]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const csv = [headers, ...rows].map(r => r.map(safe).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename || `export-${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
