import React, { useState } from 'react';
import { Button, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { Theme, useTheme } from '@mui/material/styles';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Typography from "@mui/material/Typography";
import "./style.css";

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
    PaperProps: {
        style: {
            maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
            width: 250,
        },
    },
};

const functions = [
    '30-second-trades',
    'News hedging',
    '80% profit target',
    '50% Margin Usage in news',
];

function getStyles(option: string, Option: string[], theme: Theme) {
    return {
        fontWeight: Option.includes(option)
            ? theme.typography.fontWeightMedium
            : theme.typography.fontWeightRegular,
    };
}

interface Trade {
    ticket: string;
    openTime: Date;
    closeTime: Date;
    amount: number;
    duration: number;
}

const StatementParser: React.FC = () => {
    const theme = useTheme();
    const [Option, setOption] = useState<string[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [trades, setTrades] = useState<Trade[]>([]);
    const [sum, setSum] = useState<number>(0);

    const handleChange = (event: SelectChangeEvent<typeof Option>) => {
        const {
            target: { value },
        } = event;
        setOption(typeof value === 'string' ? value.split(',') : value);
    };

    const parseStatement = async () => {
        console.log("Parse statement function triggered");

        if (!file) {
            console.error("No file uploaded");
            return;
        }

        try {
            const text = await file.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            const rows = doc.querySelectorAll('tr');

            if (!rows || rows.length === 0) {
                console.error("No rows found in the document");
                return;
            }

            const tradeData: Trade[] = [];
            let totalAmount = 0;

            rows.forEach((row) => {
                const cells = row.querySelectorAll('td');
                const ticket = cells[1]?.textContent?.trim() || '';
                const openTimeStr = cells[0]?.textContent?.trim() || '';
                const closeTimeStr = cells[9]?.textContent?.trim() || '';
                const amountStr = cells[13]?.textContent?.trim() || '0';

                const openTime = new Date(openTimeStr);
                const closeTime = new Date(closeTimeStr);
                const amount = parseFloat(amountStr.replace(/,/g, ''));

                if (amount > 0 && !isNaN(openTime.getTime()) && !isNaN(closeTime.getTime())) {
                    const duration = (closeTime.getTime() - openTime.getTime()) / 1000;

                    if (Option.includes('30-second-trades') && duration < 30) {
                        tradeData.push({ ticket, openTime, closeTime, amount, duration });
                        totalAmount += amount;
                    }
                    // Add logic for other selected options like 'News hedging', '80% profit target', etc.
                }
            });

            setTrades(tradeData);
            setSum(totalAmount);
            console.log("Total trades processed:", tradeData);
        } catch (error) {
            console.error("Error parsing the file:", error);
        }
    };

    return (
        <Box sx={{ mt: { xs: 7, sm: 8 }, px: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                <Button

                    component="label"
                    role={undefined}
                    variant="contained"
                    startIcon={<CloudUploadIcon />}
                    sx={{ minWidth: 180 , height: 55 , mt:1 }} // Set a fixed width to prevent wrapping
                >
                    Upload files
                    <input
                        type="file"
                        hidden
                        accept=".htm,.html"
                        onChange={(e) => {
                            if (e.target.files?.length) {
                                setFile(e.target.files[0]);
                                console.log("File selected:", e.target.files[0].name);
                            }
                        }}
                    />
                </Button>

                <FormControl
                    fullWidth
                    sx={{
                        minWidth: 300,
                        flexGrow: 1,
                        mt: 2,
                        height: 60,
                        '& .MuiInputLabel-root': {
                            color: theme.palette.mode === 'dark' ? '#fff' : '#000',
                        },
                        '& .MuiOutlinedInput-root': {
                            color: theme.palette.mode === 'dark' ? '#fff' : '#000',
                            backgroundColor: theme.palette.mode === 'dark' ? '#424242' : '#fff',
                            '& fieldset': {
                                borderColor: theme.palette.mode === 'dark' ? '#fff' : 'rgba(0, 0, 0, 0.23)',
                            },
                            '&:hover fieldset': {
                                borderColor: theme.palette.mode === 'dark' ? '#fff' : '#000',
                            },
                        },
                        '& .MuiMenu-paper': {
                            backgroundColor: theme.palette.mode === 'dark' ? '#424242' : '#fff',
                        },
                        '& .MuiMenuItem-root': {
                            color: theme.palette.mode === 'dark' ? '#fff' : '#000',
                        },
                    }}
                >
                    <InputLabel id="multiple-Option">Select an option</InputLabel>
                    <Select
                        labelId="multiple-Option"
                        id="multiple-Option"
                        multiple
                        value={Option}
                        onChange={handleChange}
                        input={<OutlinedInput label="Option" />}
                        MenuProps={MenuProps}
                    >
                        {functions.map((option) => (
                            <MenuItem
                                key={option}
                                value={option}
                                style={getStyles(option, Option, theme)}
                            >
                                {option}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Button
                    variant="contained"
                    sx={{
                        minWidth: 130 ,
                        height: 55,
                        mt: 1,
                        color: theme.palette.mode === 'dark' ? '#fff' : '#000',
                        backgroundColor: theme.palette.mode === 'dark' ? '#616161' : '#1976d2',
                        '&:hover': {
                            backgroundColor: theme.palette.mode === 'dark' ? '#757575' : '#1565c0',
                        },
                    }}
                    onClick={parseStatement}
                    disabled={!file || !Option.length}
                >
                    Calculate
                </Button>
            </Box>

            {/* Display Results */}
            {trades.length > 0 && (
                <Box sx={{ mt: 4 }}>
                    <Typography variant="h6">Profitable trades with duration less than 30 seconds:</Typography>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Ticket</TableCell>
                                    <TableCell align="right">Amount</TableCell>
                                    <TableCell align="right">Duration (s)</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {trades.map((trade) => (
                                    <TableRow key={trade.ticket}>
                                        <TableCell component="th" scope="row">
                                            {trade.ticket}
                                        </TableCell>
                                        <TableCell align="right">{trade.amount}</TableCell>
                                        <TableCell align="right">{trade.duration}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Typography variant="h6" sx={{ mt: 2 }}>Total Amount: {sum} $</Typography>
                </Box>
            )}
        </Box>
    );
};

export default StatementParser;