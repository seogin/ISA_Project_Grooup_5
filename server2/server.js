require('dotenv').config({ path: `${__dirname}/.env` });

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { getDatabase } = require('./database');

const PORT = Number(process.env.PORT || process.env.SERVER_PORT || 4000);
const HOST = process.env.SERVER_HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const FREE_API_LIMIT = Number(process.env.FREE_API_LIMIT || 20);
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@admin.com').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '111';
const DEMO_EMAIL = (process.env.DEMO_EMAIL || 'john@john.com').toLowerCase();
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || '123';
const MODEL_ID = process.env.HF_MODEL_ID || 'Xenova/distilgpt2';

const isProduction = process.env.NODE_ENV === 'production';
const secureCookies = isProduction || process.env.COOKIE_SECURE === 'true';
const sameSitePolicy = secureCookies ? 'none' : 'lax';

const allowedOrigins = (process.env.CLIENT_ORIGINS || 'http://localhost:3000,http://localhost:5173,http://localhost:5500')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const app = express();

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin);
    } else {
      callback(new Error('Origin not allowed by CORS policy'));
    }
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
  }
  return next(err);
});

function buildUsagePayload(user) {
  const total = Number(user.api_calls_used || 0);
  const remaining = Math.max(0, FREE_API_LIMIT - total);
  return {
    total,
    remaining,
    limit: FREE_API_LIMIT,
  };
}

function mapUserRecord(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    apiCallsUsed: Number(user.api_calls_used || 0),
    freeCallsRemaining: Math.max(0, FREE_API_LIMIT - Number(user.api_calls_used || 0)),
    freeCallLimit: FREE_API_LIMIT,
    createdAt: user.created_at,
    lastLoginAt: user.last_login_at,
    lastRequestAt: user.last_request_at,
  };
}

let generatorPromise = null;
async function loadGenerator() {
  if (!generatorPromise) {
    console.log(`Loading Hugging Face model: ${MODEL_ID}`);
    generatorPromise = import('@xenova/transformers')
      .then(({ pipeline }) => pipeline('text-generation', MODEL_ID))
      .then(pipelineInstance => {
        console.log('Model loaded successfully');
        return pipelineInstance;
      })
      .catch(error => {
        generatorPromise = null;
        console.error('Failed to load model', error);
        throw error;
      });
  }
  return generatorPromise;
}

function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  if (req.cookies?.token) {
    return req.cookies.token;
  }
  return null;
}

async function authenticateRequest(req, res, next) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    const db = await getDatabase();
    const user = await db.get('SELECT * FROM users WHERE id = ?', payload.sub);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid authentication token' });
    }

    req.authenticatedUser = user;
    return next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    return res.status(401).json({ success: false, message: 'Authentication failed' });
  }
}

function requireAdmin(req, res, next) {
  if (req.authenticatedUser?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin privileges required' });
  }
  return next();
}

async function ensureSeedUsers(db) {
  await ensureUserExists(db, ADMIN_EMAIL, ADMIN_PASSWORD, 'admin');
  await ensureUserExists(db, DEMO_EMAIL, DEMO_PASSWORD, 'user');
}

async function ensureUserExists(db, email, password, role) {
  const existing = await db.get('SELECT id FROM users WHERE email = ?', email);
  if (existing) {
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await db.run(
    'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
    email,
    passwordHash,
    role
  );
  console.log(`Seeded ${role} account for ${email}`);
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', model: MODEL_ID });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const db = await getDatabase();
    const { email, password } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const plainPassword = typeof password === 'string' ? password.trim() : '';

    if (!normalizedEmail || !plainPassword) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }

    if (plainPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', normalizedEmail);
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(plainPassword, 12);
    await db.run(
      'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
      normalizedEmail,
      passwordHash,
      'user'
    );

    return res.status(201).json({ success: true, message: 'Registration successful. Please sign in.' });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'Unable to register user at this time' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const db = await getDatabase();
    const { email, password } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const plainPassword = typeof password === 'string' ? password : '';

    if (!normalizedEmail || !plainPassword) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await db.get('SELECT * FROM users WHERE email = ?', normalizedEmail);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const passwordMatches = await bcrypt.compare(plainPassword, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    await db.run(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      user.id
    );

    const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, {
      httpOnly: true,
      secure: secureCookies,
      sameSite: sameSitePolicy,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const freshUser = await db.get('SELECT * FROM users WHERE id = ?', user.id);

    return res.json({ success: true, user: mapUserRecord(freshUser) });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Unable to sign in at this time' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, secure: secureCookies, sameSite: sameSitePolicy });
  res.json({ success: true });
});

app.get('/api/auth/me', authenticateRequest, async (req, res) => {
  const user = mapUserRecord(req.authenticatedUser);
  res.json({ success: true, user });
});

app.post('/api/ai/generate', authenticateRequest, async (req, res) => {
  try {
    const { prompt } = req.body || {};
    const trimmedPrompt = typeof prompt === 'string' ? prompt.trim() : '';

    if (!trimmedPrompt) {
      return res.status(400).json({ success: false, message: 'Prompt text is required' });
    }

    const generator = await loadGenerator();
    const output = await generator(trimmedPrompt, {
      max_new_tokens: Number(process.env.HF_MAX_NEW_TOKENS || 80),
      temperature: Number(process.env.HF_TEMPERATURE || 0.7),
      top_k: 50,
      top_p: 0.95,
    });

    const generatedText = Array.isArray(output) && output[0]?.generated_text
      ? output[0].generated_text
      : '';

    const db = await getDatabase();
    await db.run(
      'UPDATE users SET api_calls_used = api_calls_used + 1, updated_at = CURRENT_TIMESTAMP, last_request_at = CURRENT_TIMESTAMP WHERE id = ?',
      req.authenticatedUser.id
    );

    const refreshedUser = await db.get('SELECT * FROM users WHERE id = ?', req.authenticatedUser.id);
    const usage = buildUsagePayload(refreshedUser);
    const limitReached = refreshedUser.api_calls_used >= FREE_API_LIMIT;

    const responsePayload = {
      success: true,
      prompt: trimmedPrompt,
      generatedText,
      usage,
      limitReached,
    };

    if (limitReached) {
      responsePayload.message = 'You have reached the limit of free AI calls. Additional usage will still work but may incur charges in the future.';
    }

    return res.json(responsePayload);
  } catch (error) {
    console.error('AI generation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate AI response' });
  }
});

app.get('/api/admin/users', authenticateRequest, requireAdmin, async (req, res) => {
  try {
    const db = await getDatabase();
    const users = await db.all('SELECT * FROM users ORDER BY created_at ASC');
    const payload = users.map(mapUserRecord);
    return res.json({ success: true, users: payload });
  } catch (error) {
    console.error('Admin users fetch error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load user usage data' });
  }
});

app.use((err, req, res, next) => {
  if (err.message === 'Origin not allowed by CORS policy') {
    return res.status(403).json({ success: false, message: err.message });
  }
  console.error('Unhandled error:', err);
  return res.status(500).json({ success: false, message: 'Internal server error' });
});

async function startServer() {
  try {
    const db = await getDatabase();
    await ensureSeedUsers(db);

    app.listen(PORT, HOST, () => {
      console.log(`Server listening on http://${HOST}:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

process.on('SIGINT', async () => {
  console.log('Received SIGINT. Shutting down...');
  const db = await getDatabase();
  await db.close();
  process.exit(0);
});
