interface TableOptions {
  headers: string[];
  rows: string[][];
  columnWidths?: number[];
}

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\u001B[[(?);]{0,2}(;?\d)*./g, "");
}

export default function tableize({
  headers,
  rows,
  columnWidths,
}: TableOptions): string {
  // Use provided column widths or calculate them
  const finalColumnWidths =
    columnWidths ||
    headers.map((header, colIndex) => {
      return Math.max(
        header.length,
        ...rows.map((row) => stripAnsi(row[colIndex]?.toString() || "").length)
      );
    });

  // Format header row
  const headerRow = headers
    .map((header, i) => ` ${header.padEnd(finalColumnWidths[i])} `)
    .join("│");

  // Format data rows with ANSI-aware padding
  const dataRows = rows.map(
    (row) =>
      `│${row
        .map((cell, i) => {
          const content = cell || "";
          const visibleLength = stripAnsi(content.toString()).length;
          const padding = " ".repeat(finalColumnWidths[i] - visibleLength);
          return ` ${content}${padding} `;
        })
        .join("│")}│`
  );

  // Create separator line
  const separator = finalColumnWidths
    .map((width) => "─".repeat(width))
    .join("─┬─");
  const topLine = `┌─${finalColumnWidths.map((w) => "─".repeat(w)).join("─┬─")}─┐`;
  const bottomLine = `└─${finalColumnWidths.map((w) => "─".repeat(w)).join("─┴─")}─┘`;

  // Combine all parts
  return [
    topLine,
    `│${headerRow}│`,
    `├─${separator}─┤`,
    ...dataRows,
    bottomLine,
  ].join("\n");
}
