import fs from 'fs';
import { scrapeHighImpactNewsForDay } from './fetchForexFactory.mjs';
// ^ Adjust the path if needed

/**
 * The JSON file to update.
 */
const FILENAME = 'high_impact_news.json';

// Month name lookup for building the URL
const MONTH_NAMES = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

/**
 * Given a date string like "Wed Jan 1 2025" or "Jan 1 2025",
 * returns a JS Date object at local midnight.
 */
function parseFullDate(dateStr) {
    if (!dateStr) return null;

    // e.g. "Wed Jan 1 2025" => ["Wed","Jan","1","2025"]
    // or "Jan 1 2025" => ["Jan","1","2025"]
    const parts = dateStr.split(' ').filter(Boolean);

    // If there's a weekday, discard it
    if (parts.length === 4) {
        parts.shift(); // remove "Wed"
    }
    // Now we expect [Month, Day, Year]
    if (parts.length < 3) {
        return null;
    }

    const [monthStr, dayStr, yearStr] = parts;
    const monthIndex = MONTH_NAMES.indexOf(monthStr.toLowerCase());
    const day = parseInt(dayStr, 10);
    const year = parseInt(yearStr, 10);

    if (monthIndex < 0 || !day || !year) return null;

    const d = new Date(year, monthIndex, day, 0, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d;
}

/**
 * Finds the *latest* date in the existing events by parsing e.date.
 */
function findLastKnownDate(events) {
    if (!events.length) return null;

    let maxDate = null;
    for (const e of events) {
        const parsed = parseFullDate(e.date);
        if (parsed && (!maxDate || parsed > maxDate)) {
            maxDate = parsed;
        }
    }
    return maxDate;
}

/**
 * Scrapes day-by-day (sequentially, no concurrency) from startDate to endDate inclusive.
 */
async function scrapeDateRange(startDate, endDate) {
    const allEvents = [];
    let current = new Date(startDate); // clone so we don't mutate original

    while (current <= endDate) {
        const year = current.getFullYear();
        const monthIdx = current.getMonth();
        const dayNum = current.getDate();

        const monthStr = MONTH_NAMES[monthIdx];
        const dayStr = String(dayNum);

        // Log which date we're doing (optional)
        console.log(`\nScraping date: ${monthStr}${dayStr}.${year}`);

        try {
            // *Await* to ensure only one day at a time
            const dayEvents = await scrapeHighImpactNewsForDay(monthStr, dayStr, year);
            allEvents.push(...dayEvents);
        } catch (err) {
            // If one day fails, log it and continue to the next day
            console.error(`Error scraping ${monthStr}${dayStr}.${year}:`, err);
            // If you prefer to stop on first error, do: `throw err;`
        }

        // Move to next calendar day
        current.setDate(current.getDate() + 1);
    }

    return allEvents;
}

async function updateData() {
    // 1) Read existing JSON
    let existingData = [];
    if (fs.existsSync(FILENAME)) {
        const fileContent = fs.readFileSync(FILENAME, 'utf8');
        existingData = JSON.parse(fileContent);
    }

    // 2) Determine the last known date
    let lastKnownDate = findLastKnownDate(existingData);

    // If no data in the file, define a fallback
    if (!lastKnownDate) {
        // For example, Dec 21 2024
        lastKnownDate = new Date('2024-12-21');
    } else {
        // Advance to the next day so we don't re-scrape the last known date
        lastKnownDate.setDate(lastKnownDate.getDate() + 1);
    }

    // 3) Compute "today" at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If we already have data up to or past today, do nothing
    if (lastKnownDate > today) {
        console.log('Your data is already up-to-date!');
        return;
    }

    console.log(
        `Scraping new data from ${lastKnownDate.toDateString()} to ${today.toDateString()}...`
    );

    // 4) Scrape day by day
    const newEvents = await scrapeDateRange(lastKnownDate, today);

    // 5) Merge and write out
    const updatedData = [...existingData, ...newEvents];
    fs.writeFileSync(FILENAME, JSON.stringify(updatedData, null, 2));

    console.log(
        `\nUpdate complete! Added ${newEvents.length} events. Total is now ${updatedData.length}.`
    );
}

// 6) Run the update
updateData();
