const mainUrl = "https://animeflv.or.at";

function getStreams(tmdbId, mediaType, season, episode) {
  return new Promise(function(resolve, reject) {
    try {
      const doc = Http.get(mainUrl + "/anime/").document;
      const results = [];
      doc.select(".anime-list article, .anime article").forEach(function(el) {
        var a = el.selectFirst("a[href*=/anime/]");
        if (!a) return;
        var title = a.selectFirst("h3, .anime-title") ? a.selectFirst("h3, .anime-title").text() : (a.attr("title") || "Anime");
        var href = a.attr("abs:href");
        var poster = el.selectFirst("img") ? el.selectFirst("img").attr("abs:src") : "";
        if (href) results.push({ title: title, url: href, poster: poster });
      });
      var animeUrl = (results.length === 1) ? results[0].url : (results.find(function(r) { return r.title.toLowerCase().indexOf((tmdbId || "").toLowerCase()) !== -1; }) ? results.find(function(r) { return r.title.toLowerCase().indexOf((tmdbId || "").toLowerCase()) !== -1; }).url : (results[0] ? results[0].url : null));
      if (!animeUrl) { resolve([]); return; }
      var animeDoc = Http.get(animeUrl).document;
      var episodes = [];
      animeDoc.select("article:has(.episode-num), .episodes li, .episode-list a[href*=/20]").forEach(function(ep) {
        var href = ep.attr("abs:href");
        var txt = ep.text();
        var m = txt.match(/Episodio (\d+)/);
        var num = m ? parseInt(m[1]) : (txt.match(/(\d+)/) ? parseInt(txt.match(/(\d+)/)[1]) : null);
        if (num && href) episodes.push({ episode: num, url: href });
      });
      var targetEp = episode ? episodes.find(function(e) { return e.episode === episode; }) : episodes[episodes.length - 1];
      if (!targetEp) { resolve([]); return; }
      var epDoc = Http.get(targetEp.url).document;
      var buttons = epDoc.select("button[data-src]");
      var streams = [];
      if (buttons.length > 0) {
        buttons.forEach(function(btn) {
          var b64 = btn.attr("data-src");
          var decoded;
          try { decoded = atob(b64); } catch(e) { decoded = b64; }
          var name = btn.text() || "Opción";
          var subtitle = btn.attr("app_type") || "Sub";
          streams.push({
            name: "AnimeFLV - " + name + " (" + subtitle + ")",
            url: decoded,
            quality: "Unknown",
            headers: { referer: targetEp.url }
          });
        });
      } else {
        var iframeSrc = epDoc.selectFirst("iframe[src]") ? epDoc.selectFirst("iframe[src]").attr("abs:src") : null;
        var direct = iframeSrc || (epDoc.selectFirst(".player a[href]") ? epDoc.selectFirst(".player a[href]").attr("abs:href") : null);
        if (direct) streams.push({ name: "AnimeFLV", url: direct, quality: "Unknown", headers: { referer: targetEp.url } });
      }
      resolve(streams);
    } catch(err) {
      resolve([]);
    }
  });
}

module.exports = { getStreams: getStreams };
