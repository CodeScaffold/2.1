import puppeteer from 'puppeteer';
import fs from 'fs';

async function scrapeHighImpactNewsForDay(month, day) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Generate URL in the format "monthDay" (e.g., "dec13")
    const url = `https://www.forexfactory.com/calendar?day=${month}${day}`;
    console.log(`Opening URL: ${url}`);
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
    });

    await page.goto(url, { waitUntil: 'domcontentloaded' });

    console.log(`Scraping high-impact news for ${month}${day}...`);

    const events = await page.evaluate(() => {
        const rows = document.querySelectorAll('tr.calendar__row');
        const highImpactEvents = [];
        let currentDate = '';

        rows.forEach(row => {
            // Identify day breaker rows to get the current date
            const dayBreaker = row.querySelector('.calendar__row--day-breaker .calendar__cell span');
            if (dayBreaker) {
                currentDate = dayBreaker.textContent.trim();
                return;
            }

            // Extract event details
            const time = row.querySelector('.calendar__time span')?.textContent?.trim() || '';
            const currency = row.querySelector('.calendar__currency span')?.textContent?.trim() || '';
            const eventTitle = row.querySelector('.calendar__event-title')?.textContent?.trim() || '';
            const impact = row.querySelector('.calendar__impact span')?.title || '';

            // Collect only high-impact events
            if (impact === 'High Impact Expected' && currentDate && currency && eventTitle) {
                highImpactEvents.push({
                    date: currentDate,
                    time,
                    currency,
                    event: eventTitle,
                    impact,
                });
            }
        });

        return highImpactEvents;
    });

    console.log(`Scraped ${events.length} high-impact events for ${month}${day}.`);

    await browser.close();
    return events;
}

async function appendDataToFile(data, filename) {
    let existingData = [];
    if (fs.existsSync(filename)) {
        const fileContent = fs.readFileSync(filename, 'utf8');
        existingData = JSON.parse(fileContent);
    }

    // Append new data to the existing data
    const updatedData = [...existingData, ...data];

    // Save the updated data back to the file
    fs.writeFileSync(filename, JSON.stringify(updatedData, null, 2));
    console.log(`Appended data to ${filename}`);
}

async function scrapeAllMonths() {
    const months = [
        { name: 'jan', days: 31 },
        { name: 'feb', days: 28 }, // Adjust to 29 for leap years
        { name: 'mar', days: 31 },
        { name: 'apr', days: 30 },
        { name: 'may', days: 31 },
        { name: 'jun', days: 30 },
        { name: 'jul', days: 31 },
        { name: 'aug', days: 31 },
        { name: 'sep', days: 30 },
        { name: 'oct', days: 31 },
        { name: 'nov', days: 30 },
        { name: 'dec', days: 31 },
    ];

    const filename = 'high_impact_news.json';

    for (const month of months) {
        for (let day = 1; day <= month.days; day++) {
            const dayString = day.toString(); // No zero padding (e.g., "1", "2")
            const data = await scrapeHighImpactNewsForDay(month.name, dayString);
            await appendDataToFile(data, filename);
        }
    }
}

// Scrape all months
scrapeAllMonths();
