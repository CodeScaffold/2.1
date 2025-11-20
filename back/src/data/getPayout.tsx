import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface getPayout {
  id: string;
  accountId: string;
  amount: number;
  transferAmount: number;
  profitSplit: number;
  email: string;
  fullName: string;
  login: string;
  payoutDetails: any; // Or a more specific type if known
  state: string;
  rejectionReason?: string;
  userId: string;
  createdAt: string; // ISO format if coming from API
  updatedAt: string;
  paymentAgent?: string;
  [key: string]: any;
}

/**
 * Fetch all payout records from the YourPropFirm API using continuation token pagination.
 */
export async function fetchAllPayouts(): Promise<getPayout[]> {
  const apiKey = "f37a07ed60994ff3ac0398d39567f018";
  const payouts: getPayout[] = [];
  const seenTokens = new Set<string>();
  let token: string | null = null;
  let pageCount = 0;
  const maxPages = 100;

  try {
    while (pageCount < maxPages) {
      pageCount++;
      const url = new URL(
        "https://api.ypf.customers.sigma-ventures.cloud/client/v1/payouts",
      );
      if (token) url.searchParams.set("continuationToken", token);

      const res = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "X-Client-Key": apiKey,
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}: ${await res.text()}`);
      }

      const json = await res.json();
      const results = json.results;

      if (Array.isArray(results) && results.length > 0) {
        payouts.push(...results);
      } else {
        console.log("No results received in this page, ending pagination");
        break;
      }

      token = json.continuationToken || null;

      if (!token) {
        console.log("No continuation token, ending pagination");
        break;
      }

      if (seenTokens.has(token)) {
        console.log("Continuation token repeated, ending pagination");
        break;
      }

      seenTokens.add(token);
    }

    console.log(`Total payouts fetched: ${payouts.length}`);
    return payouts;
  } catch (error) {
    console.error("Error fetching payout records:", error);
    return [];
  }
}

// Example usage:
(async () => {
  const allPayouts = await fetchAllPayouts();
  console.log(`Total payouts fetched: ${allPayouts.length}`);

  const unique = new Set<string>();
  const filteredPayouts = allPayouts.filter((p) => {
    if (unique.has(p.id)) return false;
    unique.add(p.id);
    return true;
  });

  for (const payout of filteredPayouts) {
    try {
      const existing = await prisma.payout.findUnique({
        where: { id: payout.id },
      });
      if (!existing) {
        await prisma.payout.create({
          data: {
            id: payout.id,
            userId: payout.userId,
            createdAt: new Date(payout.createdAt),
            fullName: payout.fullName,
            email: payout.email,
            accountId: payout.accountId,
            login: payout.login,
            amount: payout.amount,
            transferAmount: payout.transferAmount,
            profitSplit: payout.profitSplit,
            payoutDetails: payout.payoutDetails,
            state: payout.state,
            rejectionReason: payout.rejectionReason ?? null,
          },
        });
      }
    } catch (err) {
      console.error(`Failed to save payout ${payout.id}:`, err);
    }
  }
  console.log("All payouts saved to the database.");
  await prisma.$disconnect();
})();
