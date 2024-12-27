import Koa from "koa";
import passport from "koa-passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import { prisma } from "../database/";

export default function setupPassport(app: Koa) {
  app.use(passport.initialize());

  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email: string, password: string, done: Function) => {
        const user = await prisma.user.findUnique({ where: { email: email } });
        if (!user) return done(null, false);

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return done(null, false);

        return done(null, user);
      },
    ),
  );
}
