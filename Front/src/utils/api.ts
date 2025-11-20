import { API_URL } from "../components/settings.ts";

export interface Payout {
  id: string;
  accountId: string;
  amount: number;
  transferAmount: number;
  profitSplit: number;
  email: string;
  fullName: string;
  login: string;
  payoutDetails: {
    currency: string;
    walletAddress: string;
  };
  state: string;
  rejectionReason?: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  type: string;
  paymentAgent?: string | null;
}

export interface UpgradePendingAccount {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  updatedAt: string;
  programId: string;
  programName: string;
  version: string;
  login: string;
  balance: number;
  equity: number;
  state: string;
  invoiceId?: string;
  userId: string;
}

// ========================================
// UNIFIED BACKEND API CALLS (Session-based)
// ========================================

/**
 * Makes API calls to YOUR backend with session cookies
 * This is the ONLY function that should be used for backend API calls
 */
const backendApiCall = async (endpoint: string, options: RequestInit = {}) => {
  console.log(`🔧 API Call: ${endpoint}`);

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: 'include', // This sends session cookies automatically
    mode: 'cors', // Explicitly set CORS mode
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
  });

  console.log(`🔧 API Response: ${endpoint} - ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`🔧 API Error: ${endpoint} - ${response.status}: ${errorText}`);
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

// ========================================
// ALL YOUR BACKEND ENDPOINTS
// ========================================

export async function getReports(): Promise<any[]> {
  return backendApiCall('/forfxreports');
}

export async function getBackendPayouts(): Promise<any[]> {
  return backendApiCall('/payouts');
}

export async function getUpgradePendingFromBackend(): Promise<any[]> {
  return backendApiCall('/upgrade-pending');
}

export async function getNews(): Promise<any[]> {
  return backendApiCall('/news');
}

export async function getLeverage(): Promise<any[]> {
  return backendApiCall('/leverage');
}

export async function getClients(): Promise<any[]> {
  return backendApiCall('/clients');
}

export async function getClientById(id: string): Promise<any> {
  return backendApiCall(`/clients/${id}`);
}

export async function getClientByLogin(login: string): Promise<any> {
  return backendApiCall(`/client-by-login/${login}`);
}

export async function createReport(reportData: any): Promise<any> {
  return backendApiCall('/forfxreports', {
    method: 'POST',
    body: JSON.stringify(reportData),
  });
}

export async function updatePayout(id: string, updateData: any): Promise<any> {
  return backendApiCall(`/payouts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updateData),
  });
}

export async function deleteReport(id: number): Promise<void> {
  await backendApiCall(`/forfxreports/${id}`, {
    method: 'DELETE',
  });
}

export async function getOpoToken(): Promise<{token: string, expiresIn?: number}> {
  return backendApiCall('/opo-token');
}

// ========================================
// EXTERNAL API CALLS (Keep exactly the same)
// ========================================

/**
 * Fetches all payouts data from the API with pagination
 */
export const fetchPayoutsData = async (): Promise<Payout[]> => {
  let token: string | null = null;
  let allResults: Payout[] = [];
  const seenTokens = new Set<string>();

  try {
    let pageCount = 0;
    const maxPages = 100; // Safety limit to prevent infinite loops

    while (pageCount < maxPages) {
      pageCount++;
      const url = new URL(
          "https://api.ypf.customers.sigma-ventures.cloud/client/v1/payouts",
      );

      if (token) url.searchParams.set("continuationToken", token);

      const res = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}: ${await res.text()}`);
      }

      const json = await res.json();

      // Check if results is an array and not empty before concatenating
      if (Array.isArray(json.results) && json.results.length > 0) {
        allResults = allResults.concat(json.results);
      } else {
        console.log("No results received in this page, ending pagination");
        break;
      }

      // Get next continuation token
      token = json.continuationToken || null;

      // If no token or we've seen this token before, we're done
      if (!token) {
        console.log("No continuation token received, ending pagination");
        break;
      }

      if (seenTokens.has(token)) {
        break;
      }

      seenTokens.add(token);
    }

    console.log(`Total records fetched: ${allResults.length}`);
    return allResults;
  } catch (err) {
    if (err instanceof Error) {
      console.error("Error fetching payouts:", err.message);
    } else {
      console.error("Error fetching payouts:", String(err));
    }
    return [];
  }
};

/**
 * Gets payouts data with caching
 */
export const getPayoutsData = async (): Promise<Payout[]> => {
  const cached = localStorage.getItem("payoutsData");
  const lastFetched = localStorage.getItem("payoutsLastFetched");
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  // Use cache if it exists and is less than 1 hour old
  if (cached && lastFetched && parseInt(lastFetched) > oneHourAgo) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      console.error("Failed to parse cached payouts:", e);
    }
  }

  // Fetch fresh data
  return await fetchPayoutsData();
};

/**
 * Fetches pending upgrade accounts
 */
export const fetchPendingUpgrades = async (): Promise<
    UpgradePendingAccount[]
> => {
  try {
    const response = await fetch(
        `${process.env.API_URL || "/api"}/upgrade-pending`,
        {
          credentials: 'include',
          headers: {
            Accept: "application/json",
          },
        },
    );

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    if (err instanceof Error) {
      console.error("Error fetching pending upgrades:", err.message);
    } else {
      console.error("Error fetching pending upgrades:", String(err));
    }
    return [];
  }
};