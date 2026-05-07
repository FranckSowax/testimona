import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import favicon from 'serve-favicon';
import path from 'path';
import yamljs from 'yamljs';
import * as http from 'http';

import { Routes } from './routes/_.routes';

const app = express();

// Security headers
app.use(helmet());

// Body parsing with size limit
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Trust proxy (for reverse proxy / load balancer)
app.set('trust proxy', 1);

// HTTPS redirect (production)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.hostname}${req.url}`);
    }
    next();
  });
}

// CORS configuration
const whitelist = process.env.WHITELIST_URL ? process.env.WHITELIST_URL.split('|') : [];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || whitelist.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'PUT', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);

// Rate limiting on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/register', authLimiter);
app.use('/auth', authLimiter);

// Serve Favicon
app.use(favicon(path.join(__dirname, '/assets/favicon.ico')));

// Swagger UI (disabled in production)
if (process.env.NODE_ENV !== 'production') {
  const swaggerYamlDocument = yamljs.load(path.join(__dirname, '/assets/swagger.yaml'));
  app.use('/api/testimona/v1', swaggerUi.serve, swaggerUi.setup(swaggerYamlDocument));
}

// Health check endpoint (DB + Redis + Supabase, gracefully gated on env)
app.get('/health', async (_req, res) => {
  const checks: Record<string, 'ok' | 'down' | 'skipped'> = {
    process: 'ok',
  };

  // DB check (Prisma)
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();
    checks.db = 'ok';
  } catch {
    checks.db = 'down';
  }

  // Redis check
  try {
    const { RedisService } = await import('./services/commons/redis.service');
    const ok = await RedisService.getInstance().keyExists(['health']).catch(() => null);
    checks.cache = ok === null ? 'down' : 'ok';
  } catch {
    checks.cache = 'down';
  }

  // Supabase check (only if configured)
  try {
    const { isSupabaseConfigured, getSupabaseAdmin } = await import(
      './services/commons/supabase.service'
    );
    if (!isSupabaseConfigured()) {
      checks.supabase = 'skipped';
    } else {
      const { error } = await getSupabaseAdmin().auth.admin.listUsers({ perPage: 1 });
      checks.supabase = error ? 'down' : 'ok';
    }
  } catch {
    checks.supabase = 'down';
  }

  const allOk = Object.values(checks).every((v) => v === 'ok' || v === 'skipped');
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.GIT_SHA ?? 'dev',
    checks,
  });
});

app.get('/', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

new Routes(app);

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

const port = process.env.PORT || 3000;
const server = http.createServer(app);
server.listen(port, () => {
  console.info(`server is listening on ${port}`);
});
