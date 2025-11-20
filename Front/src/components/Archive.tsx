import React, { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import "../App.css";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  Card,
  CardContent,
  Skeleton,
  MenuItem,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { Reasons } from "./Reason";
import { exportToCSV } from "../utils/utils";
import moment from "moment";
import IconButton from "@mui/material/IconButton";
import UnarchiveIcon from "@mui/icons-material/Unarchive";
import { useSnackbar } from "notistack";
import axios from "axios";
import { API_URL } from "./settings";
import DateRangePickerComponent from "./common/DatePicker";
import { ResultDataType } from "../utils/types";
import Box from "@mui/material/Box";

interface ApiResponse {
  results: ResultDataType[];
  totalResultsCount: number;
}

interface FetchFilters {
  page?: number;
  includeArchived: boolean;
  paginate?: boolean;
  [key: string]: any;
}

const getToken = (): string | null => {
  return localStorage.getItem("token");
};
const fetchAllFilteredResults = async (
  filters: FetchFilters,
): Promise<ApiResponse> => {
  const token = getToken();
  const exportFilters: FetchFilters = { ...filters, paginate: false };
  const queryParams = new URLSearchParams(exportFilters as any).toString();
  const response = await fetch(`${API_URL}/result?${queryParams}`, {
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const raw = await response.json();
  // Normalize array or object response into ApiResponse shape
  if (Array.isArray(raw)) {
    return { results: raw, totalResultsCount: raw.length };
  }
  return raw as ApiResponse;
};

const Archive: React.FC = () => {
  const [filters, setFilters] = useState<FetchFilters>({
    page: 1,
    includeArchived: true,
  });
  const [totalCompensation, setTotalCompensation] = useState<number>(0);
  const [results, setResults] = useState<ResultDataType[]>([]);
  const [, setTotalResultsCount] = useState<number>(0);

  // Use the useSnackbar hook to get enqueueSnackbar
  const { enqueueSnackbar } = useSnackbar();

  const theme = useTheme();

  const { data, error, isLoading } = useQuery<ApiResponse, Error>({
    queryKey: ["filteredResults", filters],
    queryFn: () => fetchAllFilteredResults(filters),
  });

  useEffect(() => {
    if (data?.results) {
      const total = data.results.reduce(
        (acc, curr) => acc + (curr.compensate || 0),
        0,
      );
      setTotalCompensation(total);
      setResults(data.results);
      setTotalResultsCount(data.totalResultsCount);
    }
  }, [data]);

  const handleExportToCSV = async () => {
    try {
      const allData = await fetchAllFilteredResults(filters);
      const updatedResults = allData.results.map((result) => {
        const foundReason = Reasons.find(
          (reason: { value: string; name: string }) =>
            reason.value === result.reason,
        );
        return {
          ...result,
          reason: foundReason ? foundReason.name : "Unknown Reason",
        };
      });

      if (updatedResults.length === 0) {
        enqueueSnackbar(
          "No data available to export. Downloading an empty CSV.",
          { variant: "warning" },
        );
      }
      exportToCSV(updatedResults, "FilteredResults");
    } catch (error: any) {
      enqueueSnackbar("Error exporting CSV: " + error.message, {
        variant: "error",
      });
      // Fallback: Export an empty CSV to avoid the error.
      exportToCSV([], "FilteredResults");
    }
  };

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value, page: 1 }));
  };

  const handleDateChange = (
    newStartDate: moment.MomentInput,
    newEndDate: moment.MomentInput,
  ) => {
    const formattedStartDate = newStartDate
      ? moment(newStartDate).format("YYYY/MM/DD")
      : "";
    const formattedEndDate = newEndDate
      ? moment(newEndDate).format("YYYY/MM/DD")
      : "";
    setFilters((prev) => ({
      ...prev,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      page: 1,
    }));
  };

  const { mutate } = useMutation<void, unknown, number>({
    mutationFn: async (id: number) => {
      const token = getToken();
      await axios.patch(
          `${API_URL}/result/${id}`,
          { secondCheck: false }, // unarchive
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            withCredentials: true,
          }
      );
    },
    onError: () => {
      enqueueSnackbar("There was an error updating the ticket", { variant: "error" });
    },
  });

  const handleUnArchive = (id: number) => () => {
    mutate(id, {
      onSuccess: () => {
        setResults((prevResults) =>
          prevResults.filter((item) => item.id !== id),
        );
        enqueueSnackbar("UnArchive was successful", { variant: "success" });
      },
    });
  };

  if (error) return <p>An error has occurred: {error.message}</p>;

  return (
    <Card
      raised
      sx={{
        margin: 2,
        marginTop: 5,
        backgroundColor: alpha(theme.palette.background.default, 0.5),
      }}
    >
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "flex", m: 1 , mt:0   }}>
        <Typography variant="h6" gutterBottom>
          Total Compensation: {totalCompensation.toFixed(2)} USD

            <Button
                onClick={handleExportToCSV}
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
        </Typography>
        </Box>

        <TableContainer component={Paper}>

          <Table sx={{ minWidth: 650 }} aria-label="simple table">

            <TableHead>

              <TableRow>
                <TableCell>Client ID</TableCell>
                <TableCell>Account</TableCell>
                <TableCell>Ticket</TableCell>
                <TableCell>Pair</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Compensate</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <TextField
                    size="small"
                    variant="outlined"
                    name="clientId"
                    value={filters.clientId || ""}
                    onChange={handleFilterChange}
                    placeholder="Id"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    variant="outlined"
                    name="account"
                    value={filters.account || ""}
                    onChange={handleFilterChange}
                    placeholder="Account"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    variant="outlined"
                    name="ticket"
                    value={filters.ticket || ""}
                    onChange={handleFilterChange}
                    placeholder="Ticket"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    variant="outlined"
                    name="pair"
                    value={filters.pair || ""}
                    onChange={handleFilterChange}
                    placeholder="Pair"
                  />
                </TableCell>
                <TableCell>
                  <DateRangePickerComponent onDateChange={handleDateChange} />
                </TableCell>
                <TableCell>
                  <TextField
                    select
                    size="small"
                    variant="outlined"
                    name="reason"
                    value={filters.reason || ""}
                    onChange={handleFilterChange}
                    label="Reason"
                    fullWidth
                  >
                    <MenuItem value="" disabled>
                      Choose a reason
                    </MenuItem>
                    {Reasons.map((reason: { value: string; name: string }) => (
                      <MenuItem key={reason.name} value={reason.value}>
                        {reason.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ pt: 1 }}>
                    Total: {totalCompensation.toFixed(2)} $
                  </Typography>
                </TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from(new Array(5)).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Skeleton variant="text" width="100%" />
                    </TableCell>
                    <TableCell>
                      <Skeleton variant="text" width="100%" />
                    </TableCell>
                    <TableCell>
                      <Skeleton variant="text" width="100%" />
                    </TableCell>
                    <TableCell>
                      <Skeleton variant="text" width="100%" />
                    </TableCell>
                    <TableCell>
                      <Skeleton variant="text" width="60%" />
                    </TableCell>
                  </TableRow>
                ))
              ) : results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No Result Found
                  </TableCell>
                </TableRow>
              ) : (
                results.map((row: ResultDataType) => (
                  <TableRow
                    key={row.id}
                    sx={{
                      "&:last-child td, &:last-child th": { border: 0 },
                      "&:hover": {
                        backgroundColor: "rgba(255, 255, 255, 0.08)",
                      },
                    }}
                  >
                    <TableCell>{row.clientId}</TableCell>
                    <TableCell component="th" scope="row">
                      {row.account}
                    </TableCell>
                    <TableCell>{row.ticket}</TableCell>
                    <TableCell>{row.pair}</TableCell>
                    <TableCell>
                      {row.closeTimeDate
                        ? moment(row.closeTimeDate).format("YYYY/MM/DD")
                        : "No Date Available"}
                    </TableCell>
                    <TableCell>
                      {getNameFromValue(row.reason, Reasons)}
                    </TableCell>
                    <TableCell>{`${row.compensate.toFixed(2)} USD`}</TableCell>
                    <TableCell>
                      <IconButton
                        onClick={handleUnArchive(row.id)}
                        aria-label="unarchive"
                      >
                        <UnarchiveIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <div
          style={{
            marginTop: "20px",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Button
            onClick={() =>
              setFilters((old) => ({
                ...old,
                page: Math.max((old.page || 1) - 1, 1),
              }))
            }
            disabled={(filters.page || 1) === 1}
          >
            Previous
          </Button>
          <Button
            onClick={() =>
              setFilters((old) => ({
                ...old,
                page: Math.min(
                  (old.page || 1) + 1,
                  Math.ceil((data?.totalResultsCount || 0) / 10),
                ),
              }))
            }
            disabled={
              (filters.page || 1) ===
              Math.ceil((data?.totalResultsCount || 0) / 10)
            }
          >
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

function getNameFromValue(
  value: string,
  array: { value: string; name: string }[],
): string {
  const item = array.find((reason) => reason.value === value);
  return item ? item.name : "Unknown Reason";
}

export default Archive;
