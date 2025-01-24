export const Reasons = [
  { name: "Slippage On SL", value: "SlippageOnSL" },
  { name: "Open Price Slippage", value: "OpenPriceSlippage" },
  { name: "Open And Close Price Slippage", value: "OpenClosePriceSlippage" },
  { name: "High Spread", value: "HighSpread" },
  { name: "Server Disconnection", value: "timeout" },
  { name: "Max DrawDown", value: "MaxDrawdown" },
];

export const Commends = [
  {
    name: "set the close price on SL and correct the PNL",
    value: "SlSlippage",
  },
  {
    name: "set the open price on requested and correct the PNL",
    value: "OpenSlippage",
  },
  {
    name: "set the open and close price on requested and correct the PNL",
    value: "OpenSlSlippage",
  },
  { name: "Zero the trade and correct the PNL", value: "HighSpread" },
  { name: "Zero the trade and correct the PNL", value: "MaxDrawDown" },
];

export const versions = [
  { name: "Meta 4", value: "Meta4" },
  { name: "Meta 5", value: "Meta5" },
  { name: "cTrader", value: "cTrader" },
];
