import { useEffect, useState } from "react";
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
import { Reasons } from "./Reason.ts";
import { exportToCSV } from "../utils/utils";
import moment from "moment";
import IconButton from "@mui/material/IconButton";
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import { enqueueSnackbar } from "notistack";
import axios from 'axios';
import { API_URL } from "./settings.ts";
import DateRangePickerComponent from "./common/DatePicker.tsx";

function getNameFromValue(value: string, Array: any[]) {
  const item = Array.find((reason) => reason.value === value);
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
  closeTimeDate: number;
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

interface FetchFilters {
  page?: number;
  includeArchived: boolean;
  paginate?: boolean;
  [key: string]: any;
}

const getToken = () => {
  return localStorage.getItem("token");
};

const fetchFilteredResults = async (
  filters: Record<string, any>,
): Promise<{ results: ResultDataType[]; totalResultsCount: number }> => {
  const token = getToken();
  const queryParams = new URLSearchParams(filters).toString();
  const response = await fetch(`${API_URL}/result?${queryParams}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
};

const fetchAllFilteredResults = async (
  filters: FetchFilters,
): Promise<ApiResponse> => {
  const token = getToken();
  const exportFilters: FetchFilters = { ...filters, paginate: false };
  const queryParams = new URLSearchParams(exportFilters as any).toString();
  const response = await fetch(`${API_URL}/result?${queryParams}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data: ApiResponse = await response.json();
  return data;
};

const Archive = () => {
  const [filters, setFilters] = useState({ page: 1, includeArchived: true });
  const [totalCompensation, setTotalCompensation] = useState(0);

  const { data, error, isLoading } = useQuery({
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
    }
  }, [data]);

  const [results, setResults] = useState<ResultDataType[]>([]);
  const [totalResultsCount, setTotalResultsCount] = useState(0);

  const handleExportToCSV = async () => {
    try {
      const allData = await fetchAllFilteredResults(filters);
      const updatedResults = allData.results.map((result) => {
        const foundReason = Reasons.find(
          (reason) => reason.value === result.reason,
        );
        return {
          ...result,
          reason: foundReason ? foundReason.name : "Unknown Reason",
        };
      });

      exportToCSV(updatedResults, "FilteredResults");
    } catch (error) {
      console.error("Failed to fetch all results for export:", error);
    }
  };

  useEffect(() => {
    if (data?.results) {
      setResults(data.results);
      setTotalResultsCount(data.totalResultsCount);
      const total = data.results.reduce(
        (acc, curr) => acc + (curr.compensate || 0),
        0,
      );
      setTotalCompensation(total);
    }
  }, [data]);

  const handleFilterChange = (event: { target: { name: any; value: any; }; }) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value, page: 1 }));
  };

  const handleDateChange = (newStartDate: moment.MomentInput, newEndDate: moment.MomentInput) => {
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
    })); // Set the filters correctly.
  };

  const { mutate } = useMutation({
    mutationFn: (id: number) => axios.put(`${API_URL}/ticket/${id}`, {}),
    onError: (error) => {
      console.error("Error updating ticket:", error);
      enqueueSnackbar("There was an error updating the ticket", {
        variant: "error",
      });
    },
  });

  const handleUnArchive = (id: number) => () => {
    mutate(id, {
      onSuccess: () => {
        const f = results.filter((i: any) => i.id !== id);
        setResults(f);
        enqueueSnackbar("UnArchive was successful", {
          variant: "success",
        });
      },
    });
  };

  if (error) return <p>An error has occurred: {error.message}</p>;

  return (
    <>
      <Card raised sx={{ margin: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Total Compensation: {totalCompensation.toFixed(2)} USD
          </Typography>
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
                      {Reasons.map((reason) => (
                        <MenuItem key={reason.name} value={reason.value}>
                          {reason.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" style={{ paddingTop: 8 }}>
                      Total: {totalCompensation.toFixed(2)} $
                    </Typography>
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No Result Found
                    </TableCell>
                  </TableRow>
                ) : isLoading ? (
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
                ) : (
                  results?.map((row: ResultDataType) => (
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
          <TableBody style={{ marginTop: "20px" }}>
            <Button
              onClick={() =>
                setFilters((old) => ({
                  ...old,
                  page: Math.max(old.page - 1, 1),
                }))
              }
              disabled={filters.page === 1}
            >
              Previous
            </Button>
            <Button
              onClick={() =>
                setFilters((old) => ({
                  ...old,
                  page: Math.min(
                    old.page + 1,
                    Math.ceil(data?.totalResultsCount / 10),
                  ),
                }))
              }
              disabled={
                filters.page === Math.ceil(data?.totalResultsCount / 10)
              }
            >
              Next
            </Button>
          </TableBody>
        </CardContent>
        <Button
          onClick={handleExportToCSV}
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

export default Archive;
