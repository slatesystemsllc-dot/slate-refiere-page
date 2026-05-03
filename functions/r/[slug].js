// functions/r/[slug].js
// Funcion CF Pages: redireccionador /r/SLUG.
// Busca slug en Baserow T.955 por referral_code,
// redirige 302 a refiere.slatesystems.io/?ref=PARTNER_GHL_CONTACT_ID.
// El JS de la pagina captura ?ref= y lo agrega a todos los CTAs de reserva.
//
// VARIABLE ENV REQUERIDA en CF Pages: BASEROW_TOKEN
// La busqueda de slug es insensible a mayusculas.

export async function onRequest(context) {
  const { params, env } = context;
  const slug = params.slug;
  const fallback = 'https://refiere.slatesystems.io/';

  if (!slug || !env.BASEROW_TOKEN) {
    return Response.redirect(fallback, 302);
  }

  try {
    const url = `https://baserow.slatesystems.io/api/database/rows/table/955/?user_field_names=true&search=${encodeURIComponent(slug)}`;
    const resp = await fetch(url, {
      headers: { 'Authorization': `Token ${env.BASEROW_TOKEN}` }
    });
    if (!resp.ok) return Response.redirect(fallback, 302);

    const data = await resp.json();
    const match = (data.results || []).find(r =>
      String(r['referral_code'] || '').toLowerCase() === slug.toLowerCase()
    );

    if (!match) return Response.redirect(fallback, 302);

    const partnerContactId = match['GHL Contact ID'];
    if (!partnerContactId) return Response.redirect(fallback, 302);

    return Response.redirect(
      `https://refiere.slatesystems.io/?ref=${encodeURIComponent(partnerContactId)}`,
      302
    );
  } catch (e) {
    return Response.redirect(fallback, 302);
  }
}
