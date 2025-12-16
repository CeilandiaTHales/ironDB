require('dotenv').config();
const { Worker } = require('bullmq');
const { Pool } = require('pg');

// Conexão separada para o Worker (para não concorrer com a API)
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  port: process.env.POSTGRES_PORT || 5432,
});

console.log("Worker started. Listening to 'irondb-jobs'...");

const worker = new Worker('irondb-jobs', async (job) => {
  console.log(`Processing job ${job.id}: ${job.name}`);
  
  try {
    // --- Lógica de Processamento ---
    if (job.name === 'bulk_insert') {
      // Exemplo: Inserir 1000 linhas de uma vez
      const { table, rows } = job.data;
      // Lógica de construção de INSERT em massa aqui...
      console.log(`Simulating bulk insert into ${table} of ${rows.length} rows`);
      await new Promise(r => setTimeout(r, 2000)); // Simula trabalho pesado
    } 
    else if (job.name === 'rpc_trigger') {
      // Executa uma função RPC pesada no banco
      const { functionName, params } = job.data;
      await pool.query(`SELECT ${functionName}($1)`, [params]);
    }

    console.log(`Job ${job.id} completed.`);
    return { status: 'success' };
    
  } catch (err) {
    console.error(`Job ${job.id} failed:`, err);
    throw err; // Isso faz o BullMQ tentar novamente (retry) automaticamente
  }

}, {
  connection: {
    host: process.env.REDIS_HOST || 'n8n-redis',
    port: process.env.REDIS_PORT || 6379
  },
  concurrency: 5 // Processa 5 jobs simultaneamente (ajuste conforme a CPU)
});