import axios from "axios";
import { API_URL } from "../components/settings";

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

export default async function fetchAllPayouts(
  continuationToken?: string,
): Promise<{ results: getPayout[]; continuationToken?: string }> {
  const url = new URL(`${API_URL}/payouts`);

  if (continuationToken)
    url.searchParams.set("continuationToken", continuationToken);
  const res = await axios.get(url.toString(), {
    headers: {
      withCredentials: true,
      Accept: "application/json",
    },
  });
  return res.data;
}
