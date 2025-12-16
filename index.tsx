import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Database, 
  Table, 
  Shield, 
  Users, 
  Zap, 
  Code, 
  Settings, 
  Search, 
  Plus, 
  MoreHorizontal, 
  CheckCircle2, 
  AlertCircle,
  Play,
  Save,
  Trash2,
  Lock,
  Unlock,
  LogOut,
  Server,
  Key,
  Terminal,
  RefreshCw,
  Loader2,
  HardDrive,
  UploadCloud,
  ScrollText,
  FunctionSquare,
  Globe,
  Fingerprint,
  ShieldCheck,
  Siren
} from 'lucide-react';

// --- API CLIENT & TYPES ---

// Base URL detection: If running in dev, assume localhost:3000, otherwise relative
const API_URL = (import.meta as any).env?.VITE_API_URL || ''; 

interface DBTable {
  table_name: string;
  table_schema: string;
  approx_rows: number;
  rls_enabled?: boolean; // New field for security status
}

interface DBFunction {
  oid: number;
  schema: string;
  name: string;
  args: string;
  return_type: string;
  language: string;
}

interface QueryResult {
  rows: any[];
  fields: { name: string, dataTypeID: number }[];
  rowCount: number;
  duration: number;
}

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: string | null;
}

interface AppUser {
  id: string;
  email: string;
  provider: string;
  created_at: string;
  last_sign_in: string;
}

// --- COMPONENTS ---

const Badge = ({ children, color = 'blue' }: { children?: React.ReactNode, color?: 'blue' | 'green' | 'red' | 'yellow' | 'slate' | 'purple' }) => {
  const colors = {
    blue: 'bg-blue-900/30 text-blue-400 border-blue-800',
    green: 'bg-emerald-900/30 text-emerald-400 border-emerald-800',
    red: 'bg-red-900/30 text-red-400 border-red-800',
    yellow: 'bg-amber-900/30 text-amber-400 border-amber-800',
    slate: 'bg-slate-800 text-slate-400 border-slate-700',
    purple: 'bg-purple-900/30 text-purple-400 border-purple-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${colors[color]}`}>
      {children}
    </span>
  );
};

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 border-l-4 ${
      active ? 'border-emerald-500 bg-slate-800 text-white' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
    }`}
  >
    <Icon size={18} />
    {label}
  </button>
);

// --- VIEWS ---

const LoginView = ({ onLogin }: { onLogin: (token: string, user: string) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Login failed');
      
      onLogin(data.token, username);
    } catch (err: any) {
      setError(err.message || 'Connection refused. Is the Backend Docker Container running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        <div className="bg-slate-800/50 p-6 border-b border-slate-800 text-center">
          <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-900/20">
            <ShieldCheck className="text-white" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">IronDB Studio</h1>
          <p className="text-slate-400 text-sm mt-1">Secure Admin Gateway</p>
        </div>
        
        <form onSubmit={handleLogin} className="p-8 space-y-5">
          {error && (
            <div className="bg-red-900/20 border border-red-800 text-red-400 p-3 rounded text-sm flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <div>{error}</div>
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Admin User</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white rounded px-4 py-2 focus:border-emerald-500 focus:outline-none"
              placeholder="admin"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Service Key / Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white rounded px-4 py-2 focus:border-emerald-500 focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded transition-all flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Terminal size={18} />}
            {loading ? 'Verifying Credentials...' : 'Access Database'}
          </button>
        </form>
      </div>
    </div>
  );
};

const TablesView = ({ token }: { token: string }) => {
  const [tables, setTables] = useState<DBTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<QueryResult | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [togglingRLS, setTogglingRLS] = useState(false);

  const fetchTables = useCallback(async () => {
    try {
      // Enhanced query to check for RLS
      const sql = `
        SELECT 
          t.table_name, 
          t.table_schema,
          c.relrowsecurity as rls_enabled
        FROM information_schema.tables t
        JOIN pg_class c ON c.relname = t.table_name
        JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.table_schema
        WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
      `;
      
      const res = await fetch(`${API_URL}/api/query`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql })
      });
      
      const data = await res.json();
      if(data.rows) setTables(data.rows);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const toggleRLS = async (tableName: string, currentStatus: boolean) => {
    setTogglingRLS(true);
    try {
      const action = currentStatus ? 'DISABLE' : 'ENABLE';
      const sql = `ALTER TABLE public."${tableName}" ${action} ROW LEVEL SECURITY;`;
      
      await fetch(`${API_URL}/api/query`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql })
      });
      
      fetchTables(); // Refresh status
    } catch (e) {
      console.error(e);
      alert('Failed to toggle RLS');
    } finally {
      setTogglingRLS(false);
    }
  };

  useEffect(() => {
    if (!selectedTable) return;
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const res = await fetch(`${API_URL}/api/query`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            sql: `SELECT * FROM ${selectedTable} LIMIT 50` 
          })
        });
        const data = await res.json();
        setTableData(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [selectedTable, token]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  if (loading) return <div className="p-8 text-slate-400 flex items-center gap-2"><Loader2 className="animate-spin" /> Loading Schema...</div>;

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
      <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="p-3 border-b border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
            <input type="text" placeholder="Search tables..." className="w-full bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded pl-8 pr-3 py-2 focus:outline-none focus:border-emerald-500" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {tables.map(t => {
            const fullName = `${t.table_schema}.${t.table_name}`;
            return (
              <button
                key={fullName}
                onClick={() => setSelectedTable(fullName)}
                className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between group ${
                  selectedTable === fullName ? 'bg-emerald-900/30 text-emerald-400' : 'text-slate-400 hover:bg-slate-700/50'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <Table size={14} />
                  {t.table_name}
                </span>
                {t.rls_enabled ? (
                  <span title="RLS Enabled (Secure)"><ShieldCheck size={14} className="text-emerald-500" /></span>
                ) : (
                  <span title="RLS Disabled (Public)"><Unlock size={14} className="text-amber-500" /></span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-slate-900">
        <div className="h-14 border-b border-slate-700 flex items-center justify-between px-6 bg-slate-800/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            {selectedTable || 'Select a Table'}
            {selectedTable && tables.find(t => `${t.table_schema}.${t.table_name}` === selectedTable) && (
              <button 
                onClick={() => {
                   const t = tables.find(t => `${t.table_schema}.${t.table_name}` === selectedTable);
                   if(t) toggleRLS(t.table_name, !!t.rls_enabled);
                }}
                disabled={togglingRLS}
                className={`ml-4 text-xs flex items-center gap-1 px-2 py-1 rounded border ${
                  tables.find(t => `${t.table_schema}.${t.table_name}` === selectedTable)?.rls_enabled 
                  ? 'bg-emerald-900/20 border-emerald-800 text-emerald-400' 
                  : 'bg-amber-900/20 border-amber-800 text-amber-400'
                }`}
              >
                {togglingRLS && <Loader2 size={10} className="animate-spin" />}
                {tables.find(t => `${t.table_schema}.${t.table_name}` === selectedTable)?.rls_enabled ? 'RLS SECURE' : 'RLS DISABLED'}
              </button>
            )}
          </h2>
          <div className="flex gap-2">
            <button 
              onClick={() => setSelectedTable(prev => prev ? '' + prev : prev)} // Trigger re-fetch
              className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded border border-slate-600"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-0 relative">
          {loadingData ? (
             <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                <Loader2 className="animate-spin text-emerald-500" size={32} />
             </div>
          ) : tableData && tableData.rows.length > 0 ? (
            <table className="w-full text-left text-sm text-slate-400 whitespace-nowrap">
              <thead className="bg-slate-800 text-xs uppercase font-medium text-slate-500 sticky top-0 z-10">
                <tr>
                  {tableData.fields.map(f => (
                    <th key={f.name} className="px-6 py-3 border-b border-slate-700 font-mono text-emerald-500">
                      {f.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {tableData.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-800/30">
                    {tableData.fields.map(f => (
                      <td key={f.name} className="px-6 py-3 border-b border-slate-800/50 max-w-[300px] overflow-hidden text-ellipsis">
                         {typeof row[f.name] === 'object' ? JSON.stringify(row[f.name]) : String(row[f.name])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-slate-600">
              {selectedTable ? 'No rows found or table is empty.' : 'Select a table from the sidebar to view data.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const UsersView = ({ token }: { token: string }) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/query`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sql: `SELECT id, email, provider, created_at, last_sign_in FROM users ORDER BY created_at DESC LIMIT 100` 
        })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.message.includes('relation "users" does not exist')) {
            throw new Error("Missing 'users' table. Go to Settings > Auth Config to create it.");
        }
        throw new Error(data.message);
      }
      setUsers(data.rows);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
      <div className="h-14 border-b border-slate-700 flex items-center justify-between px-6 bg-slate-800/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users size={18} className="text-emerald-500" />
            App Users
          </h2>
          <button onClick={fetchUsers} className="p-2 hover:bg-slate-700 rounded text-slate-400">
            <RefreshCw size={14} />
          </button>
      </div>

      <div className="flex-1 overflow-auto p-0">
        {loading ? (
           <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-emerald-500"/></div>
        ) : error ? (
           <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
             <AlertCircle size={32} className="mb-2 text-amber-500"/>
             <p className="max-w-md">{error}</p>
             <p className="text-xs mt-2 text-slate-600">This view requires a generic `users` table.</p>
           </div>
        ) : users.length === 0 ? (
           <div className="flex items-center justify-center h-full text-slate-500">No users found.</div>
        ) : (
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-slate-800 text-xs uppercase font-medium text-slate-500 sticky top-0">
              <tr>
                <th className="px-6 py-3 border-b border-slate-700">Email</th>
                <th className="px-6 py-3 border-b border-slate-700">Provider</th>
                <th className="px-6 py-3 border-b border-slate-700">Created At</th>
                <th className="px-6 py-3 border-b border-slate-700">Last Sign In</th>
                <th className="px-6 py-3 border-b border-slate-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/30">
                  <td className="px-6 py-3 text-white font-medium">{u.email}</td>
                  <td className="px-6 py-3">
                    <Badge color={u.provider === 'google' ? 'blue' : 'slate'}>{u.provider || 'email'}</Badge>
                  </td>
                  <td className="px-6 py-3">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-3">{u.last_sign_in ? new Date(u.last_sign_in).toLocaleString() : '-'}</td>
                  <td className="px-6 py-3 text-right">
                    <button className="text-red-400 hover:text-red-300 p-1"><Trash2 size={14}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const SettingsView = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'auth' | 'security'>('general');

  const authSetupSQL = `CREATE TABLE IF NOT EXISTS public.users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  provider text DEFAULT 'email',
  google_id text UNIQUE,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  last_sign_in timestamptz
);

-- Enable RLS (CRITICAL)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can read own data" ON public.users
  FOR SELECT USING (auth.uid() = id);`;

  const backendSnippet = `// --- secure-server.js snippet ---
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');

// 1. SQL INJECTION PREVENTION: Use Parameterized Queries ($1, $2)
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
  },
  async function(accessToken, refreshToken, profile, cb) {
    const email = profile.emails[0].value;
    const googleId = profile.id;
    try {
       // SECURITY: Using $1, $2 params makes this 100% SQL Injection Proof
       const res = await pool.query(\`
         INSERT INTO users (email, provider, google_id, last_sign_in)
         VALUES ($1, 'google', $2, NOW())
         ON CONFLICT (email) DO UPDATE SET last_sign_in = NOW()
         RETURNING *\`, 
         [email, googleId] // <--- Params array
       );
       return cb(null, res.rows[0]);
    } catch (err) { return cb(err); }
  }
));

// 2. JWT GENERATION
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  function(req, res) {
    // Generate Signed Token
    const userToken = jwt.sign({ 
        sub: req.user.id, 
        role: 'authenticated' 
    }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    // Send to Frontend (Securely)
    res.redirect(\`http://localhost:5173/auth/callback?token=\${userToken}\`);
  });`;

  const middlewareSnippet = `// --- The "Kong" Alternative (Node.js Middleware) ---
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const app = express();

// 1. HELMET: Sets secure HTTP headers (XSS Filter, No-Sniff, etc)
app.use(helmet());

// 2. CORS: Restrict who can call your API
app.use(cors({
  origin: 'https://your-app-domain.com', // Don't use '*' in production
  methods: ['GET', 'POST']
}));

// 3. RATE LIMITING: Prevent DDoS / Brute Force
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // Limit each IP to 100 requests per windowMs
});
app.use('/auth/', limiter); // Apply strict limits to auth routes

// 4. JWT VALIDATION MIDDLEWARE
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({error: 'No token'});
  
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({error: 'Invalid token'});
    req.user = decoded; // Inject user ID into request
    next();
  });
};`;

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
       <div className="w-48 bg-slate-800 border-r border-slate-700 p-2 space-y-1">
          <button onClick={() => setActiveTab('general')} className={`w-full text-left px-3 py-2 text-sm rounded ${activeTab === 'general' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700/50'}`}>General</button>
          <button onClick={() => setActiveTab('auth')} className={`w-full text-left px-3 py-2 text-sm rounded ${activeTab === 'auth' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700/50'}`}>Auth Config</button>
          <button onClick={() => setActiveTab('security')} className={`w-full text-left px-3 py-2 text-sm rounded ${activeTab === 'security' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700/50'}`}>Security & Middleware</button>
       </div>
       <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'general' && (
            <div className="text-slate-400">
              <h3 className="text-white font-bold mb-2">Docker Configuration</h3>
              <p className="mb-4 text-sm">To update DB credentials, modify your <code>docker-compose.yml</code>.</p>
              <pre className="bg-slate-950 p-4 rounded text-xs font-mono overflow-x-auto text-emerald-400">
                {`# .env example
POSTGRES_HOST=db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=...
PORT=3000`}
              </pre>
            </div>
          )}

          {activeTab === 'auth' && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  <Fingerprint className="text-emerald-500"/> 
                  Authentication Setup
                </h3>
                <p className="text-slate-400 text-sm mt-2">
                  Implement Google Login with strict SQL Injection prevention.
                </p>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-white font-medium text-sm">1. Database Schema</h4>
                  <Badge color="blue">Run in SQL Editor</Badge>
                </div>
                <div className="relative">
                  <pre className="text-xs font-mono text-blue-300 overflow-x-auto p-4 bg-slate-900 rounded border border-slate-800">
                    {authSetupSQL}
                  </pre>
                </div>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
                 <h4 className="text-white font-medium text-sm mb-2">2. Secure Backend Implementation</h4>
                 <p className="text-slate-500 text-xs mb-4">
                   This snippet shows how to use <code>pg</code> parameterized queries.
                 </p>
                 <pre className="text-xs font-mono text-orange-300 overflow-x-auto p-4 bg-slate-900 rounded border border-slate-800">
                    {backendSnippet}
                  </pre>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6 max-w-3xl">
              <div className="flex items-start gap-4 p-4 bg-amber-900/20 border border-amber-800/50 rounded-lg">
                 <Siren className="text-amber-500 shrink-0 mt-1" />
                 <div>
                   <h4 className="text-amber-400 font-bold text-sm">Real Security Happens in the Backend</h4>
                   <p className="text-amber-200/70 text-xs mt-1 leading-relaxed">
                     The IronDB Studio is just a UI. To replace Supabase's "Kong" Gateway, you must use Node.js Middleware. 
                     This protects you from DDoS, XSS, and unauthorized access.
                   </p>
                 </div>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
                 <h4 className="text-white font-medium text-sm mb-2">The "Kong Replacement" (Middleware)</h4>
                 <p className="text-slate-500 text-xs mb-4">
                   Add these libraries to your <code>server.js</code> to create a security shield around your API.
                 </p>
                 <pre className="text-xs font-mono text-emerald-300 overflow-x-auto p-4 bg-slate-900 rounded border border-slate-800">
                    {middlewareSnippet}
                  </pre>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 bg-slate-800/50 border border-slate-700 rounded">
                    <h5 className="text-white font-bold text-xs mb-2 flex items-center gap-2"><Shield size={14}/> SQL Injection</h5>
                    <p className="text-slate-400 text-[10px] leading-relaxed">
                      <strong>Solved by:</strong> Parameterized Queries.<br/>
                      Never use string concatenation: <br/>
                      <span className="text-red-400 line-through">"SELECT * FROM users WHERE id = " + id</span><br/>
                      <span className="text-emerald-400">"SELECT * FROM users WHERE id = $1", [id]</span>
                    </p>
                 </div>
                 <div className="p-4 bg-slate-800/50 border border-slate-700 rounded">
                    <h5 className="text-white font-bold text-xs mb-2 flex items-center gap-2"><Globe size={14}/> Rate Limiting</h5>
                    <p className="text-slate-400 text-[10px] leading-relaxed">
                      <strong>Solved by:</strong> <code>express-rate-limit</code>.<br/>
                      Prevents bots from trying 1000 passwords per second on your login route.
                    </p>
                 </div>
              </div>
            </div>
          )}
       </div>
    </div>
  );
};

const FunctionsView = ({ token }: { token: string }) => {
  const [functions, setFunctions] = useState<DBFunction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFunc, setSelectedFunc] = useState<DBFunction | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [executing, setExecuting] = useState(false);
  const [resultMessage, setResultMessage] = useState('');

  // Template for new function
  const NEW_FUNC_TEMPLATE = `CREATE OR REPLACE FUNCTION public.my_new_function(param1 text)
RETURNS json AS $$
BEGIN
  -- Your Logic Here (RPC)
  RETURN json_build_object('message', 'Hello ' || param1);
END;
$$ LANGUAGE plpgsql;`;

  const fetchFunctions = useCallback(async () => {
    setLoading(true);
    try {
      const sql = `
        SELECT 
          p.oid,
          n.nspname as schema,
          p.proname as name,
          pg_get_function_arguments(p.oid) as args,
          t.typname as return_type,
          l.lanname as language
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        LEFT JOIN pg_type t ON p.prorettype = t.oid
        LEFT JOIN pg_language l ON p.prolang = l.oid
        WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
        ORDER BY n.nspname, p.proname;
      `;
      const res = await fetch(`${API_URL}/api/query`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql })
      });
      const data = await res.json();
      if(data.rows) setFunctions(data.rows);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchFunctions();
  }, [fetchFunctions]);

  const loadFunctionDefinition = async (func: DBFunction) => {
    setSelectedFunc(func);
    setResultMessage('');
    try {
      const res = await fetch(`${API_URL}/api/query`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: `SELECT pg_get_functiondef(${func.oid}) as def` })
      });
      const data = await res.json();
      if(data.rows && data.rows[0]) {
        setEditorContent(data.rows[0].def);
      }
    } catch(e) {
      console.error(e);
    }
  };

  const executeSQL = async () => {
    setExecuting(true);
    setResultMessage('');
    try {
      const res = await fetch(`${API_URL}/api/query`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: editorContent })
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.message || 'Error');
      setResultMessage('Success! Function updated/created.');
      fetchFunctions(); // Refresh list
    } catch(e: any) {
      setResultMessage(`Error: ${e.message}`);
    } finally {
      setExecuting(false);
    }
  };

  const handleNew = () => {
    setSelectedFunc(null);
    setEditorContent(NEW_FUNC_TEMPLATE);
    setResultMessage('');
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
      <div className="w-72 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="p-3 border-b border-slate-700 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-400 uppercase">Database Functions</span>
          <button onClick={handleNew} className="p-1 hover:bg-slate-700 rounded text-emerald-500" title="New Function">
            <Plus size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? <div className="p-4 text-center"><Loader2 className="animate-spin mx-auto"/></div> : 
           functions.map(f => (
             <button
               key={f.oid}
               onClick={() => loadFunctionDefinition(f)}
               className={`w-full text-left px-4 py-3 border-b border-slate-700/50 hover:bg-slate-700/50 group transition-colors ${selectedFunc?.oid === f.oid ? 'bg-slate-700 border-l-2 border-l-emerald-500' : ''}`}
             >
               <div className="flex items-center gap-2 text-sm text-slate-200 font-medium">
                 <FunctionSquare size={14} className="text-purple-400 shrink-0"/>
                 <span className="truncate">{f.name}</span>
               </div>
               <div className="flex items-center gap-2 mt-1">
                 <Badge color="slate">{f.schema}</Badge>
                 <span className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">
                   -> {f.return_type}
                 </span>
               </div>
             </button>
           ))
          }
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-[#0d1117]">
         <div className="h-12 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-800/50">
            <div className="flex items-center gap-2">
              <ScrollText size={16} className="text-slate-400"/>
              <span className="text-sm font-bold text-slate-200">
                {selectedFunc ? `Editing: ${selectedFunc.name}` : 'Create New RPC'}
              </span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={executeSQL}
                disabled={executing}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs rounded font-medium"
              >
                {executing ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
                Apply Changes
              </button>
            </div>
         </div>
         
         <div className="flex-1 relative">
            <textarea
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              className="absolute inset-0 w-full h-full bg-[#0d1117] text-slate-200 font-mono p-4 text-sm resize-none focus:outline-none leading-relaxed"
              spellCheck={false}
            />
         </div>

         {resultMessage && (
           <div className={`p-3 text-xs font-mono border-t ${resultMessage.startsWith('Error') ? 'bg-red-900/20 border-red-900 text-red-400' : 'bg-emerald-900/20 border-emerald-900 text-emerald-400'}`}>
             {resultMessage}
           </div>
         )}
      </div>
    </div>
  );
};

const SQLView = ({ token }: { token: string }) => {
  const [query, setQuery] = useState('SELECT * FROM information_schema.tables LIMIT 10;');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);

  const runQuery = async () => {
    setExecuting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/query`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: query })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Query failed');
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
      <div className="h-1/3 min-h-[200px] bg-slate-900 border border-slate-700 rounded-lg flex flex-col overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-400 uppercase">SQL Query Editor</span>
          <button 
            onClick={runQuery}
            disabled={executing}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 text-xs rounded font-medium disabled:opacity-50"
          >
            {executing ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            Run Query
          </button>
        </div>
        <textarea 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-[#0d1117] text-slate-200 font-mono p-4 resize-none focus:outline-none text-sm"
          spellCheck={false}
        />
      </div>

      <div className="flex-1 bg-slate-900 border border-slate-700 rounded-lg overflow-hidden flex flex-col">
        {error ? (
          <div className="p-6 text-red-400 font-mono text-sm whitespace-pre-wrap">{error}</div>
        ) : result ? (
          <>
            <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 text-xs text-slate-400 flex gap-4">
              <span>{result.rowCount} rows</span>
              <span>{result.duration}ms</span>
            </div>
            <div className="flex-1 overflow-auto">
               <table className="w-full text-left text-sm text-slate-400 whitespace-nowrap">
                  <thead className="bg-slate-800 text-xs uppercase text-slate-500 sticky top-0">
                    <tr>
                      {result.fields.map((f, i) => <th key={i} className="px-6 py-3 border-b border-slate-700 font-mono">{f.name}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-800/20 border-b border-slate-800/50">
                        {result.fields.map((f, j) => (
                          <td key={j} className="px-6 py-2 font-mono text-xs text-slate-300">
                             {row[f.name] === null ? <span className="text-slate-600">NULL</span> : String(row[f.name])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
            Execute a query to see results
          </div>
        )}
      </div>
    </div>
  );
};

const StorageView = () => (
  <div className="flex flex-col h-[calc(100vh-8rem)] items-center justify-center text-center p-8 border border-slate-700 rounded-lg bg-slate-800/30 border-dashed">
     <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-6">
       <HardDrive className="text-slate-400" size={32} />
     </div>
     <h2 className="text-xl font-bold text-white mb-2">Storage Configuration Required</h2>
     <p className="text-slate-400 max-w-lg mb-8">
       Unlike Supabase, vanilla Postgres does not handle file storage (S3). 
       You need to configure an external provider like AWS S3, MinIO (Docker), or Cloudflare R2.
     </p>
     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
        <div className="p-4 bg-slate-800 rounded border border-slate-700 hover:border-emerald-500 transition-colors cursor-pointer group">
           <UploadCloud className="text-emerald-500 mb-3" />
           <h3 className="text-white font-medium text-sm">MinIO (Docker)</h3>
           <p className="text-xs text-slate-500 mt-1">Self-hosted S3 compatible. Best for local/VPS.</p>
        </div>
        <div className="p-4 bg-slate-800 rounded border border-slate-700 hover:border-orange-500 transition-colors cursor-pointer group">
           <Server className="text-orange-500 mb-3" />
           <h3 className="text-white font-medium text-sm">AWS S3</h3>
           <p className="text-xs text-slate-500 mt-1">Industry standard. Infinite scaling.</p>
        </div>
        <div className="p-4 bg-slate-800 rounded border border-slate-700 hover:border-blue-500 transition-colors cursor-pointer group">
           <HardDrive className="text-blue-500 mb-3" />
           <h3 className="text-white font-medium text-sm">Local Disk</h3>
           <p className="text-xs text-slate-500 mt-1">Mount a volume to your API container.</p>
        </div>
     </div>
  </div>
);

// --- MAIN APP SHELL ---

const App = () => {
  const [auth, setAuth] = useState<AuthState>(() => {
    const token = localStorage.getItem('irondb_token');
    return {
      isAuthenticated: !!token,
      token: token,
      user: localStorage.getItem('irondb_user')
    };
  });

  const [view, setView] = useState<'tables' | 'sql' | 'functions' | 'users' | 'storage' | 'settings'>('tables');

  const handleLogin = (token: string, user: string) => {
    localStorage.setItem('irondb_token', token);
    localStorage.setItem('irondb_user', user);
    setAuth({ isAuthenticated: true, token, user });
  };

  const handleLogout = () => {
    localStorage.removeItem('irondb_token');
    localStorage.removeItem('irondb_user');
    setAuth({ isAuthenticated: false, token: null, user: null });
  };

  if (!auth.isAuthenticated || !auth.token) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div className="flex min-h-screen font-sans bg-[#0f172a]">
      {/* Sidebar Navigation */}
      <nav className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col fixed h-full z-10">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <Database className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg tracking-tight">IronDB</h1>
            <div className="text-xs text-slate-500">Postgres Studio</div>
          </div>
        </div>

        <div className="flex-1 py-4 space-y-1">
          <div className="px-6 py-2 text-xs font-bold text-slate-600 uppercase tracking-wider">Data</div>
          <SidebarItem icon={Table} label="Table Editor" active={view === 'tables'} onClick={() => setView('tables')} />
          <SidebarItem icon={Code} label="SQL Query" active={view === 'sql'} onClick={() => setView('sql')} />
          
          <div className="px-6 py-2 mt-6 text-xs font-bold text-slate-600 uppercase tracking-wider">Logic</div>
          <SidebarItem icon={ScrollText} label="Functions (RPC)" active={view === 'functions'} onClick={() => setView('functions')} />
          
          <div className="px-6 py-2 mt-6 text-xs font-bold text-slate-600 uppercase tracking-wider">Auth</div>
          <SidebarItem icon={Users} label="Users & Roles" active={view === 'users'} onClick={() => setView('users')} />

          <div className="px-6 py-2 mt-6 text-xs font-bold text-slate-600 uppercase tracking-wider">Assets</div>
          <SidebarItem icon={HardDrive} label="Storage" active={view === 'storage'} onClick={() => setView('storage')} />

          <div className="px-6 py-2 mt-6 text-xs font-bold text-slate-600 uppercase tracking-wider">System</div>
          <SidebarItem icon={Settings} label="Settings" active={view === 'settings'} onClick={() => setView('settings')} />
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between p-2 rounded bg-slate-800/50">
             <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                  {auth.user?.substring(0,2)}
                </div>
                <div className="text-xs text-slate-300 truncate max-w-[100px]">{auth.user}</div>
             </div>
             <button onClick={handleLogout} className="text-slate-500 hover:text-red-400">
               <LogOut size={14} />
             </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 ml-64 bg-[#0f172a] min-h-screen">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
           <div className="flex items-center gap-2 text-slate-400 text-sm">
             <span className="hover:text-white cursor-pointer">Project</span>
             <span>/</span>
             <span className="text-white font-medium capitalize">{view}</span>
           </div>
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-900/20 border border-emerald-900/50 rounded-full text-xs text-emerald-400">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                Connected to Production
              </div>
           </div>
        </header>

        <div className="p-8">
          {view === 'tables' && <TablesView token={auth.token} />}
          {view === 'sql' && <SQLView token={auth.token} />}
          {view === 'functions' && <FunctionsView token={auth.token} />}
          {view === 'users' && <UsersView token={auth.token} />}
          {view === 'storage' && <StorageView />}
          {view === 'settings' && <SettingsView />}
        </div>
      </main>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);