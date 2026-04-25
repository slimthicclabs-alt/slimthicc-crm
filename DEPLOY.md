# Deploy Slimthicc CRM For Two People

You and your partner are in different states, so you need a public web URL. This project is set up as a tiny Node web app with one shared data file and optional passcode protection.

## Recommended: Render With A Persistent Disk

1. Put this folder in a GitHub repository.
2. Go to Render and create a new web service from that repository.
3. Use these settings:
   - Build command: `npm install --omit=dev`
   - Start command: `npm start`
   - Health check path: `/healthz`
4. Add environment variables:
   - `DATA_DIR` = `/var/data`
   - `CRM_PASSCODE` = a private passcode you and your partner share
5. Add a persistent disk:
   - Mount path: `/var/data`
   - Size: `1 GB`
6. Deploy.
7. Open the Render URL, enter the passcode, and share that same URL/passcode with your partner.

## How Sharing Works

When hosted online, both browsers talk to the same `/api/stores` endpoint. Store edits are saved to the persistent data file at `stores.json`, and each browser checks for updates every few seconds.

## Important

Do not deploy this without `CRM_PASSCODE` unless you are comfortable with anyone who has the URL opening the CRM.
