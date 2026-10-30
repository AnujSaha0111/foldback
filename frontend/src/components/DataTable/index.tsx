import type { ReactNode } from "react";
import { Frame, Table } from "./styled";

interface Column<Row> {
  header: string;
  cell: (row: Row) => ReactNode;
  /** Figures read best right-aligned. */
  align?: "right";
  /** The header is still announced, but not shown (for a column of arrows, say). */
  hideHeader?: boolean;
}

interface DataTableProps<Row> {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
}

export function DataTable<Row>({ columns, rows, rowKey }: DataTableProps<Row>) {
  return (
    <Frame>
      <Table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.header} scope="col" data-align={column.align}>
                {column.hideHeader ? <span className="sr-only">{column.header}</span> : column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td key={column.header} data-align={column.align}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </Frame>
  );
}
