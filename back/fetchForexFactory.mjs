import puppeteer from 'puppeteer';
import fs from 'fs';

/**
 * Convert a time string like "3:00am" or "3:00pm" to "03:00" / "15:00" in 24h format.
 */
function convertTo24HourFormat(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return timeStr;
    if (timeStr.toLowerCase() === 'all day') return timeStr;

    const match = timeStr.match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
    if (!match) return timeStr;

    const [, hoursStr, minutesStr, modifier] = match;
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (modifier.toLowerCase() === 'pm' && hours !== 12) {
        hours += 12;
    } else if (modifier.toLowerCase() === 'am' && hours === 12) {
        hours = 0;
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Adjust time to GMT+2 (subtract 1 hour).
 * If you do not need this shift, remove or adjust as required.
 */
function adjustTimeToGMT2(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return timeStr;
    if (timeStr.toLowerCase() === 'all day') return timeStr;

    const [hoursStr, minutesStr] = timeStr.split(':');
    if (!hoursStr || !minutesStr) return timeStr;

    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    // Example offset logic from your code
    hours -= 1;
    if (hours < 0) {
        hours += 24;
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Scrapes high-impact news for a specific month/day *and year* on ForexFactory.
 * Inherits the last non-blank time for rows that are missing it.
 */
export async function scrapeHighImpactNewsForDay(month, day, year) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // ForexFactory supports `?day=jan1.2025` to get Jan 1, 2025
    const url = `https://www.forexfactory.com/calendar?day=${month}${day}.${year}`;
    console.log(`Opening URL: ${url}`);

    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
    });

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    console.log(`Scraping high-impact news for ${month}${day}, ${year}...`);

    // Extract events
    let events = await page.evaluate(() => {
        const rows = document.querySelectorAll('tr.calendar__row');
        const highImpactEvents = [];
        let currentDate = '';
        let lastTime = '';

        rows.forEach((row) => {
            const dayBreaker = row.querySelector('.calendar__row--day-breaker .calendar__cell span');
            if (dayBreaker) {
                currentDate = dayBreaker.textContent.trim(); // e.g. "Jan 1" or "Wed Jan 1"
                lastTime = '';
                return;
            }

            let time = row.querySelector('.calendar__time span')?.textContent?.trim() || '';
            const currency = row.querySelector('.calendar__currency span')?.textContent?.trim() || '';
            const eventTitle = row.querySelector('.calendar__event-title')?.textContent?.trim() || '';
            const impact = row.querySelector('.calendar__impact span')?.title || '';

            // If time is empty, inherit previous time
            if (!time) {
                time = lastTime;
            } else {
                lastTime = time;
            }

            // Only capture High Impact Expected
            if (impact === 'High Impact Expected' && currentDate && currency && eventTitle) {
                highImpactEvents.push({
                    date: currentDate, // We'll append the year after evaluate()
                    time,
                    currency,
                    event: eventTitle,
                    impact,
                });
            }
        });

        return highImpactEvents;
    });

    await browser.close();

    // Convert and adjust times; also append the year to the date
    events = events.map((evt) => {
        const time24 = convertTo24HourFormat(evt.time);
        const timeGMT2 = adjustTimeToGMT2(time24);

        // e.g., if currentDate was "Wed Jan 1", store "Wed Jan 1 2025"
        return {
            ...evt,
            date: `${evt.date} ${year}`,
            time: timeGMT2,
        };
    });

    console.log(`Scraped ${events.length} high-impact events for ${month}${day}, ${year}.`);
    return events;
}

/**
 * Appends data to JSON file. If file doesn't exist, it's created.
 */
async function appendDataToFile(data, filename) {
    let existingData = [];
    if (fs.existsSync(filename)) {
        const fileContent = fs.readFileSync(filename, 'utf8');
        existingData = JSON.parse(fileContent);
    }

    const updatedData = [...existingData, ...data];
    fs.writeFileSync(filename, JSON.stringify(updatedData, null, 2));

    console.log(`Appended ${data.length} events to ${filename}`);
}

/**
 * Scrapes the entire year for the given `year` parameter.
 * Adjust days in February for leap years if necessary.
 */
async function scrapeAllMonths(year) {
    const months = [
        { name: 'jan', days: 31 },
        { name: 'feb', days: 28 }, // or 29 in a leap year
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
        // Leap year check if year is divisible by 4 (simplified)
        if (month.name === 'feb' && (year % 4 === 0)) {
            month.days = 29;
        }
        for (let day = 1; day <= month.days; day++) {
            const events = await scrapeHighImpactNewsForDay(month.name, day, year);
            await appendDataToFile(events, filename);
        }
    }
}

/**
 * Example usage:
 * Node command-line argument (e.g. `node scrape_all_months.js 2024`)
 */
const yearArg = process.argv[2] ? parseInt(process.argv[2], 10) : new Date().getFullYear();
//scrapeAllMonths(yearArg);
