import { Prisma } from "@prisma/client";
import { prisma } from "../database";
import Router from "@koa/router";
import { sessionAuthMiddleware } from "../middleware/auth";
import { convertDate } from "../functions";
import { Parser } from "json2csv";

const results = new Router();
const auth = sessionAuthMiddleware();

results.get("/result", auth, async (ctx) => {
  const paginate = ctx.query.paginate !== "false";
  const page = parseInt(ctx.query.page as string) || 1;
  const pageSize = parseInt(ctx.query.pageSize as string) || 10;
  let skip = (page - 1) * pageSize;

  const {
    clientId,
    account,
    ticket,
    pair,
    closeTimeDate,
    startDate,
    endDate,
    reason,
    compensate,
    version,
  } = ctx.query;

  const start = String(startDate);
  const end = String(endDate);

  const includeArchived = ctx.query.includeArchived === "true";

  const whereClause: Prisma.ResultWhereInput = {
    ...(includeArchived ? { archivedAt: { not: null } } : { archivedAt: null }),
    ...(clientId
      ? { clientId: { contains: String(clientId), mode: "insensitive" } }
      : {}),
    ...(account
      ? { account: { contains: String(account), mode: "insensitive" } }
      : {}),
    ...(ticket
      ? { ticket: { contains: String(ticket), mode: "insensitive" } }
      : {}),
    ...(pair ? { pair: { contains: String(pair), mode: "insensitive" } } : {}),
    ...(reason ? { reason: { equals: reason as any } } : {}),
    ...(compensate ? { compensate: parseFloat(compensate as string) } : {}),
    ...(startDate && endDate
      ? {
          closeTimeDate: {
            gte: new Date(convertDate(start)),
            lte: new Date(convertDate(end)),
          },
        }
      : {}),
  };

  const results = await prisma.result.findMany({
    where: whereClause,
    skip: paginate ? skip : 0,
    take: paginate ? pageSize : undefined,
    orderBy: { id: "desc" },
  });

  let csv = "";
  if (results.length > 0) {
    const fields = Object.keys(results[0]);
    const json2csvParser = new Parser({ fields });
    csv = json2csvParser.parse(results);
  }
  try {
    const totalResultsCount = await prisma.result.count({ where: whereClause });
    ctx.body = { results, totalResultsCount, csv };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      error: "Server Error",
      details: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

results.patch("/result/:id", async (ctx) => {
  const { id } = ctx.params;
  const { firstCheck, secondCheck } = ctx.request.body as any;

  try {
    const result = await prisma.result.update({
      where: { id: Number(id) },
      data: {
        firstCheck,
        secondCheck,
      },
    });

    if (secondCheck) {
      await prisma.result.update({
        where: { id: Number(id) },
        data: {
          archivedAt: new Date(),
        },
      });
    }

    ctx.body = result;
  } catch (error: unknown) {
    console.error("Failed to update result:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    ctx.status = 500;
    ctx.body = { error: "Failed to update result", details: message };
  }
});

results.post("/result", async (ctx) => {
  const body = ctx.request.body as any;
  if (!body.reason) {
    ctx.status = 400;
    ctx.body = "Reason is required!";
    return;
  }

  const existingData = await prisma.result.findUnique({
    where: {
      ticket: body.ticket,
    },
  });

  if (existingData) {
    ctx.status = 409;
    ctx.body = {
      message: "This ticket is already exist in database",
    };
    return;
  }

  const {
    clientId,
    account,
    ticket,
    tp,
    sl,
    pair,
    lot,
    openPrice,
    closePrice,
    closeTimeDate,
    reason,
    commend,
    difference,
    compensateInUsd,
    version,
  } = ctx.request.body as any;

  let dateToSave;
  if (typeof closeTimeDate === "string") {
    dateToSave = new Date(closeTimeDate);
  }

  try {
    const savedResult = await prisma.result.create({
      data: {
        clientId,
        account,
        ticket,
        pair,
        lot: parseFloat(lot),
        openPrice: parseFloat(openPrice),
        tp: parseFloat(tp),
        sl: parseFloat(sl),
        closePrice: parseFloat(closePrice),
        closeTimeDate: dateToSave,
        reason,
        commend,
        difference,
        compensate: compensateInUsd,
        version,
      },
    });
    ctx.status = 200;
    ctx.body = savedResult;
  } catch (error) {
    console.error("Failed to save result:", error);
    const message =
      typeof error === "object" && error !== null && "message" in error
        ? error.message
        : "Unknown error";
    ctx.status = 500;
    ctx.body = { error: "Failed to save data", details: message };
  }
});

results.put("/ticket/:id", async (ctx) => {
  await prisma.result.update({
    where: { id: +ctx.params.id },
    data: {
      archivedAt: null,
      firstCheck: false,
      secondCheck: false,
    },
  });
  ctx.body = {
    message: "Done",
  };
});

export default results;
