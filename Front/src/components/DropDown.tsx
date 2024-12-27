// @ts-nocheck
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import React from "react";

const DropDown = ({ name, options, value, onChange, required }: any) => {
  const handleChange = (event: SelectChangeEvent) => {
    onChange(event.target.value as string);
  };
  return (
    <FormControl required={required} sx={{ minWidth: 150 }}>
      <InputLabel id="pair-simple-select-label">{name}</InputLabel>
      <Select
        labelId={`${name}-simple-select-label`}
        id={`${name}-simple-select`}
        value={value}
        label={name}
        onChange={handleChange}
      >
        {options.map((option, index) => {
          const name = option.value ? option.value : option.name;
          return (
            <MenuItem key={index} value={name}>
              {option.name}
            </MenuItem>
          );
        })}
      </Select>
    </FormControl>
  );
};
export default DropDown;
