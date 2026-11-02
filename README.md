# M.K. Tour & Travels website

Static website: HTML, CSS and vanilla JavaScript. No build step, no frameworks.

## Before you publish (checklist)
1. **Domain:** replace `YOUR-DOMAIN.com` with your real domain in every file.
   Mac/Linux: `grep -rl YOUR-DOMAIN.com . | xargs sed -i 's/YOUR-DOMAIN.com/yourdomain.com/g'`
   Windows: use Find and Replace in a text editor on `index.html`, `privacy-policy.html`, `robots.txt`, `sitemap.xml` and `.well-known/security.txt`.
2. **Instagram:** in `index.html`, change the footer link `https://www.instagram.com/` to your profile.
3. **Font (optional):** download Poppins 400, 500, 600, 700 and 800 as `.woff2` and save them in a `fonts` folder as `poppins-400.woff2` and so on.
4. **Google photos and reviews (optional):** paste a Google Places API key into `script.js` (`GOOGLE.API_KEY`) and restrict the key to your domain.
5. **security.txt:** renew the `Expires` date in `.well-known/security.txt` once a year.

## After publishing
- Add the site in Google Search Console and submit `sitemap.xml`.
- Put the website address in your Google Business Profile.
- Test the share preview to confirm `images/og-image.jpg` loads.

## Files
- `index.html`, `styles.css`, `script.js`: the site
- `404.html`: page shown for missing pages
- `privacy-policy.html`: privacy policy
- `site.webmanifest`, `favicon.ico`, `images/`: icons, logo and share image
- `robots.txt`, `sitemap.xml`: search engine files
- `.well-known/security.txt`, `humans.txt`: standard info files
- `_headers`: security and cache settings for Netlify and Cloudflare Pages
- `.htaccess`: the same settings for Apache and cPanel hosting (GitHub Pages ignores both files)

## Colours
Colours are set once at the top of `styles.css` (`:root`).
