import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { useSnackbar } from "notistack";
import { Pairs } from "./pair";
import { Commends, Reasons, versions } from "./Reason";
import { API_URL } from "./settings";
import DropDown from "./DropDown.tsx";
import { alpha, useTheme } from "@mui/material/styles";

interface Pair {
  name: string;
  base: string;
  quote: string;
  contractSize: number;
  tickSize: number;
  apiName?: string;
}

const InputSection: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();

  // Form states
  const [Account, setAccount] = useState("");
  const [ClientId, setClientId] = useState("");
  const [OpenPrice, setOpenPrice] = useState("");
  const [Ticket, setID] = useState("");
  const [lot, setLot] = useState("");
  const [tp, setTp] = useState("");
  const [sl, setSl] = useState("");
  const [closePrice, setClosePrice] = useState("");
  const [closeTimeDate, setcloseTimeDate] = useState("");
  const [pair, setPair] = useState("");
  const [inputString, setInputString] = useState("");
  const [reason, setReason] = useState("");
  const [commend, setCommend] = useState("");
  const [Version, setVersion] = useState("");
  const [, setDifferenceValue] = useState(0);
  const [, setTotalPriceValue] = useState(0);

  const theme = useTheme();

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Basic validations
    if (!lot || !closePrice) {
      enqueueSnackbar("Error: Lot and Close Price are required.", {
        variant: "error",
      });
      return;
    }
    if (!sl && !tp) {
      enqueueSnackbar("Error: Either S/L or T/P must be provided.", {
        variant: "error",
      });
      return;
    }
    if (+sl === 0 && +tp === 0) {
      enqueueSnackbar("T/P and S/L can't both be 0.", {
        variant: "error",
      });
      return;
    }

    // Validate pair
    const selectedPair = (Pairs as Pair[]).find((p) => p.name === pair);
    if (!selectedPair) {
      enqueueSnackbar("Selected pair not found.", { variant: "error" });
      return;
    }

    // Fetch conversion rate if needed
    let conversionRate = 1;
    if (selectedPair.apiName) {
      try {
        const response = await fetch(
            `https://fcsapi.com/api-v3/forex/latest?symbol=${encodeURIComponent(
                selectedPair.apiName,
            )}&access_key=DsBQp33PeVHJfrWhP3chmSWWf`,
        );
        const data = await response.json();
        if (data.status && data.response?.[0]?.c) {
          conversionRate = parseFloat(data.response[0].c);
        } else {
          enqueueSnackbar("Failed to fetch conversion rate.", {
            variant: "error",
          });
          return;
        }
      } catch (error) {
        enqueueSnackbar("Error fetching conversion rate.", {
          variant: "error",
        });
        return;
      }
    }

    // Calculate pip
    let pip = 0;
    try {
      pip = selectedPair.contractSize * parseFloat(lot) * selectedPair.tickSize;
    } catch (error) {
      enqueueSnackbar("Error calculating pip.", { variant: "error" });
      return;
    }

    // Convert pip to USD
    let pipUSDValue = pip;
    if (selectedPair.base === "USD" && selectedPair.quote !== "USD") {
      // e.g., USDJPY
      pipUSDValue = pip / conversionRate;
    } else if (selectedPair.quote === "USD") {
      // e.g., EURUSD
      pipUSDValue = pip;
    } else {
      // e.g., GBPJPY, or something else
      pipUSDValue = pip / conversionRate;
    }

    // Calculate difference
    let difference = 0;
    try {
      const closePriceValue = parseFloat(closePrice);
      if (sl && +sl !== 0) {
        difference = Math.abs(closePriceValue - parseFloat(sl));
      } else if (tp && +tp !== 0) {
        difference = Math.abs(closePriceValue - parseFloat(tp));
      }
    } catch (error) {
      enqueueSnackbar("Error calculating difference.", { variant: "error" });
      return;
    }

    const finalDifference = difference / selectedPair.tickSize;
    setDifferenceValue(finalDifference);
    setTotalPriceValue(finalDifference * pipUSDValue);

    // Submit to backend
    try {
      // Pre‑check: avoid duplicate ticket by querying existing results
      try {
        const checkResp = await fetch(
            `${API_URL}/result?ticket=${encodeURIComponent(Ticket)}`,
            { credentials: 'include' }
        );
        if (checkResp.ok) {
          const existing = await checkResp.json();
          if (Array.isArray(existing) && existing.length > 0) {
            enqueueSnackbar(
                'This ticket already exists in database.',
                { variant: 'error' }
            );
            return;
          }
        }
      } catch (preError) {
        console.warn('Pre‑check for existing ticket failed', preError);
      }

      const response = await fetch(`${API_URL}/result`, {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: ClientId,
          account: Account,
          ticket: Ticket,
          tp,
          sl,
          pair,
          lot,
          openPrice: OpenPrice,
          closePrice,
          closeTimeDate,
          reason,
          commend,
          version: Version,
          difference: finalDifference,
          compensateInUsd: finalDifference * pipUSDValue,
        }),
      });

      // Handle non-200 responses
      if (!response.ok) {
        let errorMsg = "Failed to create result";

        try {
          const errorData = await response.json();
          // Try to extract specific error message from various possible fields
          errorMsg = errorData.message ||
              errorData.error ||
              errorData.details ||
              errorData.msg ||
              `Error ${response.status}: ${response.statusText}`;
        } catch (parseError) {
          // If response is not JSON, use status text
          errorMsg = `Error ${response.status}: ${response.statusText}`;
        }

        enqueueSnackbar(errorMsg, { variant: "error" });
        return;
      }

      // Success - response is ok
      enqueueSnackbar("Data submitted successfully", { variant: "success" });

    } catch (error: any) {
      // Network errors or other exceptions
      const errorMsg = error.message || "Network error occurred while submitting data";
      enqueueSnackbar(errorMsg, { variant: "error" });
    }
  };

  // Parse user input
  const handleInputStringChange = (input: string) => {
    const parts = input.split(/\s+/).filter(Boolean);
    if (parts.length < 9) {
      console.error("Invalid input format.");
      return;
    }

    // Adjust indexes based on your input format
    const parsedClientId = parts[13];
    const parsedAccount = parts[12];
    const parsedID = parts[0];
    const parsedPair = parts[1].replace(/[\.\#\!]/g, "");
    const parsedLot = parts[3];
    const parsedOpenPrice = parts[6];
    const parsedTp = parts[7];
    const parsedSl = parts[8];
    const parsedCloseTimeDate = parts[9];
    const parsedClosePrice = parts[11];

    // Update form fields
    setClientId(parsedClientId);
    setAccount(parsedAccount);
    setID(parsedID);
    setPair(parsedPair);
    setLot(parsedLot);
    setOpenPrice(parsedOpenPrice);
    setTp(parsedTp);
    setSl(parsedSl);
    setClosePrice(parsedClosePrice);
    setcloseTimeDate(parsedCloseTimeDate);
  };

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
        <Card
            component="form"
            onSubmit={handleSubmit}
            raised
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
          <CardContent>
            {/* Large Input Field */}
            <TextField
                fullWidth
                size="medium"
                label="Input format: Ticket, Symbol, Type, Lots, Open Time, Open Price, T/P, S/L, Close Time, Close Price, Account, Client ID"
                variant="outlined"
                value={inputString}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setInputString(e.target.value);
                  handleInputStringChange(e.target.value);
                }}
                sx={{
                  mb: 2
                }}
            />

            <Grid container spacing={2} alignItems="flex-start">
              {/* First Row */}
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                    type="number"
                    size="medium"
                    label="Client Id"
                    variant="outlined"
                    value={ClientId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setClientId(e.target.value)
                    }
                    fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                    type="number"
                    size="medium"
                    label="Account"
                    variant="outlined"
                    value={Account}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setAccount(e.target.value)
                    }
                    fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                    type="number"
                    size="medium"
                    label="Ticket"
                    variant="outlined"
                    value={Ticket}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setID(e.target.value)
                    }
                    fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                {/* Pair */}
                <FormControl size="medium" fullWidth>
                  <InputLabel>Pair</InputLabel>
                  <Select
                      label="Pair"
                      value={pair}
                      onChange={(e) => setPair(e.target.value)}
                  >
                    {Pairs.map((p) => (
                        <MenuItem key={p.name} value={p.name}>
                          {p.name}
                        </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Second Row */}
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                    type="number"
                    size="medium"
                    label="Lot"
                    variant="outlined"
                    value={lot}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setLot(e.target.value)
                    }
                    fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                    type="number"
                    size="medium"
                    label="Open Price"
                    variant="outlined"
                    value={OpenPrice}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setOpenPrice(e.target.value)
                    }
                    fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                    type="number"
                    size="medium"
                    label="T/P"
                    variant="outlined"
                    value={tp}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setTp(e.target.value)
                    }
                    fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                    type="number"
                    size="medium"
                    label="S/L"
                    variant="outlined"
                    value={sl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSl(e.target.value)
                    }
                    fullWidth
                />
              </Grid>

              {/* Third Row */}
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                    type="number"
                    size="medium"
                    label="Close Price"
                    variant="outlined"
                    value={closePrice}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setClosePrice(e.target.value)
                    }
                    fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                {/* Reason */}
                <DropDown
                    name="Reason"
                    options={Reasons}
                    value={reason}
                    onChange={(newValue) => setReason(newValue)}
                    required
                    size="medium"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                {/* Commend */}
                <DropDown
                    name="Commend"
                    options={Commends}
                    value={commend}
                    onChange={(newValue) => setCommend(newValue)}
                    required
                    size="medium"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                {/* Version */}
                <DropDown
                    name="Version"
                    options={versions}
                    value={Version}
                    onChange={(newValue) => setVersion(newValue)}
                    required
                    size="medium"
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Submit Button */}
            <Box textAlign="right">
              <Button startIcon={<SendIcon />} variant="contained" type="submit">
                Submit
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
  );
};

export default InputSection;