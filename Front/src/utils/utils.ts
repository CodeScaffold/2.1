interface ResultDataType {
  id: number;
  account: number;
  ticket: number;
  pair: string;
  lot: number;
  openPrice: number;
  tp: number;
  sl: number;
  closePrice: number;
  closeTimeDate?: string;
  reason: string;
  commend: string;
  difference: number;
  compensate: number;
  firstCheck: boolean;
  secondCheck: boolean;
  archivedAt?: string;
  version: string;
  clientId: number;
}
export const exportToCSV = (data: ResultDataType[], filename: string): void => {
  const headers = Object.keys(data[0]);
  const csvRows = data.map((row) =>
    headers
      .map((header) =>
        JSON.stringify(row[header as keyof ResultDataType] ?? "", undefined, 2),
      )
      .join(","),
  );

  const csvData = [headers.join(","), ...csvRows].join("\n");
  const blob = new Blob([csvData], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.setAttribute("hidden", "");
  a.setAttribute("href", url);
  a.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
