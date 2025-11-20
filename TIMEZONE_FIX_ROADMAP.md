# Timezone Fix Implementation Roadmap

## Overview
This document provides a clear structure for implementing the timezone fix that handles GMT+2 vs GMT+3 based on the November 3rd cutoff date for news checking and margin usage calculations.

## Files That Need Modification

### 1. **Create New Utility Function** (REQUIRED)
**File to create:** `/Users/arash/WebstormProjects/Tools/Front/src/utils/timezoneUtils.ts`

**Purpose:** Create a centralized timezone-aware date parsing function

**Code to add:**
```typescript
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
        
        // November 3rd cutoff for the given year
        const timezoneChangeDate = new Date(currentYear, 10, 3); // Month is 0-indexed, so 10 = November
        
        // Use trade date if available, otherwise use news date for comparison
        const referenceDate = tradeDate || newsDateOnly;
        
        // Before Nov 3rd: GMT+3, After Nov 3rd: GMT+2
        const timezone = referenceDate < timezoneChangeDate ? 'GMT+0300' : 'GMT+0200';
        
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
```

---

### 2. **Update HedgeTradeUI News Processing**
**File:** `/Users/arash/WebstormProjects/Tools/Front/src/components/rules/useHedgeTradeAnalysis.tsx`

**Function to find and replace:** `parseNewsDateTime` (around line 116-140)

**Action:** Replace the existing `parseNewsDateTime` function with:
```typescript
import { parseNewsDateTimeWithTimezone } from '../../utils/timezoneUtils';

function parseNewsDateTime(news: NewsEvent, tradeDate?: Date): Date {
    return parseNewsDateTimeWithTimezone(news, tradeDate);
}
```

**Usage to update:** In the news processing loop (around line 474), change:
```typescript
// FROM:
const newsDateTime = parseNewsDateTime(newsItem);

// TO:
const newsDateTime = parseNewsDateTime(newsItem, new Date(trades[0]?.openTime));
```

---

### 3. **Update Margin Usage Calculations**
**File:** `/Users/arash/WebstormProjects/Tools/Front/src/utils/metaParser.ts`

**Function:** `calculateMarginViolations` (around line 523)

**Action:** Replace the hardcoded timezone line:
```typescript
// Add import at the top
import { parseNewsDateTimeWithTimezone } from './timezoneUtils';

// FIND this line (around line 523):
const newsDateTime = new Date(`${news.date} ${news.time} GMT+0300`);

// REPLACE with:
const newsDateTime = parseNewsDateTimeWithTimezone(news, trades[0]?.openTime);
```

---

## Implementation Steps

1. **Step 1:** Create the new utility file `timezoneUtils.ts`
2. **Step 2:** Update `useHedgeTradeAnalysis.tsx` - import the utility and modify parseNewsDateTime
3. **Step 3:** Update `metaParser.ts` - import the utility and replace the hardcoded timezone line
4. **Step 4:** Test with statements before November 3rd (should use GMT+3)
5. **Step 5:** Test with statements after November 3rd (should use GMT+2)

## Expected Behavior

- **Before November 3rd:** All news times will be interpreted as GMT+3
- **After November 3rd:** All news times will be interpreted as GMT+2
- **Automatic detection:** The system will automatically determine which timezone to use based on the date
- **Console logging:** You'll see timezone information in browser console for debugging

## Testing

After implementation:
1. Load statements from before November 3rd - check console logs show GMT+0300
2. Load statements from after November 3rd - check console logs show GMT+0200
3. Compare results with your previous manual timezone adjustments
4. Verify both HedgeTradeUI and margin calculations use consistent timezones

## Files Summary
- **CREATE:** `/Users/arash/WebstormProjects/Tools/Front/src/utils/timezoneUtils.ts`
- **MODIFY:** `/Users/arash/WebstormProjects/Tools/Front/src/components/rules/useHedgeTradeAnalysis.tsx`
- **MODIFY:** `/Users/arash/WebstormProjects/Tools/Front/src/utils/metaParser.ts`

Total files to work with: **3 files** (1 new, 2 modifications)