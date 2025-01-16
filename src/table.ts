const HORIZONTAL = "════════════════════";
const SINGLE_HORIZONTAL = "═";
const LEFT_CORNER = "╔";
const RIGHT_CORNER = "╗";
const LEFT_VERTICAL = "╠";
const RIGHT_VERTICAL = "╣";
const LEFT_BOTTOM_CORNER = "╚";
const RIGHT_BOTTOM_CORNER = "╝";
const VERTICAL = "║";
const CROSS = "╬";
const TOP_HORIZONTAL = "╦";
const BOTTOM_HORIZONTAL = "╩";

type TableizeInput = {
  headers: string[];
  rows: string[][];
};

const BASE_COLUMN_PADDING = 18;

const stripAnsi = (str: string): string => {
  return str.replace(/\u001B\[[0-9;]*m/g, "");
};

export default function tableize(input: TableizeInput): string {
  const { headers, rows } = input;
  let tableString = LEFT_CORNER;
  const numberOfColumns = headers.length;
  const numberOfRows = rows.length;
  let columnWidth = BASE_COLUMN_PADDING;
  let horizontalLine = HORIZONTAL;

  // Validate row structure
  for (const row of rows) {
    if (row.length !== numberOfColumns) {
      throw new Error(
        "Each row must have the same number of columns as headers"
      );
    }
  }

  // Calculate maximum column width
  const allContent = [headers, ...rows];
  for (const row of allContent) {
    for (const cell of row) {
      columnWidth = Math.max(columnWidth, stripAnsi(cell).length);
    }
  }

  // Adjust horizontal line based on column width
  if (columnWidth > BASE_COLUMN_PADDING) {
    horizontalLine = horizontalLine.padEnd(columnWidth + 2, SINGLE_HORIZONTAL);
  }

  // Create middle row border
  const createMiddleRowBorder = (): void => {
    for (let i = 0; i < numberOfColumns; i++) {
      if (numberOfColumns === 1) {
        tableString = `${tableString}${LEFT_VERTICAL}${horizontalLine}${RIGHT_VERTICAL}\n`;
      } else if (i === 0) {
        tableString = `${tableString}${LEFT_VERTICAL}${horizontalLine}`;
      } else if (i + 1 === numberOfColumns) {
        tableString = `${tableString}${CROSS}${horizontalLine}${RIGHT_VERTICAL}\n`;
      } else {
        tableString = `${tableString}${CROSS}${horizontalLine}`;
      }
    }
  };

  // 1. Create top border
  for (let i = 0; i < numberOfColumns; i++) {
    if (numberOfColumns === 1) {
      tableString = `${tableString}${horizontalLine}${RIGHT_CORNER}\n`;
    } else if (i === 0) {
      tableString = `${tableString}${horizontalLine}${TOP_HORIZONTAL}`;
    } else if (i + 1 === numberOfColumns) {
      tableString = `${tableString}${horizontalLine}${RIGHT_CORNER}\n`;
    } else {
      tableString = `${tableString}${horizontalLine}${TOP_HORIZONTAL}`;
    }
  }

  // 2. Create header row
  for (let i = 0; i < numberOfColumns; i++) {
    const header = headers[i]?.padEnd(columnWidth) ?? "".padEnd(columnWidth);
    if (numberOfColumns === 1) {
      tableString = `${tableString}${VERTICAL} ${header} ${VERTICAL}\n`;
    } else if (i + 1 === numberOfColumns) {
      tableString = `${tableString}${VERTICAL} ${header} ${VERTICAL}\n`;
    } else {
      tableString = `${tableString}${VERTICAL} ${header} `;
    }
  }

  // 3. Create border beneath header
  createMiddleRowBorder();

  // 4. Create data rows
  for (const [rowIndex, row] of rows.entries()) {
    // Create row content
    for (const [colIndex, cell] of row.entries()) {
      const content = cell.padEnd(columnWidth);
      if (numberOfColumns === 1) {
        tableString = `${tableString}${VERTICAL} ${content} ${VERTICAL}\n`;
      } else if (colIndex + 1 === numberOfColumns) {
        tableString = `${tableString}${VERTICAL} ${content} ${VERTICAL}\n`;
      } else {
        tableString = `${tableString}${VERTICAL} ${content} `;
      }
    }

    // Add border after row (except last row)
    if (rowIndex < numberOfRows - 1) {
      createMiddleRowBorder();
    }
  }

  // 5. Create bottom border
  for (let i = 0; i < numberOfColumns; i++) {
    if (numberOfColumns === 1) {
      tableString = `${tableString}${LEFT_BOTTOM_CORNER}${horizontalLine}${RIGHT_BOTTOM_CORNER}\n`;
    } else if (i === 0) {
      tableString = `${tableString}${LEFT_BOTTOM_CORNER}${horizontalLine}`;
    } else if (i + 1 === numberOfColumns) {
      tableString = `${tableString}${BOTTOM_HORIZONTAL}${horizontalLine}${RIGHT_BOTTOM_CORNER}\n`;
    } else {
      tableString = `${tableString}${BOTTOM_HORIZONTAL}${horizontalLine}`;
    }
  }

  return tableString;
}
