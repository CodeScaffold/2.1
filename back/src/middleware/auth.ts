import Koa from "koa";

export function sessionAuthMiddleware() {
  return async function (ctx: Koa.Context, next: Koa.Next) {
    const user = ctx.session?.user;
    if (!user) {
      ctx.status = 403;
      ctx.body = {
        message: "You must be logged in to use this area.",
      };
      return;
    }
    // Derive agentName from the session email
    ctx.state.user = {
      ...user,
      agentName: user.email.split("@")[0],
    };
    await next();
  };
}
