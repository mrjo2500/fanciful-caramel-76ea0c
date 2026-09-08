MR JOO CLOUD LIVE — iPhone only

This build uses a managed third-party TikTok LIVE WebSocket instead of TikFinity Desktop/localhost.
Endpoint: wss://api.tik.tools?uniqueId=USERNAME&apiKey=YOUR_KEY

Setup:
1) Create a free API key at https://tik.tools/
2) Host this folder on any HTTPS static host.
3) Open the game URL once and enter your TikTok username. The Cloud API key is handled server-side by the Netlify Function.
4) In Streamlabs Mobile add the hosted game URL as a Web/Browser source if your Streamlabs build exposes that source.
5) Keep the TikTok LIVE active.

No computer is required for the game client.

Events handled:
- chat -> answer checking
- gift -> supporter score; 5 Fame Arrows reveal letters
- like -> Top Likers / Top Actives and 10/100 like messages
- share -> pinned thank-you
- roomUser / roomUserSeq -> viewer count

Important: this is a third-party managed API, not an official TikTok LIVE API and not TikFinity.
