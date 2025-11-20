import puppeteer from "puppeteer";
import * as fs from "fs";
import { URL } from "url";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

function convertTo24HourFormat(timeStr: string) {
  if (!timeStr) return timeStr;
  if (timeStr.toLowerCase() === "all day") return timeStr;

  const match = timeStr.match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
  if (!match) return timeStr;

  const [, hoursStr, minutesStr, modifier] = match;
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (modifier.toLowerCase() === "pm" && hours !== 12) {
    hours += 12;
  } else if (modifier.toLowerCase() === "am" && hours === 12) {
    hours = 0;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function adjustTimeToServerTime(
  timeStr: string,
  eventDateStr: string,
  year: number,
) {
  if (!timeStr || timeStr.toLowerCase() === "all day") return timeStr;

  const time24 = convertTo24HourFormat(timeStr);
  // Construct a datetime string, e.g., "Mar 27 2025 09:30"
  const dateTimeStr = `${eventDateStr} ${year} ${time24}`;
  const inputFormat = "MMM D YYYY HH:mm";

  // Parse the datetime assuming the event time is in GMT+3 (using "Europe/Istanbul")
  const eventTime = dayjs.tz(dateTimeStr, inputFormat, "Europe/Istanbul");

  return eventTime.format("HH:mm");
}

export async function scrapeHighImpactNewsForDay(
  month: string,
  day: string | number,
  year: number,
) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  const url = `https://www.forexfactory.com/calendar?day=${month}${day}.${year}`;
  console.log(`Opening URL: ${url}`);

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
  );
  await page.setExtraHTTPHeaders({
    "Accept-Language": "en-US,en;q=0.9",
  });

  await page.goto(url, { waitUntil: "domcontentloaded" });
  console.log(`Scraping high-impact news for ${month}${day}, ${year}...`);

  let events = await page.evaluate(() => {
    const rows = document.querySelectorAll("tr.calendar__row");
    const highImpactEvents: any[] = [];
    let currentDate = "";
    let lastTime = "";

    rows.forEach((row) => {
      const dayBreaker = row.querySelector(
        ".calendar__row--day-breaker .calendar__cell span",
      );
      if (dayBreaker) {
        currentDate = dayBreaker?.textContent?.trim() ?? "";
        lastTime = "";
        return;
      }

      let time =
        row.querySelector(".calendar__time span")?.textContent?.trim() || "";
      const currency =
        row.querySelector(".calendar__currency span")?.textContent?.trim() ||
        "";
      const eventTitle =
        row.querySelector(".calendar__event-title")?.textContent?.trim() || "";
      const impact =
        row.querySelector(".calendar__impact span")?.getAttribute("title") ||
        "";
      if (!time) {
        time = lastTime;
      } else {
        lastTime = time;
      }

      if (
        impact === "High Impact Expected" &&
        currentDate &&
        currency &&
        eventTitle
      ) {
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

  await browser.close();

  events = events.map((evt) => {
    const adjustedTime = adjustTimeToServerTime(evt.time, evt.date, year);
    return {
      ...evt,
      date: `${evt.date} ${year}`,
      time: adjustedTime,
    };
  });

  console.log(
    `Scraped ${events.length} high-impact events for ${month}${day}, ${year}.`,
  );
  return events;
}

async function appendDataToFile(
  data: string | any[],
  filename: string | number | Buffer | URL,
) {
  let existingData = [];
  if (fs.existsSync(String(filename))) {
    const fileContent = fs.readFileSync(filename, "utf8");
    existingData = JSON.parse(fileContent);
  }

  const updatedData = [...existingData, ...data];
  fs.writeFileSync(filename, JSON.stringify(updatedData, null, 2));

  console.log(`Appended ${data.length} events to ${filename}`);
}

async function scrapeAllMonths(year: number) {
  const months = [
    { name: "jan", days: 31 },
    { name: "feb", days: 28 },
    { name: "mar", days: 31 },
    { name: "apr", days: 30 },
    { name: "may", days: 31 },
    { name: "jun", days: 30 },
    { name: "jul", days: 31 },
    { name: "aug", days: 31 },
    { name: "sep", days: 30 },
    { name: "oct", days: 31 },
    { name: "nov", days: 30 },
    { name: "dec", days: 31 },
  ];

  const filename = "high_impactnews.json";

  for (const month of months) {
    if (month.name === "feb" && year % 4 === 0) {
      month.days = 29;
    }
    for (let day = 1; day <= month.days; day++) {
      const events = await scrapeHighImpactNewsForDay(month.name, day, year);
      await appendDataToFile(events, filename);
    }
  }
}

const yearArg = process.argv[2]
  ? parseInt(process.argv[2], 10)
  : new Date().getFullYear();
