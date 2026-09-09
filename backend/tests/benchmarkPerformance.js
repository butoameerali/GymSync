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
  const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
  const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
  const avg = sorted.reduce((sum, v) => sum + v, 0) / (sorted.length || 1);
  return {
    p50: Number(p50.toFixed(2)),
    p95: Number(p95.toFixed(2)),
    p99: Number(p99.toFixed(2)),
    avg: Number(avg.toFixed(2))
  };
}

async function runBenchmark() {
  console.log('===============================================================');
  console.log('🔬 GYMSYNC CONTROLLED PERFORMANCE & SCALABILITY BENCHMARK SUITE');
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
    // BENCHMARK 1: Over-The-Wire Payload Size Reduction
    // -----------------------------------------------------------------
    console.log('--- 1. Over-The-Wire Payload Size Reduction Benchmark ---');
    
    // 1.1 Workout Plan DTO vs Full Detail
    const planDetailSample = await PreMadePlan.findOne({ type: 'Workout', status: 'published' }).lean();
    if (planDetailSample) {
      const fullPlanBytes = Buffer.byteLength(JSON.stringify(planDetailSample), 'utf8');
      const cardPlanRes = await fetch(`${BASE_URL}/api/plans/premade?type=Workout&paginate=true&limit=1`);
      const cardPlanData = await cardPlanRes.json();
      const planCardSample = cardPlanData.items?.[0] || {};
      const cardPlanBytes = Buffer.byteLength(JSON.stringify(planCardSample), 'utf8');
      const planReductionPct = ((fullPlanBytes - cardPlanBytes) / fullPlanBytes * 100).toFixed(1);

      console.log(`  📦 Workout Plan Full Object : ${fullPlanBytes} bytes`);
      console.log(`  📦 Workout Plan Card DTO    : ${cardPlanBytes} bytes`);
      console.log(`  📉 Payload Reduction        : -${planReductionPct}%`);
    }

    // 1.2 Article DTO vs Full Markdown Article
    const articleDetailSample = await Article.findOne({ status: 'published' }).lean();
    if (articleDetailSample) {
      const fullArticleBytes = Buffer.byteLength(JSON.stringify(articleDetailSample), 'utf8');
      const cardArticleRes = await fetch(`${BASE_URL}/api/articles?limit=1`);
      const cardArticleList = await cardArticleRes.json();
      const cardArticleSample = Array.isArray(cardArticleList) ? cardArticleList[0] : (cardArticleList.items?.[0] || {});
      const cardArticleBytes = Buffer.byteLength(JSON.stringify(cardArticleSample), 'utf8');
      const articleReductionPct = ((fullArticleBytes - cardArticleBytes) / fullArticleBytes * 100).toFixed(1);

      console.log(`  📦 Article Full Document   : ${fullArticleBytes} bytes`);
      console.log(`  📦 Article Card DTO        : ${cardArticleBytes} bytes (server-side excerpt, omits full markdown)`);
      console.log(`  📉 Payload Reduction        : -${articleReductionPct}%`);
    }

    // 1.3 Exercise DTO vs Full Exercise
    const exerciseDetailSample = await Exercise.findOne().lean();
    if (exerciseDetailSample) {
      const fullExBytes = Buffer.byteLength(JSON.stringify(exerciseDetailSample), 'utf8');
      const cardExRes = await fetch(`${BASE_URL}/api/exercises?paginate=true&limit=1`);
      const cardExData = await cardExRes.json();
      const cardExSample = cardExData.items?.[0] || {};
      const cardExBytes = Buffer.byteLength(JSON.stringify(cardExSample), 'utf8');
      const exReductionPct = ((fullExBytes - cardExBytes) / fullExBytes * 100).toFixed(1);

      console.log(`  📦 Exercise Full Detail    : ${fullExBytes} bytes`);
      console.log(`  📦 Exercise Card DTO       : ${cardExBytes} bytes`);
      console.log(`  📉 Payload Reduction        : -${exReductionPct}%\n`);
    }

    // -----------------------------------------------------------------
    // BENCHMARK 2: Real MongoDB explain("executionStats") Profiling
    // -----------------------------------------------------------------
    console.log('--- 2. Real MongoDB Query Execution Analysis (explain: executionStats) ---');
    
    // 2.1 PreMadePlan Query Profile
    const planExplain = await PreMadePlan.find({ type: 'Workout', status: 'published' })
      .sort({ _id: -1 })
      .limit(20)
      .explain('executionStats');
    
    const planStats = planExplain.executionStats || {};
    console.log(`  🔍 PreMadePlan Catalogue Query:`);
    console.log(`     • executionTimeMillis : ${planStats.executionTimeMillis} ms`);
    console.log(`     • totalKeysExamined   : ${planStats.totalKeysExamined}`);
    console.log(`     • totalDocsExamined   : ${planStats.totalDocsExamined}`);
    console.log(`     • nReturned           : ${planStats.nReturned}`);
    console.log(`     • indexUsed           : ${planExplain.queryPlanner?.winningPlan?.inputStage?.indexName || planExplain.queryPlanner?.winningPlan?.indexName || 'COLLSCAN/STAGE'}`);

    // 2.2 Exercise Query Profile
    const exExplain = await Exercise.find({ status: 'published', category: 'Strength' })
      .sort({ _id: -1 })
      .limit(24)
      .explain('executionStats');
    
    const exStats = exExplain.executionStats || {};
    console.log(`  🔍 Exercise Catalogue Query:`);
    console.log(`     • executionTimeMillis : ${exStats.executionTimeMillis} ms`);
    console.log(`     • totalKeysExamined   : ${exStats.totalKeysExamined}`);
    console.log(`     • totalDocsExamined   : ${exStats.totalDocsExamined}`);
    console.log(`     • nReturned           : ${exStats.nReturned}`);
    console.log(`     • indexUsed           : ${exExplain.queryPlanner?.winningPlan?.inputStage?.indexName || exExplain.queryPlanner?.winningPlan?.indexName || 'COLLSCAN/STAGE'}`);

    // 2.3 Article Query Profile
    const artExplain = await Article.find({ status: 'published', category: 'Nutrition' })
      .sort({ _id: -1 })
      .limit(12)
      .explain('executionStats');
    
    const artStats = artExplain.executionStats || {};
    console.log(`  🔍 Article Catalogue Query:`);
    console.log(`     • executionTimeMillis : ${artStats.executionTimeMillis} ms`);
    console.log(`     • totalKeysExamined   : ${artStats.totalKeysExamined}`);
    console.log(`     • totalDocsExamined   : ${artStats.totalDocsExamined}`);
    console.log(`     • nReturned           : ${artStats.nReturned}`);
    console.log(`     • indexUsed           : ${artExplain.queryPlanner?.winningPlan?.inputStage?.indexName || artExplain.queryPlanner?.winningPlan?.indexName || 'COLLSCAN/STAGE'}\n`);

    // -----------------------------------------------------------------
    // BENCHMARK 3: Controlled Scalability Testing across Dataset Tiers
    // -----------------------------------------------------------------
    console.log('--- 3. Controlled Scalability Across Dataset Depths (Current Implementation) ---');
    const benchColl = mongoose.connection.collection('_bench_controlled_scalability');
    await benchColl.drop().catch(() => {});
    await benchColl.createIndex({ status: 1, _id: -1 });

    const TIERS = [100, 1000, 5000, 10000];
    let currentCount = 0;

    for (const tierTarget of TIERS) {
      const docsToInsert = [];
      const countNeeded = tierTarget - currentCount;
      for (let i = 0; i < countNeeded; i++) {
        docsToInsert.push({
          title: `Bench Item ${currentCount + i}`,
          status: 'published',
          category: 'Strength',
          createdAt: new Date(Date.now() - (currentCount + i) * 60000)
        });
      }
      if (docsToInsert.length > 0) {
        await benchColl.insertMany(docsToInsert);
        currentCount = tierTarget;
      }

      // Sample a cursor at the 80% depth mark
      const sampleSkip = Math.floor(tierTarget * 0.8);
      const sampleCursorDoc = await benchColl.find({ status: 'published' }).sort({ _id: -1 }).skip(sampleSkip).limit(1).toArray();
      const cursorId = sampleCursorDoc[0]?._id;

      // Measure Keyset Cursor Latency (p50, p95)
      const keysetTimes = [];
      for (let r = 0; r < 15; r++) {
        const t0 = process.hrtime.bigint();
        await benchColl.find({ status: 'published', _id: { $lt: cursorId } }).sort({ _id: -1 }).limit(20).toArray();
        const t1 = process.hrtime.bigint();
        keysetTimes.push(Number(t1 - t0) / 1_000_000);
      }
      const keysetStats = calculatePercentiles(keysetTimes);

      // Measure Offset Skip Latency (p50, p95)
      const offsetTimes = [];
      for (let r = 0; r < 15; r++) {
        const t0 = process.hrtime.bigint();
        await benchColl.find({ status: 'published' }).sort({ _id: -1 }).skip(sampleSkip).limit(20).toArray();
        const t1 = process.hrtime.bigint();
        offsetTimes.push(Number(t1 - t0) / 1_000_000);
      }
      const offsetStats = calculatePercentiles(offsetTimes);

      console.log(`  📊 Dataset Tier: ${tierTarget.toLocaleString()} Records (Depth: 80% | Skip: ${sampleSkip})`);
      console.log(`     • Keyset Cursor (_id < cursor) : p50=${keysetStats.p50}ms | p95=${keysetStats.p95}ms | avg=${keysetStats.avg}ms`);
      console.log(`     • Offset Query (skip(${sampleSkip})) : p50=${offsetStats.p50}ms | p95=${offsetStats.p95}ms | avg=${offsetStats.avg}ms`);
    }

    await benchColl.drop().catch(() => {});
    console.log();

    // -----------------------------------------------------------------
    // BENCHMARK 4: API Cache Latency Comparison (Hit vs Miss)
    // -----------------------------------------------------------------
    console.log('--- 4. API Cache Latency Comparison (Hit vs Miss) ---');
    await apiCache.flushAll();

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
    const speedup = (missLatency / (hitStats.avg || 1)).toFixed(1);

    console.log(`  ❄️  Cache MISS Latency   : ${missLatency.toFixed(2)}ms (X-Cache: ${missHeader})`);
    console.log(`  🔥 Cache HIT Latency    : p50=${hitStats.p50}ms | p95=${hitStats.p95}ms | avg=${hitStats.avg}ms`);
    console.log(`  🚀 Latency Acceleration : ${speedup}x faster\n`);

    // -----------------------------------------------------------------
    // BENCHMARK 5: Concurrency Stress Throughput (10, 25, 50, 100 Clients)
    // -----------------------------------------------------------------
    console.log('--- 5. Concurrency Load Test (Current Implementation Benchmark) ---');
    
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
      const rps = (concurrency / (totalTimeMs / 1000)).toFixed(1);
      const stats = calculatePercentiles(latencies);
      return { ...stats, totalTimeMs: Number(totalTimeMs.toFixed(2)), rps };
    }

    for (const c of [10, 25, 50, 100]) {
      const res = await runConcurrencyTest(c);
      console.log(`  ⚡ ${c.toString().padEnd(3)} Concurrent Requests : Total=${res.totalTimeMs}ms | p50=${res.p50}ms | p95=${res.p95}ms | p99=${res.p99}ms | Throughput=${res.rps} req/sec`);
    }

    console.log('\n===============================================================');
    console.log('✅ BENCHMARK SUITE EXECUTION COMPLETE');
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
