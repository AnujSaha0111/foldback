import { render, screen, within } from "@testing-library/react";
import { DataTable } from "./index";

describe("DataTable", () => {
  it("renders a column header and one row per item", () => {
    render(
      <DataTable
        columns={[{ header: "Name", cell: (row: { name: string }) => row.name }]}
        rows={[{ name: "Alex" }, { name: "Sam" }]}
        rowKey={(row) => row.name}
      />,
    );
    expect(screen.getByRole("columnheader", { name: "Name" })).toHaveAttribute("scope", "col");
    const [, firstRow] = screen.getAllByRole("row");
    expect(within(firstRow as HTMLElement).getByRole("cell")).toHaveTextContent("Alex");
  });
});
