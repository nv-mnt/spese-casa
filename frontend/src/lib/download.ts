/** Salva un Blob come file, lato browser. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** "Ottobre 2025" -> "spese-ottobre-2025.csv" */
export function csvFilename(periodName: string): string {
  const slug = periodName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `spese-${slug || 'mese'}.csv`;
}

/** "Ottobre 2026" -> "budget-personale-ottobre-2026.csv" */
export function personalCsvFilename(etichetta: string): string {
  const slug = etichetta
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `budget-personale-${slug || 'mese'}.csv`;
}
