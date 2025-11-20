import React from "react";
import { Button, ButtonGroup, Box } from "@mui/material";

interface MonthSelectorProps {
  selectedMonth: Date;
  setSelectedMonth: (date: Date) => void;
}

const MonthSelector: React.FC<MonthSelectorProps> = ({
  selectedMonth,
  setSelectedMonth,
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        mb: 2,
      }}
    >
      <ButtonGroup variant="text" color="primary">
        <Button
          onClick={() =>
            setSelectedMonth(
              new Date(
                selectedMonth.getFullYear(),
                selectedMonth.getMonth() - 1,
                1,
              ),
            )
          }
          sx={{ textTransform: "none" }}
        >
          {new Date(
            selectedMonth.getFullYear(),
            selectedMonth.getMonth() - 1,
            1,
          ).toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}
        </Button>
        <Button
          onClick={() =>
            setSelectedMonth(
              new Date(
                selectedMonth.getFullYear(),
                selectedMonth.getMonth(),
                1,
              ),
            )
          }
          sx={{ textTransform: "none", fontWeight: "bold" }}
        >
          {selectedMonth.toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}
        </Button>
        <Button
          onClick={() =>
            setSelectedMonth(
              new Date(
                selectedMonth.getFullYear(),
                selectedMonth.getMonth() + 1,
                1,
              ),
            )
          }
          sx={{ textTransform: "none" }}
        >
          {new Date(
            selectedMonth.getFullYear(),
            selectedMonth.getMonth() + 1,
            1,
          ).toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}
        </Button>
      </ButtonGroup>
    </Box>
  );
};

export default MonthSelector;
