/**
 * Authentication Module
 * Simple session-based auth using Passport.js (already in package.json)
 */
import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "./storage";
import { createHash } from "crypto";

// Simple password hashing (for a single-user app, this is fine)
function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function setupAuth(app: Express) {
  // Session config
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "ctc-business-hub-secret-change-me",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production" && process.env.RAILWAY_ENVIRONMENT === "production",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // Passport local strategy
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) return done(null, false, { message: "Invalid email or password" });
          if (user.passwordHash !== hashPassword(password)) {
            return done(null, false, { message: "Invalid email or password" });
          }
          return done(null, user);
        } catch (e) {
          return done(e);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUserById(id);
      done(null, user || false);
    } catch (e) {
      done(e);
    }
  });

  // Auth routes
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ error: info?.message || "Login failed" });
      req.logIn(user, (err) => {
        if (err) return next(err);
        return res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) return res.json({ authenticated: false });
    const user = req.user as any;
    res.json({ authenticated: true, id: user.id, email: user.email, name: user.name, role: user.role });
  });

  // Setup / seed admin user endpoint (only works if no users exist)
  app.post("/api/auth/setup", async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "email, password, and name are required" });
    }

    // Check if any users exist
    const existing = await storage.getUserByEmail(email);
    if (existing) return res.status(400).json({ error: "User already exists" });

    const user = await storage.createUser({
      email,
      passwordHash: hashPassword(password),
      name,
      role: "admin",
    });

    res.status(201).json({ id: user.id, email: user.email, name: user.name });
  });
}

// Middleware to protect routes (use after auth is set up)
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Skip auth check if no SESSION_SECRET is set (dev mode or not configured yet)
  if (!process.env.SESSION_SECRET) return next();
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: "Not authenticated" });
}
