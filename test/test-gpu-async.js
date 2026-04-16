#!/usr/bin/env node
// 模拟测试 GPU async chain 行为
// 用法: node test-gpu-async.js [delay_ms]
// delay_ms: 模拟 nvidia-smi 延迟（默认 6000 = 6秒）

const DELAY = parseInt(process.argv[2]) || 6000;
const INTERVAL = 10000; // 模拟 tick 间隔 10s
const TTL = 30000;

const FAKE_GPU_CSV = '0, NVIDIA GeForce RTX 3080, 45, 2048, 10240, 65, 120.5, 320.0, GPU-abc-123\n1, NVIDIA GeForce RTX 3080, 80, 8192, 10240, 72, 250.3, 320.0, GPU-def-456';
const FAKE_APPS_CSV = '12345, GPU-abc-123, 2048\n12346, GPU-def-456, 4096';

// ── 模拟 extension.js 的 GPU 状态变量 ──
let _gpuCache = [];
let _gpuCacheTime = 0;
let _gpuState = '';
let _gpuFirstCall = false;
let _smiChainRunning = false;
let _uuidToIdx = {};
let _uuidToMem = {};
let _gpuProcMap = {};
let _gpuMyIndices = [];

function dbg(msg) { console.log('[' + new Date().toISOString().slice(11, 23) + '] ' + msg); }

function parseGpuCsv(stdout) {
  return stdout.trim().split('\n').filter(Boolean).map(line => {
    const [idx, name, util, memUsed, memTotal, temp, pd, pl, uuid] = line.split(',').map(s => s.trim());
    return { idx: parseInt(idx), name, uuid: uuid || '', util: parseInt(util), memUsed: parseInt(memUsed), memTotal: parseInt(memTotal), temp: parseInt(temp), power: isNaN(parseFloat(pd)) ? null : { draw: parseFloat(pd).toFixed(0), limit: parseFloat(pl).toFixed(0) } };
  });
}

// Mock execFile: 延迟后返回假数据
function mockExecFile(cmd, args, opts, cb) {
  const query = args[0] || '';
  let output = '';
  if (query.includes('--query-gpu=index,name')) output = FAKE_GPU_CSV;
  else if (query.includes('--query-compute-apps')) output = FAKE_APPS_CSV;

  dbg(`  [mock] nvidia-smi 启动 (${query.slice(13, 40)}...) delay=${DELAY}ms`);
  
  const timer = setTimeout(() => {
    dbg(`  [mock] nvidia-smi 返回`);
    cb(null, output);
  }, DELAY);

  // 模拟超时
  if (opts.timeout && DELAY > opts.timeout) {
    clearTimeout(timer);
    setTimeout(() => {
      dbg(`  [mock] nvidia-smi 超时 (${opts.timeout}ms)`);
      cb(new Error('ETIMEDOUT'));
    }, opts.timeout);
  }
}

// Mock execFileSync
function mockExecFileSync(cmd, args, opts) {
  dbg(`  [mock] nvidia-smi SYNC (${DELAY}ms)`);
  if (DELAY > opts.timeout) throw new Error('spawnSync nvidia-smi ETIMEDOUT');
  return Buffer.from(FAKE_GPU_CSV);
}

// ── 复制 refreshGpuChain 和 getAllGpus (2-step chain) ──
function refreshGpuChain() {
  if (_smiChainRunning) return;
  _smiChainRunning = true;
  // Step 1: GPU stats + UUID mapping
  mockExecFile('nvidia-smi', ['--query-gpu=index,name,...,gpu_uuid', '--format=csv,noheader,nounits'], { timeout: 15000 }, (err, stdout) => {
    if (err) {
      const s = _gpuCache.length > 0 ? 'fallback' : 'unavailable';
      if (s !== _gpuState) { dbg('gpu snapshot ' + s + ': ' + err.message); _gpuState = s; }
    } else {
      const parsed = parseGpuCsv(stdout);
      if (parsed.length > 0 || _gpuCache.length === 0) {
        _gpuCache = parsed;
        _gpuCacheTime = Date.now();
        _uuidToIdx = {}; _uuidToMem = {};
        for (const g of parsed) { _uuidToIdx[g.uuid] = g.idx; _uuidToMem[g.uuid] = g.memTotal; }
      }
      if (_gpuState !== 'fresh') { dbg('gpu snapshot fresh (' + _gpuCache.length + ' gpus)'); _gpuState = 'fresh'; }
      if (_onGpuReady) { _onGpuReady(); _onGpuReady = null; }
    }
    // Step 2: compute apps — UUID mapping comes from Step 1
    mockExecFile('nvidia-smi', ['--query-compute-apps=pid,...', '--format=csv,noheader,nounits'], { timeout: 15000 }, (err2, appOut) => {
      _smiChainRunning = false;
      if (err2 || !appOut.trim()) return;
      dbg('chain complete — GPU proc data updated');
      if (_onChainDone) { _onChainDone(); _onChainDone = null; }
    });
  });
}

function getAllGpus() {
  refreshGpuChain();
  if (_gpuCacheTime > 0 && Date.now() - _gpuCacheTime > TTL) {
    dbg('⚠ TTL expired! clearing cache');
    _gpuCache = [];
    _gpuCacheTime = 0;
  }
  return _gpuCache;
}

// ── 模拟 _onGpuReady / _onChainDone 回调 ──
let _onGpuReady = null;
let _onChainDone = null;

// ── 模拟 tick ──
let tickCount = 0;
function tick() {
  tickCount++;
  const t0 = Date.now();
  const gpus = getAllGpus();
  const elapsed = Date.now() - t0;
  const loading = gpus.length === 0 && _gpuState === '';
  dbg(`tick #${tickCount}: ${gpus.length} GPUs, elapsed=${elapsed}ms, cacheAge=${_gpuCacheTime ? Math.round((Date.now() - _gpuCacheTime) / 1000) + 's' : 'none'}${loading ? ' [显示: 加载中…]' : ''}`);
}

// ── 运行 ──
console.log(`\n模拟参数: nvidia-smi delay=${DELAY}ms, interval=${INTERVAL}ms, TTL=${TTL}ms\n`);
console.log('=== tick 1 (全异步) ===');
tick();
// Register one-shot callback for immediate update when GPU data arrives
_onGpuReady = () => {
  console.log('\n=== 回调 tick (GPU 数据到达!) ===');
  tick();
};
_onChainDone = () => {
  console.log('\n=== 回调 tick (链完成, 进程GPU标签就绪!) ===');
  tick();
};

const timer = setInterval(() => {
  console.log(`\n=== tick ${tickCount + 1} ===`);
  tick();
  if (tickCount >= 6) {
    clearInterval(timer);
    console.log('\n模拟结束。');
    process.exit(0);
  }
}, INTERVAL);
