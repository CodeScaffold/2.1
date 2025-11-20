import { createContext, useContext, useState } from 'react';
import { OPO_API } from '../components/settings';

type MarginApiContextType = {
    marginApiToken: string | null;
    loginMarginApi: () => Promise<boolean>;
};

const MarginApiContext = createContext<MarginApiContextType | undefined>(undefined);

export const MarginApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [marginApiToken, setMarginApiToken] = useState<string | null>(null);

    const loginMarginApi = async (): Promise<boolean> => {
        try {
            const resp = await fetch(`${OPO_API}/api/Authentication/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    Username: import.meta.env.VITE_DEV_EMAIL,
                    Password: import.meta.env.VITE_DEV_PASSWORD,
                }),
            });
            const result = await resp.json();
            if (resp.ok && result.token) {
                setMarginApiToken(result.token);
                return true;
            }
        } catch (e) {
            console.error('Margin API login failed', e);
        }
        return false;
    };

    return (
        <MarginApiContext.Provider value={{ marginApiToken, loginMarginApi }}>
            {children}
        </MarginApiContext.Provider>
    );
};

export function useMarginApi() {
    const ctx = useContext(MarginApiContext);
    if (!ctx) throw new Error('useMarginApi must live inside MarginApiProvider');
    return ctx;
}