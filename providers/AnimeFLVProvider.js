const providerName = "AnimeFLV";
const mainUrl = "https://animeflv.or.at";

function search(query, page) {
  const doc = Http.get(mainUrl + "/anime/").document;
  const results = [];
  doc.select(".anime-list article, .anime article").forEach(el => {
    const a = el.selectFirst("a[href*=/anime/]");
    if (!a) return;
    const title = a.selectFirst("h3, .anime-title")?.text() || a.attr("title") || "Anime";
    const href = a.attr("abs:href");
    const poster = el.selectFirst("img")?.attr("abs:src") || "";
    results.push({ title: title, url: href, poster: poster });
  });
  return { results: results, hasMore: false };
}

function load(url) {
  const doc = Http.get(url).document;
  const title = doc.selectFirst("h1.entry-title, h1, .anime-title, h2")?.text() || "Anime";
  const poster = doc.selectFirst("img[src*=/uploads/], .anime-poster img")?.attr("abs:src") || "";
  const episodes = [];
  doc.select("article:has(.episode-num), .episodes li, .episode-list a[href*=/20]").forEach(ep => {
    const href = ep.attr("abs:href");
    const txt = ep.text();
    const m = txt.match(/Episodio (\d+)/);
    const num = m ? parseInt(m[1]) : (txt.match(/(\d+)/) ? parseInt(txt.match(/(\d+)/)[1]) : null);
    if (num && href) episodes.push({ name: "Episodio " + num, episode: num, url: href, posterUrl: poster });
  });
  return { title: title, url: url, episodes: episodes.reverse(), posterUrl: poster, plot: doc.selectFirst(".description, .synopsis, .resumen")?.text() || "" };
}

function loadLinks(url, isCasting, subtitleCallback, callback) {
  const doc = Http.get(url).document;
  const buttons = doc.select("button[data-src]");
  if (buttons.length > 0) {
    buttons.forEach(btn => {
      const b64 = btn.attr("data-src");
      const decoded = (() => { try { return atob(b64); } catch(e) { return b64; } })();
      const name = btn.text() || "Opción";
      const subtitle = btn.attr("app_type") || "Sub";
      callback({
        name: "AnimeFLV - " + name + " (" + subtitle + ")",
        url: decoded,
        quality: "Unknown",
        referer: url
      });
    });
    return true;
  }
  const iframeSrc = doc.selectFirst("iframe[src]")?.attr("abs:src");
  const direct = iframeSrc || doc.selectFirst(".player a[href]")?.attr("abs:href");
  if (!direct) return false;
  callback({ name: "AnimeFLV", url: direct, quality: "Unknown", referer: url });
  return true;
}
