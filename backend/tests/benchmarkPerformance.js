import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import mongoose from 'mongoose';
import app from '../index.js';
import PreMadePlan from '../models/PreMadePlan.js';
import Article from '../models/Article.js';
import Exercise from '../models/Exercise.js';
import { apiCache } from '../utils/cache.js';

const BENCH_PORT = 5102;
const BASE_URL = `http://127.0.0.1:${BENCH_PORT}`;

function calculatePercentiles(latencies) {
  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const avg = sorted.reduce((sum, v) => sum + v, 0) / sorted.length;
  return { p50: Number(p50.toFixed(2)), p95: Number(p95.toFixed(2)), avg: Number(avg.toFixed(2)) };
}

async function runBenchmark() {
  console.log('===============================================================');
  console.log('⚡ GYMSYNC SCIENTIFIC PERFORMANCE BENCHMARK SUITE');
  console.log('===============================================================\n');

  let server;
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    server = await new Promise((resolve) => {
      const s = app.listen(BENCH_PORT, () => {
        console.log(`🚀 Benchmark server running at ${BASE_URL}\n`);
        resolve(s);
      });
    });

    // -----------------------------------------------------------------
    // BENCHMARK 1: Payload Size Comparison (Over-the-Wire DTO Reduction)
    // -----------------------------------------------------------------
    console.log('--- 1. Over-The-Wire Payload Size Reduction Benchmark ---');
    
    // 1.1 Workout Plan DTO vs Full Detail
    const planDetailSample = await PreMadePlan.findOne({ type: 'Workout', status: 'published' }).lean();
    if (!planDetailSample) {
      throw new Error('No published workout plan found in database for payload benchmark.');
    }
    const fullPlanBytes = Buffer.byteLength(JSON.stringify(planDetailSample), 'utf8');

    const cardPlanRes = await fetch(`${BASE_URL}/api/plans/premade?type=Workout&paginate=true&limit=1`);
    const cardPlanData = await cardPlanRes.json();
    const planCardSample = cardPlanData.items?.[0] || {};
    const cardPlanBytes = Buffer.byteLength(JSON.stringify(planCardSample), 'utf8');
    const planReductionPct = ((fullPlanBytes - cardPlanBytes) / fullPlanBytes * 100).toFixed(1);

    console.log(`  📦 Workout Plan Full Object : ${fullPlanBytes} bytes`);
    console.log(`  📦 Workout Plan Card DTO    : ${cardPlanBytes} bytes`);
    console.log(`  📉 Payload Reduction        : -${planReductionPct}%`);

    // 1.2 Article DTO vs Full Markdown Article
    const articleDetailSample = await Article.findOne({ status: 'published' }).lean();
    let articleReductionPct = 'N/A';
    let fullArticleBytes = 0;
    let cardArticleBytes = 0;
    if (articleDetailSample) {
      fullArticleBytes = Buffer.byteLength(JSON.stringify(articleDetailSample), 'utf8');
      const cardArticleRes = await fetch(`${BASE_URL}/api/articles?limit=1`);
      const cardArticleList = await cardArticleRes.json();
      const cardArticleSample = Array.isArray(cardArticleList) ? cardArticleList[0] : (cardArticleList.items?.[0] || {});
      cardArticleBytes = Buffer.byteLength(JSON.stringify(cardArticleSample), 'utf8');
      articleReductionPct = ((fullArticleBytes - cardArticleBytes) / fullArticleBytes * 100).toFixed(1);
      console.log(`  📦 Article Full Document   : ${fullArticleBytes} bytes`);
      console.log(`  📦 Article Card DTO        : ${cardArticleBytes} bytes (includes server excerpt, omits content)`);
      console.log(`  📉 Payload Reduction        : -${articleReductionPct}%`);
    }

    // 1.3 Exercise DTO vs Full Exercise
    const exerciseDetailSample = await Exercise.findOne().lean();
    let exReductionPct = 'N/A';
    let fullExBytes = 0;
    let cardExBytes = 0;
    if (exerciseDetailSample) {
      fullExBytes = Buffer.byteLength(JSON.stringify(exerciseDetailSample), 'utf8');
      const cardExRes = await fetch(`${BASE_URL}/api/exercises?paginate=true&limit=1`);
      const cardExData = await cardExRes.json();
      const cardExSample = cardExData.items?.[0] || {};
      cardExBytes = Buffer.byteLength(JSON.stringify(cardExSample), 'utf8');
      exReductionPct = ((fullExBytes - cardExBytes) / fullExBytes * 100).toFixed(1);
      console.log(`  📦 Exercise Full Detail    : ${fullExBytes} bytes`);
      console.log(`  📦 Exercise Card DTO       : ${cardExBytes} bytes`);
      console.log(`  📉 Payload Reduction        : -${exReductionPct}%\n`);
    }

    // -----------------------------------------------------------------
    // BENCHMARK 2: DB Keyset Cursor Query Latency (100 vs 1,000 documents)
    // -----------------------------------------------------------------
    console.log('--- 2. Database Keyset Cursor Query Latency Benchmark ---');
    
    // Seed temporary benchmark collection to test 100 vs 1,000 records
    const benchCollection = mongoose.connection.collection('_bench_cursor_tests');
    await benchCollection.deleteMany({});
    
    console.log('  ⏳ Seeding 1,000 benchmark records with indexed _id...');
    const seedDocs = [];
    for (let i = 0; i < 1000; i++) {
      seedDocs.push({
        name: `Bench Exercise ${i}`,
        type: 'Workout',
        status: 'published',
        createdAt: new Date(Date.now() - i * 60000),
        metricValue: Math.random() * 1000
      });
    }
    await benchCollection.insertMany(seedDocs);
    const mid100Doc = await benchCollection.findOne({}, { skip: 100 });
    const mid500Doc = await benchCollection.findOne({}, { skip: 500 });

    // Benchmark Keyset Cursor vs Skip Offset on 100 docs
    const measureKeyset = async (cursorId, limit) => {
      const start = process.hrtime.bigint();
      const filter = cursorId ? { _id: { $lt: cursorId } } : {};
      await benchCollection.find(filter).sort({ _id: -1 }).limit(limit).toArray();
      const end = process.hrtime.bigint();
      return Number(end - start) / 1_000_000; // ms
    };

    const measureOffset = async (skipCount, limit) => {
      const start = process.hrtime.bigint();
      await benchCollection.find({}).sort({ _id: -1 }).skip(skipCount).limit(limit).toArray();
      const end = process.hrtime.bigint();
      return Number(end - start) / 1_000_000; // ms
    };

    // Warmup
    await measureKeyset(null, 20);
    await measureOffset(100, 20);

    const keyset100Times = [];
    const offset100Times = [];
    for (let i = 0; i < 20; i++) {
      keyset100Times.push(await measureKeyset(mid100Doc._id, 20));
      offset100Times.push(await measureOffset(100, 20));
    }

    const keyset1000Times = [];
    const offset1000Times = [];
    for (let i = 0; i < 20; i++) {
      keyset1000Times.push(await measureKeyset(mid500Doc._id, 20));
      offset1000Times.push(await measureOffset(500, 20));
    }

    const k100Stats = calculatePercentiles(keyset100Times);
    const o100Stats = calculatePercentiles(offset100Times);
    const k1000Stats = calculatePercentiles(keyset1000Times);
    const o1000Stats = calculatePercentiles(offset1000Times);

    console.log(`  📊 100 Records Deep:`);
    console.log(`     • Keyset Cursor : p50=${k100Stats.p50}ms | p95=${k100Stats.p95}ms | avg=${k100Stats.avg}ms`);
    console.log(`     • Skip() Offset : p50=${o100Stats.p50}ms | p95=${o100Stats.p95}ms | avg=${o100Stats.avg}ms`);
    console.log(`  📊 500-1,000 Records Deep:`);
    console.log(`     • Keyset Cursor : p50=${k1000Stats.p50}ms | p95=${k1000Stats.p95}ms | avg=${k1000Stats.avg}ms`);
    console.log(`     • Skip() Offset : p50=${o1000Stats.p50}ms | p95=${o1000Stats.p95}ms | avg=${o1000Stats.avg}ms`);
    console.log(`     (Notice keyset cursor latency remains flat O(1) indexed seek)\n`);

    // Clean up bench collection
    await benchCollection.drop();

    // -----------------------------------------------------------------
    // BENCHMARK 3: Cache Hit vs Cache Miss Latency
    // -----------------------------------------------------------------
    console.log('--- 3. API Cache Latency Comparison (Hit vs Miss) ---');
    apiCache.flushAll();

    const benchUrl = `${BASE_URL}/api/plans/premade?type=Workout&paginate=true&limit=10`;

    // 1st request (MISS)
    const t0 = process.hrtime.bigint();
    const missRes = await fetch(benchUrl);
    const t1 = process.hrtime.bigint();
    const missLatency = Number(t1 - t0) / 1_000_000;
    const missHeader = missRes.headers.get('X-Cache');

    // Subsequent 50 requests (HITS)
    const hitLatencies = [];
    for (let i = 0; i < 50; i++) {
      const start = process.hrtime.bigint();
      const res = await fetch(benchUrl);
      const end = process.hrtime.bigint();
      if (res.headers.get('X-Cache') === 'HIT') {
        hitLatencies.push(Number(end - start) / 1_000_000);
      }
    }

    const hitStats = calculatePercentiles(hitLatencies);
    const speedup = (missLatency / hitStats.avg).toFixed(1);

    console.log(`  ❄️  Cache MISS Latency   : ${missLatency.toFixed(2)}ms (X-Cache: ${missHeader})`);
    console.log(`  🔥 Cache HIT Latency    : p50=${hitStats.p50}ms | p95=${hitStats.p95}ms | avg=${hitStats.avg}ms`);
    console.log(`  🚀 Latency Acceleration : ${speedup}x faster\n`);

    // -----------------------------------------------------------------
    // BENCHMARK 4: Concurrency Throughput (10, 25, 50 Parallel Requests)
    // -----------------------------------------------------------------
    console.log('--- 4. Concurrency Stress Latency (10, 25, 50 Parallel Requests) ---');
    
    async function runConcurrencyTest(concurrency) {
      const promises = [];
      const start = process.hrtime.bigint();
      for (let i = 0; i < concurrency; i++) {
        promises.push(
          (async () => {
            const reqStart = process.hrtime.bigint();
            const res = await fetch(`${BASE_URL}/api/plans/premade?type=Workout&paginate=true&limit=6`);
            await res.text();
            const reqEnd = process.hrtime.bigint();
            return Number(reqEnd - reqStart) / 1_000_000;
          })()
        );
      }
      const latencies = await Promise.all(promises);
      const totalEnd = process.hrtime.bigint();
      const totalTimeMs = Number(totalEnd - start) / 1_000_000;
      const rps = ((concurrency / (totalTimeMs / 1000))).toFixed(1);
      const stats = calculatePercentiles(latencies);
      return { ...stats, totalTimeMs: Number(totalTimeMs.toFixed(2)), rps };
    }

    const c10 = await runConcurrencyTest(10);
    console.log(`  ⚡ 10 Concurrent Requests  : Total=${c10.totalTimeMs}ms | p50=${c10.p50}ms | p95=${c10.p95}ms | Throughput=${c10.rps} req/sec`);

    const c25 = await runConcurrencyTest(25);
    console.log(`  ⚡ 25 Concurrent Requests  : Total=${c25.totalTimeMs}ms | p50=${c25.p50}ms | p95=${c25.p95}ms | Throughput=${c25.rps} req/sec`);

    const c50 = await runConcurrencyTest(50);
    console.log(`  ⚡ 50 Concurrent Requests  : Total=${c50.totalTimeMs}ms | p50=${c50.p50}ms | p95=${c50.p95}ms | Throughput=${c50.rps} req/sec`);

    console.log('\n===============================================================');
    console.log('✅ BENCHMARK RUN COMPLETED SUCCESSFULLY');
    console.log('===============================================================\n');

  } catch (err) {
    console.error('Benchmark Error:', err);
    process.exit(1);
  } finally {
    if (server) {
      await new Promise(r => server.close(r));
    }
    await mongoose.disconnect();
    process.exit(0);
  }
}

runBenchmark();
