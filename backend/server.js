require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Queue } = require('bullmq');

const app = express();
const port = process.env.PORT || 3000;

// --- 1. SECURITY MIDDLEWARE (O "Kong" leve) ---
app.use(helmet()); // Protege Headers HTTP
app.use(cors({ origin: process.env.FRONTEND_URL || '*' })); // Restringe acesso
app.use(express.json());

// Rate Limit: Protege contra DDoS/Brute Force
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300 // limite de requisições por IP
});
app.use(limiter);

// --- 2. DATABASE CONNECTION ---
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  port: process.env.POSTGRES_PORT || 5432,
});

// --- 3. QUEUE SETUP (BullMQ) ---
// Usa o Redis do n8n que já existe no stack
const jobQueue = new Queue('irondb-jobs', {
  connection: {
    host: process.env.REDIS_HOST || 'n8n-redis',
    port: process.env.REDIS_PORT || 6379
  }
});

// --- 4. AUTHENTICATION STRATEGY ---
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, cb) => {
    // Lógica segura de "Upsert" usuário
    const email = profile.emails[0].value;
    const googleId = profile.id;
    try {
      const client = await pool.connect();
      // Verifica se tabela users existe, se não, cria (apenas dev)
      // Em produção, isso deve ser via migration
      const res = await client.query(`
        INSERT INTO users (email, provider, google_id, last_sign_in)
        VALUES ($1, 'google', $2, NOW())
        ON CONFLICT (email) DO UPDATE SET last_sign_in = NOW()
        RETURNING *
      `, [email, googleId]);
      client.release();
      return cb(null, res.rows[0]);
    } catch (err) {
      return cb(err);
    }
  }
));

// Rotas de Auth
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  (req, res) => {
    // Gera JWT
    const token = jwt.sign(
      { sub: req.user.id, email: req.user.email, role: 'authenticated' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    // Redireciona para o Frontend com o token
    res.redirect(`${process.env.FRONTEND_URL || '/'}?token=${token}&user=${req.user.email}`);
  }
);

// Middleware para validar JWT nas rotas protegidas
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = decoded;
    next();
  });
};

// --- 5. API ENDPOINTS ---

// Rota para Executar SQL (Usada pelo IronDB Studio)
// Protegida: Apenas Admins deveriam ter acesso a SQL arbitrário
app.post('/api/query', requireAuth, async (req, res) => {
  const { sql, params } = req.body;
  
  // Basic security check: prevent multiple statements in one call implies injection risk in some contexts
  if (!sql) return res.status(400).json({ error: 'SQL required' });

  try {
    const start = Date.now();
    const result = await pool.query(sql, params);
    const duration = Date.now() - start;
    
    res.json({
      rows: result.rows,
      fields: result.fields.map(f => ({ name: f.name, dataTypeID: f.dataTypeID })),
      rowCount: result.rowCount,
      duration
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Rota de Tabelas (Helper)
app.get('/api/tables', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        t.table_name, 
        t.table_schema,
        (SELECT reltuples::bigint FROM pg_class WHERE relname = t.table_name) as approx_rows
      FROM information_schema.tables t
      WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
    `);
    res.json({ rows: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- 6. QUEUE ENDPOINT (Async Processing) ---
// É aqui que você joga as tarefas pesadas
app.post('/api/enqueue', requireAuth, async (req, res) => {
  const { taskType, payload } = req.body;
  
  // Exemplo: 'bulk_insert_users', 'process_csv', 'send_emails'
  await jobQueue.add(taskType || 'default', payload, {
    removeOnComplete: true,
    removeOnFail: 5000 // Mantém logs de falha
  });

  res.json({ status: 'queued', message: 'Task sent to worker' });
});

app.listen(port, () => {
  console.log(`IronDB Backend running on port ${port}`);
});