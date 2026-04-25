# Slimthicc Store CRM

A self-contained browser CRM for managing store relationships, wholesale outreach, follow-ups, and projected monthly orders for Slimthicc.

## Open It Solo

Open `index.html` in a browser. The CRM saves changes in your browser storage, so added stores and edits persist on the same computer/browser.

## Use It Together On The Same Wi-Fi

Run the shared CRM server from this folder:

```bash
node server.js
```

Then open the `http://localhost:...` link on your computer. Your partner can open the `Partner link` shown in the same window if you are both on the same Wi-Fi.

When opened this way, both browsers use the same store list in `data/stores.json`. The app also refreshes shared changes every few seconds.

## Use It Together From Different States

Because you are in NY and your partner is in California, the local partner link will not work. You need to host the CRM online with a small Node app host.

This project is ready for that. See `DEPLOY.md` for the full walkthrough.

- Start command: `npm start`
- App entry file: `server.js`
- Port: uses the host's `PORT` automatically
- Shared data file: `data/stores.json`, or `DATA_DIR/stores.json` if you set `DATA_DIR`
- Optional passcode: set `CRM_PASSCODE` so only you and your partner can open it
- Render blueprint: `render.yaml`

For a real shared CRM, deploy it to a host that supports persistent storage. Set `CRM_PASSCODE` to a private passcode, then share the public URL and passcode with your partner.

## Included

- Pipeline board for Prospect, Contacted, Sample Sent, Negotiating, and Stockist stores
- Account table for scanning store, contact, stage, region, next step, and monthly value
- Follow-up task view sorted by due date
- Add, edit, and delete store accounts
- Search, region filtering, and quick filters for hot, due, and buyer-led relationships
- CSV export for store data
- Starter sample accounts so the CRM feels alive immediately
