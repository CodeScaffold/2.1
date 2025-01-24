import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
} from "@mui/material";
import DropDown from "./DropDown";
import { Pairs } from "./pair.ts";
import { Commends, Reasons, versions } from "./Reason.ts";
import { useState } from "react";
import { useSnackbar } from "notistack";
import SendIcon from "@mui/icons-material/Send";
import { API_URL } from "./settings.ts";

const InputSection = () => {
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
  const [differenceValue, setDifferenceValue] = useState(0);
  const [totalPriceValue, setTotalPriceValue] = useState(0);
  const { enqueueSnackbar } = useSnackbar();

  const handleSubmit = async (e: any) => {
    e.preventDefault();
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
      enqueueSnackbar("TL and SL can't be both 0.", {
        variant: "error",
      });
      return;
    }

    const selectedPair = Pairs.find((p) => p.name === pair);
    if (!selectedPair) {
      enqueueSnackbar("Selected pair not found.", {
        variant: "error",
      });
      return;
    }
    let conversionRate = 1;

    if (selectedPair.apiName) {
      try {
        const response = await fetch(
          `https://fcsapi.com/api-v3/forex/latest?symbol=${encodeURIComponent(
            selectedPair.apiName,
          )}&access_key=DsBQp33PeVHJfrWhP3chmSWWf`,
        );
        const data = await response.json();
        if (
          data.status &&
          data.response &&
          data.response[0] &&
          data.response[0].c
        ) {
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
    let pip = 0;
    try {
      pip = selectedPair.contractSize * parseFloat(lot) * selectedPair.tickSize;
    } catch (error) {
      enqueueSnackbar("Error calculating pip.", {
        variant: "error",
      });
      return;
    }

    let pipUSDValue = pip;
    if (selectedPair.base === "USD" && selectedPair.quote !== "USD") {
      pipUSDValue = pip / conversionRate;
    } else if (selectedPair.quote === "USD") {
      pipUSDValue = pip;
    } else {
      pipUSDValue = pip / conversionRate;
    }

    let difference = 0;
    try {
      if (closePrice) {
        const closePriceValue = +closePrice;
        if (sl && +sl !== 0) {
          difference = Math.abs(closePriceValue - +sl);
        } else if (tp && +tp !== 0) {
          difference = Math.abs(closePriceValue - +tp);
        }
      }
    } catch (error) {
      enqueueSnackbar("Error calculating difference.", {
        variant: "error",
      });
      return;
    }

    const finalDifference = difference / selectedPair.tickSize;
    setDifferenceValue(finalDifference);
    setTotalPriceValue(finalDifference * pipUSDValue);

    try {
      const response = await fetch(`${API_URL}/result`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: ClientId,
          account: Account,
          ticket: Ticket,
          tp: tp,
          sl: sl,
          pair: pair,
          lot: lot,
          openPrice: OpenPrice,
          closePrice: closePrice,
          closeTimeDate: closeTimeDate,
          reason: reason,
          commend: commend,
          version: Version,
          difference: finalDifference,
          compensateInUsd: finalDifference * pipUSDValue,
        }),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message);
      }
      const result = await response.json();
      enqueueSnackbar("Data submitted successfully", { variant: "success" });
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: "error" });
    }
  };

  const handleInputStringChange = (input: string) => {
    const parts = input.split(/\s+/).filter(Boolean);
    if (parts.length < 9) {
      console.error("Invalid input format.");
      return;
    }
    const parsedClientId = parts[13];
    const parsedAccount = parts[12];
    const parsedID = parts[0];
    const parsedPair = parts[1].replace(/[\.\#\!]/g, ""); // Remove ., #, !
    const parsedLot = parts[3];
    const parsedOpenPrice = parts[6];
    const parsedTp = parts[7];
    const parsedSl = parts[8];
    const parsedCloseTimeDate = parts[9];
    // const priceAtTime = parts[10];
    const parsedClosePrice = parts[11];

    const handleChangeReason = (event) => {
      setReason(event.target.value);
    };

    const handleChangeCommend = (event) => {
      setCommend(event.target.value);
    };

    const handleChangeVersion = (event) => {
      setVersion(event.target.value);
    };

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
    // setPriceAtDate({ date: closeTimeDate, time: priceAtTime });
  };
  return (
    <Card onSubmit={handleSubmit} component="form" raised sx={{ margin: 2 }}>
      <CardContent>
        <TextField
          fullWidth
          label="Input format : Ticket , Symbol ,Type , Lots , Open Time , Open Price , T/P , S/L , Close Time , Account , Client ID "
          variant="outlined"
          value={inputString}
          onChange={(e) => {
            setInputString(e.target.value);
            handleInputStringChange(e.target.value);
          }}
          sx={{ mb: 2 }}
        />
        <Stack spacing={2} direction="row">
          <Box component="div">
            <Stack direction="row" spacing={1}>
              <TextField
                type="number"
                id="ClientId"
                label="Client Id"
                variant="outlined"
                value={ClientId}
                onChange={(e) => setClientId(e.target.value)}
              />
              <TextField
                type="number"
                id="account"
                label="Account"
                variant="outlined"
                value={Account}
                onChange={(e) => setAccount(e.target.value)}
              />
              <TextField
                type="number"
                id="Ticket"
                label="Ticket"
                variant="outlined"
                value={Ticket}
                onChange={(e) => setID(e.target.value)}
              />
              <DropDown
                name="Pair"
                options={Pairs}
                value={pair}
                onChange={setPair}
              />
              <TextField
                type="number"
                id="lot"
                label="Lot"
                variant="outlined"
                value={lot}
                onChange={(e) => setLot(e.target.value)}
              />
              <TextField
                type="number"
                id="openPrice"
                label="Open Price"
                variant="outlined"
                value={OpenPrice}
                onChange={(e) => setOpenPrice(e.target.value)}
              />
            </Stack>
            <Stack sx={{ mt: 1 }} direction="row" spacing={1}>
              <TextField
                type="number"
                id="tp"
                label="T/P"
                variant="outlined"
                value={tp}
                onChange={(e) => setTp(e.target.value)}
              />
              <TextField
                type="number"
                id="sl"
                label="S/L"
                variant="outlined"
                value={sl}
                onChange={(e) => setSl(e.target.value)}
              />
              <TextField
                type="number"
                id="closePrice"
                label="Close Price"
                variant="outlined"
                value={closePrice}
                onChange={(e) => setClosePrice(e.target.value)}
              />
              <DropDown
                name="Reason"
                options={Reasons}
                value={reason}
                onChange={(newValue) => setReason(newValue)}
                required
              />
              <DropDown
                name="Commend"
                options={Commends}
                value={commend}
                onChange={setCommend}
                required
              />
              <DropDown
                name="version"
                options={versions}
                value={Version}
                onChange={setVersion}
                required
              />
            </Stack>
          </Box>
          <Button
            startIcon={<SendIcon />}
            sx={{ mt: 2 }}
            variant="contained"
            type="submit"
          >
            Submit
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default InputSection;
