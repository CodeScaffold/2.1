import { useState } from "react";
import { DateRange } from "react-date-range";
import { addDays } from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import Popover from "@mui/material/Popover";
import Box from "@mui/material/Box";

const DateRangePickerComponent = ({ onDateChange }) => {
  const [state, setState] = useState([
    {
      startDate: new Date(),
      endDate: addDays(new Date(), 7),
      key: "selection",
    },
  ]);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleDateChange = (ranges) => {
    const { selection } = ranges;
    setState([selection]);
    onDateChange(selection.startDate, selection.endDate);
  };

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? "date-range-picker-popover" : undefined;

  return (
    <div>
      <TextField
        variant="outlined"
        size="small"
        label="Date Range"
        value={`${state[0].startDate.toLocaleDateString()} - ${state[0].endDate.toLocaleDateString()}`}
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
        <Box>
          <DateRange
            editableDateInputs={true}
            onChange={handleDateChange}
            moveRangeOnFirstSelection={false}
            ranges={state}
          />
        </Box>
      </Popover>
    </div>
  );
};

export default DateRangePickerComponent;
