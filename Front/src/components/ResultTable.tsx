import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import { exportToCSV } from "../utils/utils";
import {
  Button,
  Checkbox,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import { API_URL } from "./settings.ts";
import { Commends, Reasons } from "./Reason.ts";

function getNameFromValue(value: string, Array: any[]) {
  const item = Array.find((reason: { value: string; }) => reason.value === value);
  return item ? item.name : "Unknown Reason";
}

interface ResultDataType {
  id: number;
  clientId: number;
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
  version: string;
  difference: number;
  compensate: number;
  firstCheck: boolean;
  secondCheck: boolean;
  archivedAt?: string;
}

interface ApiResponse {
  results: ResultDataType[];
  totalResultsCount: number;
}

const getToken = () => {
  return localStorage.getItem("token");
};

const fetchResults = async (page: number): Promise<ApiResponse> => {
  const token = getToken();
  const response = await fetch(`${API_URL}/result?page=${page}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return await response.json();
};

const fetchAllResults = async (): Promise<ApiResponse> => {
  const token = getToken();
  const url = `${API_URL}/result?paginate=false`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
  return await response.json();
};

const ResultTable: React.FC = () => {
  const [page, setPage] = useState(1);
  const { data, error, isLoading } = useQuery({
    queryKey: ["results", page],
    queryFn: () => fetchResults(page),
  });

  const [results, setResults] = useState<ResultDataType[]>([]);
  const [totalResultsCount, setTotalResultsCount] = useState(0);

  useEffect(() => {
    if (data?.results) {
      setResults(data.results);
      setTotalResultsCount(data.totalResultsCount);
    }
  }, [data]);

  const handleExportAllToCSV = async () => {
    try {
      const allData = await fetchAllResults();

      // Map each result to replace the 'reason' value with its corresponding 'name'
      const updatedResults = allData.results.map((result) => {
        const foundReason = Reasons.find(
          (reason) => reason.value === result.reason,
        );
        const foundCommend = Commends.find(
          (commend) => commend.value === result.commend,
        );
        return {
          ...result,
          reason: foundReason ? foundReason.name : "Unknown Reason",
          commend: foundCommend ? foundCommend.name : "Unknown Commend",
        };
      });

      exportToCSV(updatedResults, "AllResults");
    } catch (error) {
      console.error("Failed to fetch all results for export:", error);
    }
  };
  const handleChangeCheck = async (id: number, field: keyof ResultDataType) => {
    const tempResults = results.map((item) => {
      if (item.id === id) {
        return { ...item, [field]: !item[field] as boolean };
      }
      return item;
    });

    const item = tempResults.find((item) => item.id === id);
    try {
      const response = await fetch(`${API_URL}/result/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [field]: item?.[field],
        }),
      });

      if (!response.ok) {
        throw new Error(
            `Failed to update the item, server responded with status: ${response.status}`,
        );
      }

      if (item?.firstCheck && item.secondCheck) {
        setResults(results.filter((item) => item.id !== id));
      } else {
        setResults(tempResults);
      }

      console.log("Update successful:", await response.json());
    } catch (error) {
      console.error("Error updating item:", error);
      setResults(results);
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <p>An error has occurred: {error.message}</p>;
  if (results.length === 0) return <p>No data found.</p>;

  return (
    <>
      <Card raised sx={{ margin: 2 }}>
        <CardContent>
          <TableContainer component={Paper}>
            <Table
              sx={{ minWidth: 650 }}
              aria-label="simple table"
              style={{ color: "white" }}
            >
              <TableHead>
                <TableRow>
                  <TableCell>Account</TableCell>
                  <TableCell>Ticket</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>commend</TableCell>
                  <TableCell>Version</TableCell>
                  <TableCell>Compensate</TableCell>
                  <TableCell>First Check</TableCell>
                  <TableCell>Second Check</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((row: ResultDataType) => (
                  <TableRow
                    key={row.id}
                    sx={{
                      "&:last-child td, &:last-child th": { border: 0 },
                      "&:hover": {
                        backgroundColor: "rgba(255, 255, 255, 0.08)",
                      },
                    }}
                  >
                    <TableCell component="th" scope="row">
                      {row.account}
                    </TableCell>
                    <TableCell>{row.ticket}</TableCell>
                    <TableCell>
                      {getNameFromValue(row.reason, Reasons)}
                    </TableCell>
                    <TableCell>
                      {getNameFromValue(row.commend, Commends)}
                    </TableCell>
                    <TableCell>{row.version}</TableCell>
                    {/*<TableCell>{row.difference.toFixed(2)}</TableCell>*/}
                    <TableCell>{row.compensate.toFixed(2)}</TableCell>
                    <TableCell>
                      <Checkbox
                        checked={row.firstCheck}
                        onChange={() => handleChangeCheck(row.id, "firstCheck")}
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        disabled={!row.firstCheck}
                        checked={row.secondCheck}
                        onChange={() =>
                          handleChangeCheck(row.id, "secondCheck")
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <div style={{ marginTop: "20px" }}>
            <Button
              color="primary"
              onClick={() => setPage((old) => Math.max(old - 1, 1))}
              disabled={page === 1}
              style={{ marginRight: 8 }}
            >
              Previous
            </Button>
            <Button
              color="primary"
              onClick={() =>
                setPage((old) =>
                  Math.min(old + 1, Math.ceil(totalResultsCount / 10)),
                )
              }
              disabled={page === Math.ceil(totalResultsCount / 10)}
            >
              Next
            </Button>
          </div>
        </CardContent>
        <Button
          onClick={handleExportAllToCSV}
          variant="contained"
          color="primary"
          startIcon={<CloudDownloadIcon style={{ fontSize: "1.25rem" }} />}
          style={{
            margin: "10px",
            padding: "10px 20px",
          }}
        >
          CSV
        </Button>
      </Card>
    </>
  );
};
export default ResultTable;
