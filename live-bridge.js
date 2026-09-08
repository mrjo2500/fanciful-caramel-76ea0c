/**
 * MR JOO LIVE BRIDGE
 * Browser-side event bridge for normalized TikTok/Streamlabs live events.
 * It does NOT expose secrets. A backend/relay should POST normalized events here.
 *
 * Accepted event shape:
 * { type: "comment"|"gift"|"like"|"follow"|"viewer", user, text, value, timestamp }
 */
(function () {
  const listeners = new Set();
  window.MrJooLiveBridge = {
    on(fn) { if (typeof fn === "function") listeners.add(fn); return () => listeners.delete(fn); },
    emit(event) {
      const e = Object.assign({ timestamp: Date.now() }, event || {});
      listeners.forEach(fn => { try { fn(e); } catch (_) {} });
      window.dispatchEvent(new CustomEvent("mrjoo:live", { detail: e }));
    }
  };
})();
