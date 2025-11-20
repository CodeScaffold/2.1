export interface NewsEvent {
    date: string;
    time: string;
    // Add other properties as needed
}

export function parseNewsDateTimeWithTimezone(news: NewsEvent, tradeDate?: Date): Date {
    try {
        // Handle "All Day" events
        if (news.time.toLowerCase() === 'all day') {
            const dateOnly = new Date(news.date);
            dateOnly.setHours(12, 0, 0, 0);
            return dateOnly;
        }

        // Determine which timezone to use based on the date
        const newsDateOnly = new Date(news.date);
        const currentYear = newsDateOnly.getFullYear();

        // Define both timezone change dates
        const springForward = new Date(currentYear, 2, 9); // March 9th (month 2 = March)
        const fallBack = new Date(currentYear, 10, 3);     // November 3rd (month 10 = November)

        // Use trade date if available, otherwise use news date for comparison
        const referenceDate = tradeDate || newsDateOnly;

        // Determine timezone based on the date ranges
        let timezone: string;
        if (referenceDate < springForward) {
            // January 1 - March 8: Winter Time (GMT+2)
            timezone = 'GMT+0200';
        } else if (referenceDate < fallBack) {
            // March 9 - November 2: Summer Time (GMT+3)
            timezone = 'GMT+0300';
        } else {
            // November 3 - December 31: Winter Time (GMT+2)
            timezone = 'GMT+0200';
        }

        const dateTimeString = `${news.date} ${news.time} ${timezone}`;
        const parsedDate = new Date(dateTimeString);

        if (isNaN(parsedDate.getTime())) {
            console.warn('⚠️ Invalid date format for news:', news);
            return new Date();
        }

        console.log(`📅 Parsed news datetime: ${dateTimeString} -> ${parsedDate}`);
        return parsedDate;
    } catch (error) {
        console.warn('⚠️ Error parsing news date with timezone:', news, error);
        return new Date();
    }
}

export function getTimezoneInfo(referenceDate: Date): {
    timezone: string;
    display: string;
    offset: string;
    description: string;
} {
    const currentYear = referenceDate.getFullYear();

    // Define both timezone change dates
    const springForward = new Date(currentYear, 2, 9);  // March 9th
    const fallBack = new Date(currentYear, 10, 3);      // November 3rd

    // Determine timezone based on the date ranges
    let isWinterTime: boolean;
    if (referenceDate < springForward) {
        // January 1 - March 8: Winter Time
        isWinterTime = true;
    } else if (referenceDate < fallBack) {
        // March 9 - November 2: Summer Time
        isWinterTime = false;
    } else {
        // November 3 - December 31: Winter Time
        isWinterTime = true;
    }

    return {
        timezone: isWinterTime ? 'GMT+0200' : 'GMT+0300',
        display: isWinterTime ? 'GMT+2' : 'GMT+3',
        offset: isWinterTime ? '+2' : '+3',
        description: isWinterTime ? 'Winter Time' : 'Summer Time'
    };
}

/**
 * Get timezone info for a set of trades
 */
export function getTradesTimezoneInfo(trades: any[]): {
    timezone: string;
    display: string;
    offset: string;
    description: string;
    mixed: boolean;
    breakdown?: {
        gmt2Count: number;
        gmt3Count: number;
    };
} {
    if (!trades || trades.length === 0) {
        // Default to current date if no trades
        return {
            ...getTimezoneInfo(new Date()),
            mixed: false
        };
    }

    // Check if trades span across timezone change
    const tradeDates = trades.map(t => new Date(t.openTime || t.closeTime || new Date()));
    const timezoneInfos = tradeDates.map(date => getTimezoneInfo(date));

    const gmt3Count = timezoneInfos.filter(info => info.display === 'GMT+3').length;
    const gmt2Count = timezoneInfos.filter(info => info.display === 'GMT+2').length;

    const mixed = gmt3Count > 0 && gmt2Count > 0;

    if (mixed) {
        return {
            timezone: 'MIXED',
            display: 'Mixed',
            offset: '±',
            description: `${gmt3Count} GMT+3, ${gmt2Count} GMT+2`,
            mixed: true,
            breakdown: {
                gmt2Count,
                gmt3Count
            }
        };
    }

    // Use the first trade's timezone
    const firstTradeInfo = getTimezoneInfo(tradeDates[0]);
    return {
        ...firstTradeInfo,
        mixed: false
    };
}