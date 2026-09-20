import React from "react";

export interface TableColumn<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  emptyMessage?: string;
  className?: string;
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  emptyMessage = "Tidak ada data",
  className = "",
}: TableProps<T>) {
  const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    fontFamily: "'Inter', sans-serif",
    fontSize: "14px",
    color: "#E0E2EF",
  };

  const thStyle: React.CSSProperties = {
    padding: "12px 16px",
    textAlign: "left",
    fontWeight: 600,
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#8C909F",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    backgroundColor: "#0B0E17",
  };

  const tdStyle: React.CSSProperties = {
    padding: "14px 16px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
  };

  return (
    <div style={{ width: "100%", overflowX: "auto", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
      <table style={tableStyle} className={`mc-table ${className}`}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} scope="col" style={thStyle}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ ...tdStyle, textAlign: "center", color: "#8C909F", padding: "32px" }}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr key={idx} style={{ transition: "background-color 0.15s ease" }}>
                {columns.map((col) => (
                  <td key={col.key} style={tdStyle}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
