import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "../config/supabase.js";
import { connection } from "../config/solana.js";

export async function statusPageRoute(app: FastifyInstance): Promise<void> {
  app.get("/", async (_req: FastifyRequest, reply: FastifyReply) => {
    // ─── Health Checks ───
    let dbOk = false;
    let rpcOk = false;

    try {
      await supabase.from("protocol").select("id").limit(1);
      dbOk = true;
    } catch { /* ignore */ }

    try {
      await connection.getSlot();
      rpcOk = true;
    } catch { /* ignore */ }

    const isHealthy = dbOk && rpcOk;

    // ─── Uptime & Memory ───
    const uptime = process.uptime();
    const days = Math.floor(uptime / (3600 * 24));
    const hours = Math.floor((uptime % (3600 * 24)) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    
    const memoryUsage = process.memoryUsage();
    const usedMemory = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
    const serverTime = new Date().toISOString();
    
    const nodeEnv = process.env.NODE_ENV || "development";

    const badgeColor = isHealthy ? "#22c55e" : "#fbbf24";
    const badgeBg = isHealthy ? "rgba(34, 197, 94, 0.15)" : "rgba(251, 191, 36, 0.15)";
    const badgeText = isHealthy ? "ONLINE" : "DEGRADED";
    const badgeTextCol = isHealthy ? "#3dd9a0" : "#fbbf24";

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ball Sort | System Status</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%230d0d1e'/%3E%3Ccircle cx='16' cy='9' r='4' fill='%23ff2d8b'/%3E%3Ccircle cx='9' cy='16' r='4' fill='%234d9fff'/%3E%3Ccircle cx='23' cy='16' r='4' fill='%23ffd93d'/%3E%3Ccircle cx='16' cy='23' r='4' fill='%233dd9a0'/%3E%3Ccircle cx='16' cy='16' r='6' fill='%23ffffff'/%3E%3C/svg%3E">
  <style>
    :root {
      --font-syne: 'Syne', sans-serif;
      --font-outfit: 'Outfit', sans-serif;
    }
    
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600&family=Syne:wght@700;800&display=swap');

    body {
      background-color: #07070f;
      color: #f0f0fa;
      font-family: var(--font-outfit);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      overflow: hidden;
    }

    /* ─── Preloader Animations ─── */
    @keyframes preloaderFadeOut {
      from { opacity: 1; }
      to { opacity: 0; pointer-events: none; visibility: hidden; }
    }
    @keyframes preloaderBallIn {
      from { opacity: 0; transform: scale(0); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes waveBounce0 {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-18px); }
    }
    @keyframes waveBounce1 {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(18px); }
    }
    @keyframes waveBounce2 {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-18px); }
    }
    @keyframes waveBounce3 {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(18px); }
    }
    @keyframes spinToDiamond {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes centerBallIn {
      from { opacity: 0; transform: scale(0); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes centerGlowPulse {
      0%, 100% { box-shadow: 0 0 12px #ffffffaa, 0 0 24px rgba(255,45,139,0.5), 0 0 36px rgba(180,77,255,0.3); }
      50% { box-shadow: 0 0 24px #ffffffff, 0 0 48px rgba(255,45,139,0.8), 0 0 72px rgba(180,77,255,0.5); }
    }
    
    /* ─── Preloader Container ─── */
    #preloader {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: #07070f;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      animation: preloaderFadeOut 0.7s ease 4.5s forwards;
    }
    
    .ambient-glow {
      position: absolute;
      width: 260px;
      height: 260px;
      border-radius: 50%;
      background: radial-gradient(ellipse, rgba(255,45,139,0.06) 0%, transparent 70%);
      pointer-events: none;
    }
    
    .anim-area {
      position: relative;
      width: 80px;
      height: 80px;
      animation: spinToDiamond 0.8s cubic-bezier(0.34,1.56,0.64,1) 2.3s forwards;
    }
    
    .ball {
      position: absolute;
      border-radius: 50%;
      width: 16px;
      height: 16px;
      transition: left 0.7s cubic-bezier(0.34, 1.56, 0.64, 1),
                  top 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    
    /* Ball Colors */
    .b0 { background: radial-gradient(circle at 35% 35%, #ff2d8bff, #ff2d8b88); box-shadow: 0 0 10px #ff2d8baa, 0 0 20px #ff2d8b33; }
    .b1 { background: radial-gradient(circle at 35% 35%, #4d9fffff, #4d9fff88); box-shadow: 0 0 10px #4d9fffaa, 0 0 20px #4d9fff33; }
    .b2 { background: radial-gradient(circle at 35% 35%, #3dd9a0ff, #3dd9a088); box-shadow: 0 0 10px #3dd9a0aa, 0 0 20px #3dd9a033; }
    .b3 { background: radial-gradient(circle at 35% 35%, #ffd93dff, #ffd93d88); box-shadow: 0 0 10px #ffd93daa, 0 0 20px #ffd93d33; }
    
    /* Ball Animations */
    .b0 { animation: preloaderBallIn 0.3s ease 0.0s both, waveBounce0 0.6s cubic-bezier(0.36, 0, 0.66, 1) 0.50s infinite; }
    .b1 { animation: preloaderBallIn 0.3s ease 0.1s both, waveBounce1 0.6s cubic-bezier(0.36, 0, 0.66, 1) 0.62s infinite; }
    .b2 { animation: preloaderBallIn 0.3s ease 0.2s both, waveBounce2 0.6s cubic-bezier(0.36, 0, 0.66, 1) 0.74s infinite; }
    .b3 { animation: preloaderBallIn 0.3s ease 0.3s both, waveBounce3 0.6s cubic-bezier(0.36, 0, 0.66, 1) 0.86s infinite; }
    
    /* Phase 2 Diamond Formation (Triggered via JS timeout) */
    .diamond-mode .b0 { animation: none; left: 32px !important; top: 12px !important; }
    .diamond-mode .b1 { animation: none; left: 12px !important; top: 32px !important; }
    .diamond-mode .b2 { animation: none; left: 52px !important; top: 32px !important; }
    .diamond-mode .b3 { animation: none; left: 32px !important; top: 52px !important; }
    
    .center-ball {
      position: absolute;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: radial-gradient(circle at 35% 35%, #ffffff, #e0d0ffdd);
      left: 29px;
      top: 29px;
      z-index: 2;
      opacity: 0;
      animation: centerBallIn 0.4s cubic-bezier(0.34,1.56,0.64,1) 3.3s both, 
                 centerGlowPulse 1.8s ease-in-out 3.65s infinite;
    }
    
    /* ─── Status Dashboard ─── */
    .dashboard {
      background: rgba(14, 15, 27, 0.7);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 20px;
      padding: 40px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.05) inset;
      opacity: 0;
      transform: translateY(20px);
      animation: slideUpIn 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 4.8s forwards;
    }
    
    @keyframes slideUpIn {
      to { opacity: 1; transform: translateY(0); }
    }
    
    /* ─── Branding Header ─── */
    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding-bottom: 24px;
      margin-bottom: 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    
    /* Static Diamond Logo */
    .logo-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(3, 1fr);
      gap: 2px;
      align-items: center;
      justify-items: center;
      width: 45px;
      height: 45px;
      position: relative;
    }
    
    .lb { width: 11px; height: 11px; border-radius: 50%; }
    .lb0 { grid-area: 1 / 2; background: radial-gradient(circle at 35% 35%, #ff2d8bee, #ff2d8b88); box-shadow: 0 0 8px #ff2d8baa; }
    .lb1 { grid-area: 2 / 1; background: radial-gradient(circle at 35% 35%, #4d9fffee, #4d9fff88); box-shadow: 0 0 8px #4d9fffaa; }
    .lb2 { grid-area: 2 / 3; background: radial-gradient(circle at 35% 35%, #3dd9a0ee, #3dd9a088); box-shadow: 0 0 8px #3dd9a0aa; }
    .lb3 { grid-area: 3 / 2; background: radial-gradient(circle at 35% 35%, #ffd93dee, #ffd93d88); box-shadow: 0 0 8px #ffd93daa; }
    .lc {
      grid-area: 2 / 2;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: radial-gradient(circle at 35% 35%, #ffffff, #b44dffdd);
      box-shadow: 0 0 12px white;
      z-index: 2;
    }
    
    .brand-name {
      font-family: var(--font-syne);
      font-weight: 800;
      font-size: 1.6rem;
      letter-spacing: -0.02em;
    }
    .brand-name span { color: #ff2d8b; }
    
    .status-badge {
      margin-left: auto;
      background: ${badgeBg};
      color: ${badgeTextCol};
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .dot {
      width: 6px;
      height: 6px;
      background: ${badgeColor};
      border-radius: 50%;
      box-shadow: 0 0 8px ${badgeColor};
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    /* ─── Metrics ─── */
    .metric {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      font-size: 0.95rem;
    }
    .metric:last-of-type { border-bottom: none; }
    .label { color: #8888aa; font-weight: 500; }
    .value { font-family: monospace; font-size: 1.05rem; font-weight: 600; color: #e2e8f0; }
    .value.highlight { color: #4d9fff; text-shadow: 0 0 10px rgba(77, 159, 255, 0.3); }
    
    .stat-ok { color: #22c55e; }
    .stat-err { color: #ef4444; }

    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 0.75rem;
      color: #555577;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
  </style>
</head>
<body>

  <!-- Preloader Fullscreen Overlay -->
  <div id="preloader">
    <div class="ambient-glow"></div>
    <div class="anim-area" id="animArea">
      <!-- Horizontal layout initially (x: 10, 30, 50, 70) -->
      <div class="ball b0" style="left: 2px; top: 32px;"></div>
      <div class="ball b1" style="left: 22px; top: 32px;"></div>
      <div class="ball b2" style="left: 42px; top: 32px;"></div>
      <div class="ball b3" style="left: 62px; top: 32px;"></div>
      <div class="center-ball"></div>
    </div>
  </div>

  <!-- Status Dashboard -->
  <div class="dashboard">
    <div class="header">
      <div class="logo-grid">
        <div class="lb lb0"></div>
        <div class="lb lb1"></div>
        <div class="lb lb2"></div>
        <div class="lb lb3"></div>
        <div class="lc"></div>
      </div>
      <div class="brand-name">Ball<span>Sort</span> Nodes</div>
      <div class="status-badge"><span class="dot"></span> ${badgeText}</div>
    </div>

    <div class="metric">
      <span class="label">Database Connection</span>
      <span class="value ${dbOk ? 'stat-ok' : 'stat-err'}">${dbOk ? 'CONNECTED' : 'FAILED'}</span>
    </div>
    <div class="metric">
      <span class="label">Solana RPC Endpoint</span>
      <span class="value ${rpcOk ? 'stat-ok' : 'stat-err'}">${rpcOk ? 'CONNECTED' : 'FAILED'}</span>
    </div>
    <div class="metric">
      <span class="label">System Uptime</span>
      <span class="value highlight" id="uptime-val" data-uptime="${uptime}">${uptimeString}</span>
    </div>
    <div class="metric">
      <span class="label">Memory Active</span>
      <span class="value">${usedMemory} MB</span>
    </div>
    <div class="metric">
      <span class="label">Server Time</span>
      <span class="value" id="server-time-val" data-time="${serverTime}">${serverTime}</span>
    </div>
    
    <div class="footer">API ${isHealthy ? 'Operational' : 'Degraded'} &bull; Base route mounted at /api</div>
  </div>

  <script>
    // Trigger Phase 2 (Diamond Formation) at 1.8s
    setTimeout(() => {
      document.getElementById('animArea').classList.add('diamond-mode');
    }, 1800);

    // Live Uptime & Server Time Counters
    const uptimeEl = document.getElementById('uptime-val');
    const timeEl = document.getElementById('server-time-val');
    
    let currentUptime = parseFloat(uptimeEl.getAttribute('data-uptime'));
    let currentServerTime = new Date(timeEl.getAttribute('data-time'));
    
    setInterval(() => {
      // Uptime
      currentUptime += 1;
      const days = Math.floor(currentUptime / (3600 * 24));
      const hours = Math.floor((currentUptime % (3600 * 24)) / 3600);
      const minutes = Math.floor((currentUptime % 3600) / 60);
      const seconds = Math.floor(currentUptime % 60);
      uptimeEl.textContent = \`\${days}d \${hours}h \${minutes}m \${seconds}s\`;
      
      // Server Time
      currentServerTime = new Date(currentServerTime.getTime() + 1000);
      timeEl.textContent = currentServerTime.toISOString();
    }, 1000);
  </script>
</body>
</html>
    `;
    
    // Send 503 if health checks fail, 200 otherwise
    reply.status(isHealthy ? 200 : 503).type("text/html").send(html);
  });
}
