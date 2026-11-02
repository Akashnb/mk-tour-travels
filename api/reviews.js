/* Vercel serverless function: GET /api/reviews
   Returns ALL Google reviews of the business, with reviewer profile photos.

   Source 1 (all reviews): Google Business Profile API, signed in as the business owner.
     Env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
     Optional: GBP_ACCOUNT_ID, GBP_LOCATION_ID (found automatically from the Place ID if missing)
   Source 2 (fallback, max 5 reviews, Google's limit): Places API.
     Env var: GOOGLE_PLACES_API_KEY
   Vercel's CDN caches the answer for 6 hours, so Google is called only a few times a day. */

const PLACE_ID = process.env.GOOGLE_PLACE_ID || 'ChIJr2yrsGNrVzkRAmwLAuIw53A';
const STARS = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
let ids = null; // remembered between calls while the function stays warm

async function getJson(url, options = {}) {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${url.split('?')[0]}: ${(body.error && body.error.message) || res.statusText}`);
  return body;
}

const photoUrl = (u) => (!u ? '' : u.startsWith('//') ? 'https:' + u : u);

/* Google adds "(Translated by Google) ... (Original) ..." to translated reviews: keep the English part */
function cleanText(text = '') {
  const t = String(text);
  if (t.includes('(Translated by Google)')) return t.split('(Original)')[0].replace('(Translated by Google)', '').trim();
  if (t.includes('(Original)')) return t.split('(Original)')[1].trim();
  return t.trim();
}

async function accessToken() {
  const data = await getJson('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token'
    })
  });
  return data.access_token;
}

async function findLocation(auth) {
  if (process.env.GBP_ACCOUNT_ID && process.env.GBP_LOCATION_ID) {
    return { account: process.env.GBP_ACCOUNT_ID.replace(/^accounts\//, ''), location: process.env.GBP_LOCATION_ID.replace(/^.*locations\//, '') };
  }
  const { accounts = [] } = await getJson('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', auth);
  const found = [];
  for (const acc of accounts) {
    let pageToken = '';
    do {
      const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations?readMask=name,title,metadata&pageSize=100${pageToken ? '&pageToken=' + pageToken : ''}`;
      const data = await getJson(url, auth);
      (data.locations || []).forEach((l) => found.push({ account: acc.name.split('/')[1], location: l.name.split('/')[1], placeId: l.metadata && l.metadata.placeId }));
      pageToken = data.nextPageToken || '';
    } while (pageToken);
  }
  const match = found.find((l) => l.placeId === PLACE_ID) || (found.length === 1 ? found[0] : null);
  if (!match) throw new Error('Business location not found. Set GBP_ACCOUNT_ID and GBP_LOCATION_ID.');
  return match;
}

async function fromBusinessProfile() {
  const auth = { headers: { Authorization: 'Bearer ' + (await accessToken()) } };
  ids = ids || (await findLocation(auth));
  const reviews = [];
  let rating = 0;
  let total = 0;
  let pageToken = '';
  do { // page through every review (50 per page)
    const url = `https://mybusiness.googleapis.com/v4/accounts/${ids.account}/locations/${ids.location}/reviews?pageSize=50&orderBy=updateTime%20desc${pageToken ? '&pageToken=' + pageToken : ''}`;
    const data = await getJson(url, auth);
    rating = data.averageRating || rating;
    total = data.totalReviewCount || total;
    (data.reviews || []).forEach((r) => reviews.push({
      name: (r.reviewer && !r.reviewer.isAnonymous && r.reviewer.displayName) || 'Google user',
      photo: photoUrl(r.reviewer && r.reviewer.profilePhotoUrl),
      rating: STARS[r.starRating] || 0,
      text: cleanText(r.comment),
      date: r.createTime || ''
    }));
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return { source: 'business-profile', rating, total: total || reviews.length, reviews };
}

async function fromPlaces() {
  const data = await getJson(`https://places.googleapis.com/v1/places/${PLACE_ID}`, {
    headers: { 'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY, 'X-Goog-FieldMask': 'rating,userRatingCount,reviews' }
  });
  return {
    source: 'places',
    rating: data.rating || 0,
    total: data.userRatingCount || 0,
    reviews: (data.reviews || []).map((r) => ({
      name: (r.authorAttribution && r.authorAttribution.displayName) || 'Google user',
      photo: photoUrl(r.authorAttribution && r.authorAttribution.photoUri),
      rating: r.rating || 0,
      text: cleanText((r.originalText && r.originalText.text) || (r.text && r.text.text)),
      date: r.publishTime || ''
    }))
  };
}

module.exports = async (req, res) => {
  const hasOwnerLogin = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN;
  const errors = [];
  let result = null;
  if (hasOwnerLogin) {
    try { result = await fromBusinessProfile(); } catch (e) { errors.push(e.message); }
  }
  if (!result && process.env.GOOGLE_PLACES_API_KEY) {
    try { result = await fromPlaces(); } catch (e) { errors.push(e.message); }
  }
  if (!result) {
    console.error('Reviews not loaded:', errors.join(' | ') || 'no Google credentials set');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ error: 'Reviews are not available right now.' });
  }
  res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400');
  return res.status(200).json(result);
};
