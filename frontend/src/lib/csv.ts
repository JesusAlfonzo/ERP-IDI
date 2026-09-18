export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
): void {
  const escapeCell = (value: string | number | null | undefined) =>
    `"${String(value ?? "").replaceAll('"', '""')}"`;
  const content = [headers, ...rows]
    .map((row) => row.map(escapeCell).join(","))
    .join("\r\n");
  const blob = new Blob([`\uFEFF${content}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
