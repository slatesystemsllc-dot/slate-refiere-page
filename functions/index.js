// functions/index.js
// WS6.1: root click log. A cadence link can land straight on / carrying ?m=<messageId>.
// The slug router already logs its own hit and forwards ?slug= on the redirect, so a
// request that carries slug= is skipped here and one click is never counted twice.
// The log is fire-and-forget: the static page is always served by next().
export async function onRequest(context) {
  const { request, next } = context;
  try {
    const url = new URL(request.url);
    const m = url.searchParams.get('m');
    if (m && !url.searchParams.get('slug')) {
      context.waitUntil(fetch('https://n8n.slatesystems.io/webhook/referral-click', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          slug: '',
          m: m,
          host: url.hostname,
          path: url.pathname,
          lang: 'es'
        })
      }).catch(() => {}));
    }
  } catch (e) { /* logging never blocks the page */ }
  return next();
}
