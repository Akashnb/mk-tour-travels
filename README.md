# M.K. Tour & Travels website

Static website: HTML, CSS and vanilla JavaScript. No build step, no frameworks.

## Before you publish (checklist)
1. **Domain:** replace `YOUR-DOMAIN.com` with your real domain in every file.
   Mac/Linux: `grep -rl YOUR-DOMAIN.com . | xargs sed -i 's/YOUR-DOMAIN.com/yourdomain.com/g'`
   Windows: use Find and Replace in a text editor on `index.html`, `privacy-policy.html`, `robots.txt`, `sitemap.xml` and `.well-known/security.txt`.
2. **Instagram:** in `index.html`, change the footer link `https://www.instagram.com/` to your profile.
3. **Font (optional):** download Poppins 400, 500, 600, 700 and 800 as `.woff2` and save them in a `fonts` folder as `poppins-400.woff2` and so on.
4. **Google photos (optional):** paste a Google Places API key into `script.js` (`GOOGLE.API_KEY`) and restrict the key to your domain.
5. **Google reviews:** see "Loading all Google reviews" below.
6. **security.txt:** renew the `Expires` date in `.well-known/security.txt` once a year.

## After publishing
- Add the site in Google Search Console and submit `sitemap.xml`.
- Put the website address in your Google Business Profile.
- Test the share preview to confirm `images/og-image.jpg` loads.

## Files
- `index.html`, `styles.css`, `script.js`: the site
- `api/reviews.js`: Vercel function that loads every Google review for "What customers say"
- `404.html`: page shown for missing pages
- `privacy-policy.html`: privacy policy
- `site.webmanifest`, `favicon.ico`, `images/`: icons, logo and share image
- `robots.txt`, `sitemap.xml`: search engine files
- `.well-known/security.txt`, `humans.txt`: standard info files
- `_headers`: security and cache settings for Netlify and Cloudflare Pages
- `.htaccess`: the same settings for Apache and cPanel hosting (GitHub Pages ignores both files)

## Colours
Colours are set once at the top of `styles.css` (`:root`).

## Loading all Google reviews
The review carousel loads from `/api/reviews` (`api/reviews.js`, a Vercel serverless function). It returns **every** review with the reviewer's name, profile photo, stars, text and date. Vercel caches the result for 6 hours, so new reviews appear within a few hours.

Google's public Places API only ever returns 5 reviews. To get all of them, the function uses the **Google Business Profile API**, signed in once as the business owner:

1. In [Google Cloud Console](https://console.cloud.google.com/) create a project and [request Business Profile API access](https://developers.google.com/my-business/content/prereqs#request-access) (Google approves it, usually within a few days).
2. Enable these APIs: *My Business Account Management API*, *My Business Business Information API* and *Google My Business API*.
3. Set up the OAuth consent screen and **publish it ("In production")**; in "Testing" mode the login expires after 7 days.
4. Create an OAuth client ID (type *Web application*) with redirect URI `https://developers.google.com/oauthplayground`.
5. Open the [OAuth Playground](https://developers.google.com/oauthplayground), click the gear icon, tick "Use your own OAuth credentials" and paste the client ID and secret. Authorise the scope `https://www.googleapis.com/auth/business.manage` with the Google account that **owns the business**, then click "Exchange authorization code for tokens" and copy the **refresh token**.
6. In Vercel > Project > Settings > Environment Variables add:
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`
   - optional: `GBP_ACCOUNT_ID` and `GBP_LOCATION_ID` (otherwise the location is found from the Place ID `ChIJr2yrsGNrVzkRAmwLAuIw53A`)
7. Redeploy, then open `https://your-site/api/reviews` to check that it returns all reviews.

Until this is set up you can add `GOOGLE_PLACES_API_KEY` (a server-side Places API key) to show Google's 5 latest reviews. With neither, the site shows the reviews built into `index.html`. Errors appear in Vercel > Logs.
