var mainUrl = "https://animeflv.or.at";

function getStreams(tmdbId, mediaType, season, episode) {
  return new Promise(function(resolve) {
    fetch(mainUrl + "/anime/")
      .then(function(r) { return r.text(); })
      .then(function(html) {
        var cheerio = require("cheerio-without-node-native");
        var $ = cheerio.load(html);
        var results = [];
        $(".anime-list article, .anime article").each(function(i, el) {
          var a = $(el).find("a[href*=/anime/]").first();
          if (!a.length) return;
          var title = a.find("h3, .anime-title").first().text() || (a.attr("title") || "Anime");
          var href = a.attr("href");
          if (href && href.indexOf("http") !== 0) href = mainUrl + href;
          var poster = $(el).find("img").first().attr("src") || "";
          if (href) results.push({ title: title.trim(), url: href, poster: poster });
        });
        var animeUrl = null;
        if (results.length === 1) {
          animeUrl = results[0].url;
        } else {
          var found = results.find(function(r) {
            return (r.title || "").toLowerCase().indexOf((tmdbId || "").toLowerCase()) !== -1;
          });
          animeUrl = found ? found.url : (results[0] ? results[0].url : null);
        }
        if (!animeUrl) { resolve([]); return; }
        return fetch(animeUrl).then(function(r) { return r.text(); }).then(function(animeHtml) {
          var $a = cheerio.load(animeHtml);
          var episodes = [];
          $a("article:has(.episode-num), .episodes li, .episode-list a[href*=/20]").each(function(i, ep) {
            var href = $a(ep).attr("href");
            if (href && href.indexOf("http") !== 0) href = mainUrl + href;
            var txt = $a(ep).text();
            var m = (txt || "").match(/Episodio (\d+)/);
            var num = m ? parseInt(m[1]) : ((txt || "").match(/(\d+)/) ? parseInt((txt || "").match(/(\d+)/)[1]) : null);
            if (num && href) episodes.push({ episode: num, url: href });
          });
          var targetEp = episode ? episodes.find(function(e) { return e.episode === episode; }) : episodes[episodes.length - 1];
          if (!targetEp) { resolve([]); return; }
          return fetch(targetEp.url).then(function(r) { return r.text(); }).then(function(epHtml) {
            var $ep = cheerio.load(epHtml);
            var buttons = $ep("button[data-src]");
            var streams = [];
            if (buttons.length > 0) {
              buttons.each(function(i, btn) {
                var b64 = $ep(btn).attr("data-src");
                var decoded = b64;
                try { decoded = atob(b64); } catch(e) { decoded = b64; }
                var name = $ep(btn).text() || "Opción";
                var subtitle = $ep(btn).attr("app_type") || "Sub";
                streams.push({
                  name: "AnimeFLV - " + (name || "Opción") + " (" + (subtitle || "Sub") + ")",
                  url: decoded,
                  quality: "Unknown",
                  headers: { Referer: targetEp.url }
                });
              });
            } else {
              var iframeSrc = $ep("iframe[src]").attr("src");
              if (iframeSrc && iframeSrc.indexOf("http") !== 0) iframeSrc = mainUrl + iframeSrc;
              var direct = iframeSrc || ($ep(".player a[href]").attr("href") || null);
              if (direct) {
                if (direct.indexOf("http") !== 0) direct = mainUrl + direct;
                streams.push({ name: "AnimeFLV", url: direct, quality: "Unknown", headers: { Referer: targetEp.url } });
              }
            }
            resolve(streams);
          });
        });
      })
      .catch(function(err) {
        resolve([]);
      });
  });
}

module.exports = { getStreams: getStreams };
