import { prisma } from "../database";
import { scrapeHighImpactNewsForDay } from "./fetchForexFactory";

type ForexEvent = {
  date: string;
};

const MONTH_NAMES = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

async function findLastKnownDate(): Promise<Date | null> {
  const latestEntry = await prisma.forexNews.findFirst({
    orderBy: { createdAt: "desc" }, // Get the most recent entry
  });
  return latestEntry ? new Date(latestEntry.createdAt) : null;
}

async function scrapeDateRange(startDate: Date, endDate: Date) {
  const allEvents = [];
  let current = new Date(startDate);

  while (current <= endDate) {
    const year = current.getFullYear();
    const monthIdx = current.getMonth();
    const dayNum = current.getDate();

    const monthStr = MONTH_NAMES[monthIdx];
    const dayStr = String(dayNum);

    console.log(`\nScraping date: ${monthStr}${dayStr}.${year}`);

    try {
      const dayEvents = await scrapeHighImpactNewsForDay(
        monthStr,
        dayStr,
        year,
      );
      allEvents.push(...dayEvents);
    } catch (err) {
      console.error(`Error scraping ${monthStr}${dayStr}.${year}:`, err);
    }

    current.setDate(current.getDate() + 1);
  }

  return allEvents;
}

export async function updateData(): Promise<void> {
  try {
    let newsEntry = await prisma.forexNews.findFirst();
    let lastKnownDate: Date;

    if (
      newsEntry &&
      Array.isArray(newsEntry.data) &&
      newsEntry.data.length > 0
    ) {
      const events = (newsEntry.data as ForexEvent[]).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      lastKnownDate = new Date(events[events.length - 1].date);
      lastKnownDate.setDate(lastKnownDate.getDate() + 1);
    } else {
      lastKnownDate = new Date("2024-12-21");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (lastKnownDate >= today) {
      console.log("Your data is already up-to-date!");
      return;
    }

    console.log(
      `Scraping new data from ${lastKnownDate.toDateString()} to ${today.toDateString()}...`,
    );
    const newEvents = await scrapeDateRange(lastKnownDate, today);

    if (newEvents.length) {
      if (newsEntry && Array.isArray(newsEntry.data)) {
        const updatedData = [...newsEntry.data, ...newEvents];
        await prisma.forexNews.update({
          where: { id: newsEntry.id },
          data: { data: updatedData },
        });
        console.log(
          `Database updated with ${newEvents.length} new events appended to the bottom.`,
        );
      } else {
        await prisma.forexNews.create({
          data: { data: newEvents },
        });
        console.log(`Database created with ${newEvents.length} events.`);
      }
    } else {
      console.log("No new events to store.");
    }
  } catch (error) {
    console.error("Error updating Forex news:", error);
  }
}
