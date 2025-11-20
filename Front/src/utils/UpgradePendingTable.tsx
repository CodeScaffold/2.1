import React, { useState, useEffect } from "react";
import { UpgradePendingAccounts } from "../components/UpgradePendingAccounts";
import { UpgradePendingAccount } from "./types";
import { API_URL } from "../components/settings";
import { useOpoAuth } from "../OpoAuth";

export const UpgradePendingTable: React.FC = () => {
  const [accounts, setAccounts] = useState<UpgradePendingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, isLoading: authLoading } = useOpoAuth();

  useEffect(() => {
    // Don't fetch data until authentication is confirmed
    if (authLoading || !isAuthenticated) {
      setLoading(authLoading);
      return;
    }

    const loadPendingAccounts = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔍 Fetching upgrade pending accounts...');

        const response = await fetch(`${API_URL}/upgrade-pending`, {
          method: 'GET',
          credentials: 'include',
          mode: 'cors',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ Successfully fetched pending accounts:', data.length);
        setAccounts(data);
      } catch (err) {
        console.error('❌ Failed to load pending accounts:', err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An error occurred while fetching pending accounts');
        }
      } finally {
        setLoading(false);
      }
    };

    loadPendingAccounts();
  }, [authLoading, isAuthenticated]); // Re-run when auth status changes

  // Show loading while auth is being checked
  if (authLoading) {
    return <div style={{ padding: 16 }}>Checking authentication...</div>;
  }

  // Show error if not authenticated (shouldn't happen due to ProtectedRoute, but good fallback)
  if (!isAuthenticated) {
    return <div style={{ padding: 16, color: 'red' }}>Authentication required</div>;
  }

  // Show loading while data is being fetched
  if (loading) {
    return <div style={{ padding: 16 }}>Loading pending accounts...</div>;
  }

  // Show error if data fetch failed
  if (error) {
    return (
        <div style={{ padding: 16, color: 'red' }}>
          Error: {error}
          <br />
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
    );
  }

  return <UpgradePendingAccounts accounts={accounts} />;
};