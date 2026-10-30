import type { ReactNode } from "react";
import { Frame, Table } from "./styled";

interface Column<Row> {
  header: string;
  cell: (row: Row) => ReactNode;
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
              <th key={column.header} scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td key={column.header}>{column.cell(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </Frame>
  );
}
