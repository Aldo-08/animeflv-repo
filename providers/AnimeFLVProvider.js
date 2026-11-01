const mainUrl = "https://animeflv.or.at";

async function getStreams(tmdbId, mediaType, season, episode) {
  // Buscar anime en /anime/
  const doc = Http.get(mainUrl + "/anime/").document;
  const results = [];
  doc.select(".anime-list article, .anime article").forEach(el => {
    const a = el.selectFirst("a[href*=/anime/]");
    if (!a) return;
    const title = a.selectFirst("h3, .anime-title")?.text() || a.attr("title") || "Anime";
    const url = a.attr("abs:href");
    const poster = el.selectFirst("img")?.attr("abs:src") || "";
    if (url) results.push({ title: title, url: url, poster: poster });
  });

  // Si solo hay un anime, usar ese; si hay varios, buscar por nombre
  const animeUrl = results.length === 1 ? results[0].url : (results.find(r => r.title.toLowerCase().includes(tmdbId.toLowerCase()))?.url || results[0]?.url);
  if (!animeUrl) return [];

  // Obtener página del anime para capítulos
  const animeDoc = Http.get(animeUrl).document;
  const episodes = [];
  animeDoc.select("article:has(.episode-num), .episodes li, .episode-list a[href*=/20]").forEach(ep => {
    const href = ep.attr("abs:href");
    const txt = ep.text();
    const m = txt.match(/Episodio (\d+)/);
    const num = m ? parseInt(m[1]) : (txt.match(/(\d+)/) ? parseInt(txt.match(/(\d+)/)[1]) : null);
    if (num && href) episodes.push({ episode: num, url: href });
  });

  // Seleccionar episodio según season/episode
  const targetEp = episode ? episodes.find(e => e.episode === episode) : episodes[episodes.length - 1];
  if (!targetEp) return [];

  // Cargar página del episodio y extraer reproductores
  const epDoc = Http.get(targetEp.url).document;
  const buttons = epDoc.select("button[data-src]");
  const streams = [];
  if (buttons.length > 0) {
    buttons.forEach(btn => {
      const b64 = btn.attr("data-src");
      const decoded = (() => { try { return atob(b64); } catch(e) { return b64; } })();
      const name = btn.text() || "Opción";
      const subtitle = btn.attr("app_type") || "Sub";
      streams.push({
        name: "AnimeFLV - " + name + " (" + subtitle + ")",
        url: decoded,
        quality: "Unknown",
        headers: { referer: targetEp.url }
      });
    });
  } else {
    const iframeSrc = epDoc.selectFirst("iframe[src]")?.attr("abs:src");
    const direct = iframeSrc || epDoc.selectFirst(".player a[href]")?.attr("abs:href");
    if (direct) streams.push({ name: "AnimeFLV", url: direct, quality: "Unknown", headers: { referer: targetEp.url } });
  }
  return streams;
}

module.exports = { getStreams };
