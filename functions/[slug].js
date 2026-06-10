// functions/[slug].js
// CF Pages Function: /SLUG redirect handler for refiere.slatesystems.io.
// Looks up slug in Baserow T.955 by referral_code, then 302 redirects to
// refiere.slatesystems.io/?ref=PARTNER_GHL_CONTACT_ID.
//
// Skips the root, /terminos, and asset paths so the static layer serves them.
// Replaces /r/[slug].js (kept for backward compat — old SMS links still work).
//
// REQUIRED CF Pages env var: BASEROW_TOKEN (read access to T.955).

export async function onRequest(context) {
  const { params, env, next } = context;
  const slug = params.slug;

  if (!slug ||
      slug.includes('.') ||
      slug === 'favicon' ||
      slug === 'logo' ||
      slug === 'robots' ||
      slug === 'terminos' ||
      slug === 'r') {
    return next();
  }

  if (!env.BASEROW_TOKEN) return next();

  try {
    const url = `https://baserow.slatesystems.io/api/database/rows/table/955/?user_field_names=true&search=${encodeURIComponent(slug)}`;
    const resp = await fetch(url, {
      headers: { 'Authorization': `Token ${env.BASEROW_TOKEN}` }
    });
    if (!resp.ok) return next();

    const data = await resp.json();
    const match = (data.results || []).find(r =>
      String(r['referral_code'] || '').toLowerCase() === slug.toLowerCase()
    );

    if (!match) return next();

    const partnerContactId = match['GHL Contact ID'];
    if (!partnerContactId) return next();


    // V27: fire-and-forget click log to T.1044 (Referral Clicks). Never blocks the redirect.
    try {
      context.waitUntil(fetch('https://baserow.slatesystems.io/api/database/rows/table/1044/?user_field_names=true', {
        method: 'POST',
        headers: { 'Authorization': `Token ${env.BASEROW_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ Name: slug, slug: slug, lang: 'es', ts: new Date().toISOString() })
      }));
    } catch (e) { /* logging is optional */ }
    return Response.redirect(
      `https://refiere.slatesystems.io/?ref=${encodeURIComponent(partnerContactId)}`,
      302
    );
  } catch (e) {
    return next();
  }
}
