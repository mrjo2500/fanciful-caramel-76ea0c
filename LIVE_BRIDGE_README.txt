MR JOO LIVE BRIDGE

The project now contains live-bridge.js, an isolated browser event bridge.
It is intentionally secret-free.

The remaining external connection is the Streamlabs/TikTok LIVE event relay:
TikTok LIVE -> Streamlabs/relay -> normalized event -> MrJooLiveBridge.emit(event)

Do not put TikTok/Streamlabs access tokens in frontend files.
