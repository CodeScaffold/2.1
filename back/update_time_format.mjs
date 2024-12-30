import puppeteer from 'puppeteer';
import fs from 'fs';

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

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function adjustTimeToGMT2(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return timeStr;
    if (timeStr.toLowerCase() === 'all day') return timeStr;

    const [hoursStr, minutesStr] = timeStr.split(':');
    if (!hoursStr || !minutesStr) return timeStr;

    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    hours -= 1; // Adjust to GMT+2
    if (hours < 0) hours = 23;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

async function scrapeHighImpactNewsForDay(month, day) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

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
            const dayBreaker = row.querySelector('.calendar__row--day-breaker .calendar__cell span');
            if (dayBreaker) {
                currentDate = dayBreaker.textContent.trim();
                return;
            }

            const time = row.querySelector('.calendar__time span')?.textContent?.trim() || '';
            const currency = row.querySelector('.calendar__currency span')?.textContent?.trim() || '';
            const eventTitle = row.querySelector('.calendar__event-title')?.textContent?.trim() || '';
            const impact = row.querySelector('.calendar__impact span')?.title || '';

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

    // Convert times to 24-hour GMT+2
    const formattedEvents = events.map(event => ({
        ...event,
        time: adjustTimeToGMT2(convertTo24HourFormat(event.time)),
    }));

    await browser.close();
    return formattedEvents;
}

async function scrapeNextWeek() {
    const today = new Date();
    const daysToScrape = 7;
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const filename = 'high_impact_news.json';
    let allEvents = [];

    // Load existing data
    if (fs.existsSync(filename)) {
        const fileContent = fs.readFileSync(filename, 'utf-8');
        allEvents = JSON.parse(fileContent);
        console.log(`Loaded existing data with ${allEvents.length} records.`);
    }

    for (let i = 0; i < daysToScrape; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);

        const month = monthNames[date.getMonth()];
        const day = date.getDate().toString();

        const events = await scrapeHighImpactNewsForDay(month, day);
        allEvents.push(...events);
    }

    // Append new data to the file
    fs.writeFileSync(filename, JSON.stringify(allEvents, null, 2));
    console.log(`Updated ${filename} with ${allEvents.length} total events.`);
}

// Scrape the next week's news
scrapeNextWeek();
