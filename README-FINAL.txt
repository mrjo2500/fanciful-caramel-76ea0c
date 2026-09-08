MR JOO CLOUD LIVE — FINAL BUILD

- 500 questions from data.js.
- User portrait replaced with the supplied MR JOO portrait.
- Fixed photographic background uses the supplied portrait with a dark neon treatment so the live overlay remains readable.
- Live overlay handles comments, likes, gifts, shares, follows and viewer counts.
- Correct answers advance the question automatically.
- Gift/shares/likes update the visible rankings and event messages.
- Cloud TikTok connection uses /.netlify/functions/tik-jwt.

DEPLOYMENT:
Set the Netlify environment variable TIKTOOL_API_KEY before deploying.
Then open the deployed site, enter the TikTok username once, and use the deployed page URL as a Browser Source in Streamlabs/OBS.
