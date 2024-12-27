import process from "process";
import jwt from "jsonwebtoken";
import Koa from "koa";

export function jwtAuthMiddleware() {
  return async function (ctx: Koa.Context, next: Koa.Next) {
    const authHeader = ctx.headers.authorization;
    if (!authHeader) {
      ctx.status = 403;
      ctx.body = {
        message: "You must be logged in to use this area.",
      };
      return;
    }
    const token = authHeader.split(" ")[1];
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (err) {
      ctx.status = 401;
      ctx.body = { error: "Invalid token" };
      return;
    }
    ctx.state.user = payload;
    await next();
  };
}
