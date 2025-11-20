import Koa from "koa";
import passport from "koa-passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import { prisma } from "../database/";
import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions } from 'passport-jwt';

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

  // JWT strategy for token authentication
  const jwtOptions: StrategyOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET!,
  };
  passport.use(
    'jwt',
    new JwtStrategy(jwtOptions, async (payload, done) => {
      try {
        // payload.id should match the user's ID
        const user = await prisma.user.findUnique({ where: { id: payload.id } });
        if (!user) return done(null, false);
        return done(null, user);
      } catch (err) {
        return done(err, false);
      }
    })
  );
}
