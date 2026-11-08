# UREC Live privacy website

Standalone HTML/CSS site for Render. No packages, scripts, cookies, analytics or form database. Email requests are submitted by the visitor through their email service, not by this website.

## Publication prerequisites

The public contact is `mdasthanmay@gmail.com`, with deletion completed within 30 days after verification, as confirmed by the owner. These values are configured in `config.json`. The release build refuses missing contact or timeframe values. Preview mode visibly marks every page as a draft.

The source audit covers account/Google sign-in, profile visibility/bio, workouts/plans, gym activity, reports, social messages, camera scanning and local caches. Actual production configuration and provider retention have not been audited. Before publication, confirm the operator identity matches the Play listing, actual hosting/database/email providers, any additional SDKs or health integrations in the submitted build, backup retention, and that your team can perform all promised deletions. Add specific backup/exception periods when confirmed; the current text discloses that periods are explained in the response rather than inventing them.

The page creates a manual request channel; it does not implement backend account erasure. The current app profile has no deletion entry. Add a clearly labeled **Delete account** link in the app to the final `/delete-account/` URL before Play submission. Do not claim automatic deletion is implemented.

## Local preview

```sh
cd privacy-site
python3 build.py --preview
python3 -m http.server 4173 --directory public --bind 127.0.0.1
```

Visit http://127.0.0.1:4173/ then open both links. Check the mobile layout and keyboard focus. With confirmed configuration, run `python3 build.py`; check that the deletion button opens an email addressed correctly with the expected subject/body. Send a real request yourself to verify mailbox receipt and processing; no email is sent by the build or this preview.

## Render deployment

This site lives in the existing `urec-live-app` repository under `privacy-site/`. In Render choose **New → Static Site**, connect `https://github.com/urec-live/urec-live-app`, and select the branch containing these files after it has been pushed.

- Root Directory: `privacy-site`
- Build command: `python3 build.py`
- Publish directory: `public`

Alternatively create a Blueprint with Blueprint Path `privacy-site/render.yaml`; it sets `rootDir: privacy-site`. No SPA rewrite is needed; each route has an actual index.html. Set the included security headers in the dashboard if using manual Static Site setup. The site builds independently from Expo and needs no app dependencies.

After deployment verify all three public routes without signing in:

- `https://YOUR-SITE.onrender.com/`
- `https://YOUR-SITE.onrender.com/privacy/` — Play Console privacy policy URL
- `https://YOUR-SITE.onrender.com/delete-account/` — Play Console account deletion URL

Open the deletion email link and verify delivery. Test the same URL from the app's deletion entry on Android. Keep the Play Data safety declaration aligned with the shipped app and policy. Public deployment and request fulfillment remain separate acceptance checks.
