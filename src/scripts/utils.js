const Utils = {
  formatAngka(n) { return Number(n || 0).toLocaleString("id-ID"); },
  toast(msg, type = "info") {
    const el = document.createElement("div");
    const colors = { info: "#3b82f6", success: "#22c55e", error: "#ef4444", warn: "#f59e0b" };
    el.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:${colors[type]||colors.info};color:#fff;padding:12px 24px;border-radius:12px;font-weight:600;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.3);font-size:14px;`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  },
  async api(action, params = {}) {
    try {
      const res = await fetch(CONFIG.API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...params })
      });
      return await res.json();
    } catch (e) { return { ok: false, error: e.message }; }
  },
  getSesi() { try { return JSON.parse(localStorage.getItem("pilkades_sesi") || "null"); } catch { return null; } },
  setSesi(d) { localStorage.setItem("pilkades_sesi", JSON.stringify(d)); },
  hapusSesi() { localStorage.removeItem("pilkades_sesi"); }
};
