import Koa from "koa";
import Router from "@koa/router";
import { prisma } from "../database";
import { jwtAuthMiddleware } from "../middleware/auth";

const router = new Router();
const auth = jwtAuthMiddleware();
router.get("/account", auth, async (ctx: Koa.Context, next: Koa.Next) => {
  const query = await prisma.user.findUnique({
    where: { id: ctx.state.user.id },
  });
  if (!query) {
    ctx.status = 400;
    ctx.body = {
      message: "User not found",
    };
    return;
  }
  ctx.body = { id: query.id, email: query.email };
});

export default router;
