import React from "react";
import { FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from "@mui/material";

interface Option {
    name: string;
    value?: string;
}

interface DropDownProps {
    name: string;
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
    size?: "small" | "medium";
    minWidth?: number;
}

const DropDown: React.FC<DropDownProps> = ({
                                               name,
                                               options,
                                               value,
                                               onChange,
                                               required = false,
                                               size = "medium",
                                               minWidth = 150,
                                           }) => {
    const handleChange = (event: SelectChangeEvent) => {
        onChange(event.target.value as string);
    };

    return (
        <FormControl fullWidth required={required} size={size} sx={{ minWidth }}>
            <InputLabel id={`${name}-select-label`}>{name}</InputLabel>
            <Select
                labelId={`${name}-select-label`}
                id={`${name}-select`}
                value={value}
                label={name}
                onChange={handleChange}
            >
                {options.map((option, index) => {
                    const optionValue = option.value ? option.value : option.name;
                    return (
                        <MenuItem key={index} value={optionValue}>
                            {option.name}
                        </MenuItem>
                    );
                })}
            </Select>
        </FormControl>
    );
};

export default DropDown;