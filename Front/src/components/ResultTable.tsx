import { useEffect, useState } from "react";
import { alpha, useTheme } from "@mui/material/styles";
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
  TableRow, Typography,
} from "@mui/material";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import { API_URL } from "./settings.ts";
import { Commends, Reasons } from "./Reason.ts";
import PendingActionsIcon from "@mui/icons-material/PendingActions";

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

export const fetchResults = async (page: number): Promise<ApiResponse> => {
  const token = getToken();
  const response = await fetch(`${API_URL}/result?page=${page}`, {
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return await response.json();
};

export const fetchAllResults = async (): Promise<ApiResponse> => {
  const token = getToken();
  const url = `${API_URL}/result?paginate=false`;
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
  const data = await response.json();
  // Normalize array response into ApiResponse shape
  if (Array.isArray(data)) {
    return { results: data, totalResultsCount: data.length };
  }
  return data;
};

const ResultTable: React.FC = () => {
  const [page, setPage] = useState(1);
  const { data, error, isLoading } = useQuery({
    queryKey: ["results", page],
    queryFn: () => fetchResults(page),
  });
  const { data: allData} = useQuery({
    queryKey: ["allResults"],
    queryFn: fetchAllResults,
  });

  const theme = useTheme();

  const pendingCompensation = allData
    ? allData.results
        .filter((row) => !row.archivedAt) // only include unarchived items
        .reduce((sum, row) => sum + row.compensate, 0)
        .toFixed(2)
    : "0.00";

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
        credentials: 'include',
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
      <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            flexWrap: "wrap",
            gap: 2,
            width: "100%",
          }}
      >
    <>
      <Card
        sx={{
          height: "auto",
          width: {
            xs: "100%", // full width on small
            md: "100%", // full width until md breakpoint
          },
          // At very large viewports (>2560px), shrink to allow three-per-row
          "@media (min-width:2560px)": {
            width: "60%", // three cards side by side
          },
          backgroundColor: alpha(theme.palette.background.default, 0.5),
          borderRadius: 2,
          boxShadow: 1,
          p: 2,
          mt: 5,
          mx: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", m: 2 }}>
          <PendingActionsIcon fontSize="large" sx={{ mr: 1 }}  />
          <Typography variant="h5" color="white" >
              {`Pending Compensation ${pendingCompensation}`}
          </Typography>
        </Box>
        <CardContent>
          <TableContainer >
            <Table
              component="div"
              sx={{ minWidth: 650, borderRadius: 2, overflow: 'hidden' }}
              aria-label="simple table"
              style={{ color: "white" }}
            >
              <TableHead component="div">
                <Box sx={{ display: "flex", alignItems: "center", mb: 2, borderRadius: 2, p: 1.5, backgroundColor: "#494c52" }}>
                  <Box sx={{ flex: 1, color: "#ccc", fontSize: 16 }}>Account</Box>
                  <Box sx={{ flex: 1, color: "#ccc", fontSize: 16 }}>Ticket</Box>
                  <Box sx={{ flex: 1, color: "#ccc", fontSize: 16 }}>Reason</Box>
                  <Box sx={{ flex: 1, color: "#ccc", fontSize: 16 }}>Commend</Box>
                  <Box sx={{ flex: 1, color: "#ccc", fontSize: 16 }}>Version</Box>
                  <Box sx={{ flex: 1, color: "#ccc", fontSize: 16 }}>Compensate</Box>
                  <Box sx={{ flex: 1, color: "#ccc", fontSize: 16 }}>First Check</Box>
                  <Box sx={{ flex: 1, color: "#ccc", fontSize: 16 }}>Second Check</Box>
                </Box>
              </TableHead>
              <TableBody component={Paper}
                         sx={{ borderRadius: 2, overflow: 'hidden' }}>
                {results.map((row: ResultDataType) => (
                  <TableRow
                    component={Paper}
                    key={row.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      m: 1,
                      borderRadius: 2,
                      p: 1,
                      boxShadow: 1,
                      backgroundColor: alpha(theme.palette.background.default, 0.5),
                      transition: "box-shadow 0.2s ease",
                      "&:hover": {
                        boxShadow: 4,
                      },
                    }}
                  >
                    <TableCell
                      component="div"
                      scope="row"
                      sx={{
                        flex: 1,
                        color: "#fff",
                        fontSize: 14,
                        borderBottom: "none",
                        py: 0.5,
                      }}
                    >
                      {row.account}
                    </TableCell>
                    <TableCell
                      component="div"
                      sx={{
                        flex: 1,
                        color: "#fff",
                        fontSize: 14,
                        borderBottom: "none",
                        py: 0.5,
                      }}
                    >
                      {row.ticket}
                    </TableCell>
                    <TableCell
                      component="div"
                      sx={{
                        flex: 1,
                        color: "#fff",
                        fontSize: 14,
                        borderBottom: "none",
                        py: 0.5,
                      }}
                    >
                      {getNameFromValue(row.reason, Reasons)}
                    </TableCell>
                    <TableCell
                      component="div"
                      sx={{
                        flex: 1,
                        color: "#fff",
                        fontSize: 14,
                        borderBottom: "none",
                        py: 0.5,
                      }}
                    >
                      {getNameFromValue(row.commend, Commends)}
                    </TableCell>
                    <TableCell
                      component="div"
                      sx={{
                        flex: 1,
                        color: "#fff",
                        fontSize: 14,
                        borderBottom: "none",
                        py: 0.5,
                      }}
                    >
                      {row.version}
                    </TableCell>
                    {/*<TableCell>{row.difference.toFixed(2)}</TableCell>*/}
                    <TableCell
                      component="div"
                      sx={{
                        flex: 1,
                        color: "#fff",
                        fontSize: 14,
                        borderBottom: "none",
                        py: 0.5,
                      }}
                    >
                      {row.compensate.toFixed(2)}
                    </TableCell>
                    <TableCell
                      component="div"
                      sx={{
                        flex: 1,
                        color: "#fff",
                        fontSize: 14,
                        borderBottom: "none",
                        py: 0.5,
                      }}
                    >
                      <Checkbox
                        checked={row.firstCheck}
                        onChange={() => handleChangeCheck(row.id, "firstCheck")}
                      />
                    </TableCell>
                    <TableCell
                      component="div"
                      sx={{
                        flex: 1,
                        color: "#fff",
                        fontSize: 14,
                        borderBottom: "none",
                        py: 0.5,
                      }}
                    >
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
        <Box sx={{ display: "flex", justifyContent: "flex-end", m: 1 , mt:0 }}>
          <Button
            onClick={handleExportAllToCSV}
            variant="contained"
            color="primary"
            startIcon={<CloudDownloadIcon style={{ fontSize: "1rem" }} />}
            style={{
              margin: "10px",
              padding: "10px 20px",
            }}
          >
            Export
          </Button>
        </Box>
      </Card>
    </>
      </Box>
  );
};
export default ResultTable;
