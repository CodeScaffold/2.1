import React, { useState } from "react";
import { DateRange, RangeKeyDict } from "react-date-range";
import { addDays } from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import Popover from "@mui/material/Popover";
import Box from "@mui/material/Box";
import { DateRangePickerComponentProps, Range } from "../../utils/types";

const DateRangePickerComponent: React.FC<DateRangePickerComponentProps> = ({
  onDateChange,
}) => {
  // Initially, no date range is selected.
  const [state, setState] = useState<Range[] | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  // A default range to use when opening the picker if none is set.
  const defaultRange: Range = {
    startDate: new Date(),
    endDate: addDays(new Date(), 7),
    key: "selection",
  };

  const handleDateChange = (ranges: RangeKeyDict): void => {
    const selection = ranges["selection"] as Range;
    setState([selection]);
    onDateChange(selection.startDate, selection.endDate);
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>): void => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (): void => {
    setAnchorEl(null);
  };

  // Clear the date selection
  const handleClear = (): void => {
    setState(null);
    // Optionally, notify the parent component that dates have been cleared.
    onDateChange(undefined as unknown as Date, undefined as unknown as Date);
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? "date-range-picker-popover" : undefined;

  const currentRange = state ?? [defaultRange];

  return (
    <div>
      <TextField
        variant="outlined"
        size="small"
        label="Date Range"
        // Display an empty value if no range is selected.
        value={
          state
            ? `${state[0].startDate.toLocaleDateString()} - ${state[0].endDate.toLocaleDateString()}`
            : ""
        }
        onClick={handleClick}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={handleClick}>
                <CalendarTodayIcon />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        <Box sx={{ p: 2 }}>
          <DateRange
            editableDateInputs={true}
            onChange={handleDateChange}
            moveRangeOnFirstSelection={false}
            ranges={currentRange}
          />
          <div style={{ marginTop: "8px", textAlign: "center" }}>
            <button onClick={handleClear}>Clear</button>
          </div>
        </Box>
      </Popover>
    </div>
  );
};

export default DateRangePickerComponent;
