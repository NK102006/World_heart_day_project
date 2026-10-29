/**
 * Utility to export tabular data to a downloadable CSV file.
 * Includes UTF-8 BOM (\uFEFF) so Excel and Google Sheets render special characters,
 * accented characters, and Unicode correctly without formatting errors.
 */
export const exportToCSV = (filename, headers, rows) => {
  if (!rows || rows.length === 0) return false;

  const escapeCell = (val) => {
    if (val === null || val === undefined) return '""';
    // Normalize any CRLF inside cells to standard LF (\n) so multiline cell entries render on new lines
    const str = String(val).replace(/\r\n|\r/g, '\n');
    return `"${str.replace(/"/g, '""')}"`;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map((row) => row.map(escapeCell).join(','));
  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n') + '\r\n';

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
};
