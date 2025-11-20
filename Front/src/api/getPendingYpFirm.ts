// import axios from "axios";
// import { API_URL } from "../components/settings";
//
// export interface PendingAccount {
//   id: string;
//   firstName: string;
//   lastName: string;
//   email: string;
//   login: string;
//   programName: string;
//   version: string;
//   balance: number;
//   equity: number;
//   updatedAt: string;
// }
//
// export async function fetchUpgradePendingAccounts(): Promise<PendingAccount[]> {
//   // Return cached data if present
//   const cacheKey = "pendingAccounts";
//   const raw = localStorage.getItem(cacheKey);
//   if (raw) {
//     try {
//       return JSON.parse(raw) as PendingAccount[];
//     } catch {
//       // fall back to network on parse error
//     }
//   }
//
//   // No valid cache: fetch from API
//   const res = await axios.get(`${API_URL}/upgrade-pending`, {
//     headers: { Accept: "application/json" },
//   });
//   const data = res.data as PendingAccount[];
//   // Cache the fresh data
//   localStorage.setItem(cacheKey, JSON.stringify(data));
//   return data;
// }
