import React, { useState } from 'react';

interface Trade {
    ticket: string;
    openTime: Date;
    closeTime: Date;
    amount: number;
    duration: number;
}

const StatementParser: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [trades, setTrades] = useState<Trade[]>([]);
    const [sum, setSum] = useState<number>(0);

    const parseStatement = async () => {
        console.log("Parse statement function triggered");

        if (!file) {
            console.error("No file uploaded");
            return;
        }

        try {
            console.log("File selected:", file.name);

            const text = await file.text();
            console.log("File content loaded");

            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            console.log("HTML parsed");

            if (!doc) {
                console.error("Failed to parse the document");
                return;
            }

            const rows = doc.querySelectorAll('tr');
            console.log("Number of rows found:", rows.length);

            if (!rows || rows.length === 0) {
                console.error("No rows found in the document");
                return;
            }

            const tradeData: Trade[] = [];
            let totalAmount = 0;

            rows.forEach((row) => {
                const cells = row.querySelectorAll('td');

                // Only log the specific columns: ticket, open time, close time, and profit/amount
                const ticket = cells[1]?.textContent?.trim() || ''; // Ticket number
                const openTimeStr = cells[0]?.textContent?.trim() || ''; // Open time
                const closeTimeStr = cells[9]?.textContent?.trim() || ''; // Close time
                const amountStr = cells[13]?.textContent?.trim() || '0'; // Profit/Amount

                // Log only relevant information for each trade
                // console.log(`Ticket: ${ticket}, Open Time: ${openTimeStr}, Close Time: ${closeTimeStr}, Profit: ${amountStr}`);

                const openTime = new Date(openTimeStr);
                const closeTime = new Date(closeTimeStr);
                const amount = parseFloat(amountStr.replace(/,/g, ''));

                // Log parsed values to verify their correctness
                // console.log(`Parsed values: Ticket ${ticket}, Open Time ${openTime}, Close Time ${closeTime}, Amount ${amount}`);

                if (amount > 0 && !isNaN(openTime.getTime()) && !isNaN(closeTime.getTime())) {
                    const duration = (closeTime.getTime() - openTime.getTime()) / 1000;

                    if (duration < 30) {
                        // console.log(`Profitable trade under 30 seconds: Ticket ${ticket}, Duration: ${duration}s, Profit: ${amount}`);
                        tradeData.push({ ticket, openTime, closeTime, amount, duration });
                        totalAmount += amount;
                    }
                }
            });

            setTrades(tradeData);
            setSum(totalAmount);
            console.log("Profitable trades with duration less than 30 seconds:", tradeData);
            console.log("Total sum of profitable amounts:", totalAmount);
        } catch (error) {
            console.error("Error parsing the file:", error);
        }
    };

    return (
        <div>
            <input
                type="file"
    accept=".htm,.html"
    onChange={(e) => {
        if (e.target.files?.length) {
            setFile(e.target.files[0]);
            console.log("File selected:", e.target.files[0].name);
        }
    }}
    />
    <button onClick={parseStatement} disabled={!file}>
    Calculate
    </button>
    <h3>Profitable trades with duration less than 30 seconds:</h3>
    <ul>
    {trades.map((trade) => (
            <li key={trade.ticket}>
                Ticket: {trade.ticket}, Amount: {trade.amount}, Duration: {trade.duration}s
    </li>
))}
    </ul>
    <h4>Total Amount: {sum}</h4>
    </div>
);
};

export default StatementParser;