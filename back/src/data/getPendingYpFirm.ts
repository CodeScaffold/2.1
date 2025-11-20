import axios from "axios";
import { prisma } from "../database";
import type { Program } from "@prisma/client";

interface ProgramResult {
  prog: Program;
  accounts: any[];
}

const API_BASE_URL = "https://api.ypf.customers.sigma-ventures.cloud/client/v1";
const API_KEY = "f37a07ed60994ff3ac0398d39567f018";
/**
 * Fetch program list from external API and upsert into Program table.
 */
export async function savePrograms(): Promise<void> {
  console.log(`[savePrograms] fetching programs from API`);
  const { data: programsData } = await axios.get(`${API_BASE_URL}/programs`, {
    headers: { Accept: "application/json" },
  });
  const programs = programsData.results ?? programsData;
  for (const prog of programs) {
    await prisma.program.upsert({
      where: { id: prog.id },
      create: { id: prog.id, name: prog.name },
      update: { name: prog.name },
    });
  }
  console.log(`[savePrograms] upserted ${programs.length} programs`);
}

/**
 * Fetch all tenant accounts from external API and return those pending upgrade.
 */
export async function fetchPendingAccounts(): Promise<
  Array<{
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
    country:string;
  }>
> {
  try {
    // First, ensure programs are loaded - do this synchronously
    let programs = await prisma.program.findMany();
    if (programs.length === 0) {
      await savePrograms();
      programs = await prisma.program.findMany();
    }

    console.log(`[fetchPendingAccounts] fetched ${programs.length} programs`);

    // Create a map for more consistent lookups
    const programMap = new Map(programs.map((prog) => [prog.id, prog.name]));

    // Process programs sequentially instead of in parallel for consistent results
    let allAccounts: any[] = [];
    for (const prog of programs) {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/tenant/accounts`, {
          headers: { "X-Client-Key": API_KEY, Accept: "application/json" },
          params: { status: "UpgradePending", program: prog.name },
        });

        // Be explicit about the data structure
        const accounts = Array.isArray(data.results)
          ? data.results
          : Array.isArray(data)
            ? data
            : [];

        // Map accounts with program info
        const mappedAccounts = accounts.map(
          (acc: {
            id: any;
            firstName: any;
            lastName: any;
            email: any;
            updatedAt: any;
            programId: any;
            version: any;
            login: any;
            balance: any;
            equity: any;
            state: any;
            invoiceId: any;
            userId: any;
            country:any;
          }) => ({
            id: acc.id,
            firstName: acc.firstName,
            lastName: acc.lastName,
            email: acc.email,
            updatedAt: acc.updatedAt,
            programId: acc.programId,
            programName: prog.name,
            version: acc.version,
            login: acc.login,
            balance: acc.balance,
            equity: acc.equity,
            state: acc.state,
            invoiceId: acc.invoiceId,
            userId: acc.userId,
            country: acc.country,
          }),
        );

        allAccounts = [...allAccounts, ...mappedAccounts];
      } catch (err: unknown) {
        // Handle the unknown error type properly
        if (err instanceof Error) {
          // console.error(
          //   `Error fetching accounts for program ${prog.name}:`,
          //   err.message,
          // );
        } else {
          // console.error(
          //   `Error fetching accounts for program ${prog.name}:`,
          //   String(err),
          // );
        }
        // Continue to next program instead of adding empty results
      }
    }

    // Deduplicate accounts by ID (this part is good in your original code)
    const unique = [];
    const seen = new Set();
    for (const acc of allAccounts) {
      if (!seen.has(acc.id)) {
        seen.add(acc.id);
        unique.push(acc);
      }
    }

    console.log(
      `[fetchPendingAccounts] returning ${unique.length} unique pending accounts`,
    );
    return unique;
  } catch (error) {
    console.error(
      "[fetchPendingAccounts] error fetching upgrade pending:",
      error,
    );
    return [];
  }
}

/**
 * Save pending accounts into the UpgradePendingAccount table via Prisma upsert.
 */
export async function savePendingAccounts(): Promise<void> {
  console.log(`[savePendingAccounts] starting at ${new Date().toISOString()}`);
  const pending = await fetchPendingAccounts();
  console.log(
    `[savePendingAccounts] fetched ${pending.length} pending accounts`,
  );
  for (const acc of pending) {
    await prisma.upgradePendingAccount.upsert({
      where: { id: acc.id },
      create: {
        id: acc.id,
        firstName: acc.firstName,
        lastName: acc.lastName,
        email: acc.email,
        updatedAt: new Date(acc.updatedAt),
        programId: acc.programId,
        programName: acc.programName,
        version: acc.version,
        login: acc.login,
        balance: acc.balance,
        equity: acc.equity,
        state: acc.state,
        invoiceId: acc.invoiceId || "",
        userId: acc.userId,
        country: acc.country,
      },
      update: {
        firstName: acc.firstName,
        lastName: acc.lastName,
        email: acc.email,
        updatedAt: new Date(acc.updatedAt),
        programId: acc.programId,
        programName: acc.programName,
        version: acc.version,
        login: acc.login,
        balance: acc.balance,
        equity: acc.equity,
        state: acc.state,
        invoiceId: acc.invoiceId || "",
        userId: acc.userId,
        country: acc.country,
      },
    });
  }
  // Remove any database entries that are no longer pending
  const pendingIds = pending.map((acc) => acc.id);
  const deleteResult = await prisma.upgradePendingAccount.deleteMany({
    where: { id: { notIn: pendingIds } },
  });
  console.log(
    `[savePendingAccounts] deleted ${deleteResult.count} stale accounts`,
  );
}
