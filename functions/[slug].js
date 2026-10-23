// functions/[slug].js
// CF Pages Function: /SLUG redirect handler for refiere.slatesystems.io.
// Looks up slug in Baserow T.955 by referral_code, then 302 redirects to
// refiere.slatesystems.io/?ref=PARTNER_GHL_CONTACT_ID.
//
// Skips the root, /terminos, and asset paths so the static layer serves them.
// Replaces /r/[slug].js (kept for backward compat, old SMS links still work).
//
// REQUIRED CF Pages env var: BASEROW_TOKEN (read access to T.955).

export async function onRequest(context) {
  const { params, env, request, next } = context;
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
    // An old slug listed in referral_code_aliases (comma-separated) still resolves to the
    // same partner, so a renamed code never breaks a link already sent (2026-10-23: dremos -> dramos).
    const want = slug.toLowerCase();
    const match = (data.results || []).find(r =>
      String(r['referral_code'] || '').toLowerCase() === want ||
      String(r['referral_code_aliases'] || '').toLowerCase().split(',').map(a => a.trim()).includes(want)
    );

    if (!match) return next();

    // Offboarded partners (Status != Active) keep their data but their links go dark.
    const rowStatus = (match.Status && (match.Status.value || match.Status)) || '';
    if (String(rowStatus) !== 'Active') {
      return next();
    }

    const code = String(match['referral_code'] || slug).trim();
    const partnerContactId = match['GHL Contact ID'];
    if (!partnerContactId) return next();


    // V27: fire-and-forget click log to T.1044 (Referral Clicks). Never blocks the redirect.
    try {
      context.waitUntil(fetch('https://baserow.slatesystems.io/api/database/rows/table/1044/?user_field_names=true', {
        method: 'POST',
        headers: { 'Authorization': `Token ${env.BASEROW_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ Name: code, slug: code, lang: 'es' })
      }));
    } catch (e) { /* logging is optional */ }

    // WS6.1: fire-and-forget click log to n8n (referral-click). The webhook may be
    // inactive, so a 404 is harmless: this never blocks or delays the redirect.
    try {
      const clickUrl = new URL(request.url);
      context.waitUntil(fetch('https://n8n.slatesystems.io/webhook/referral-click', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          slug: code,
          m: clickUrl.searchParams.get('m') || '',
          host: clickUrl.hostname,
          path: clickUrl.pathname,
          lang: 'es'
        })
      }).catch(() => {}));
    } catch (e) { /* logging is optional */ }
    return Response.redirect(
      `https://refiere.slatesystems.io/?ref=${encodeURIComponent(partnerContactId)}`,
      302
    );
  } catch (e) {
    return next();
  }
}
