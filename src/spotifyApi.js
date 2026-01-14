function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

export async function getMe(token) {
  const res = await fetch("https://api.spotify.com/v1/me", {
    headers: { ...authHeader(token) },
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

/**
 * Public/Private seçimi tamamen kaldırıldı.
 * Playlist her zaman public oluşturulur.
 */
export async function createPlaylist(token, userId, { name }) {
  const res = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
    method: "POST",
    headers: {
      ...authHeader(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      public: true,
      description: "Created with Spotify Playlist Oluşturucu",
    }),
  });

  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

/**
 * Public/Private tamamen kaldırıldı.
 * Bu fonksiyon artık sadece name/description günceller (istersen sonradan tamamen de silebiliriz).
 */
export async function changePlaylistDetails(token, playlistId, { name, description }) {
  const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
    method: "PUT",
    headers: {
      ...authHeader(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...(typeof name === "string" ? { name } : {}),
      ...(typeof description === "string" ? { description } : {}),
    }),
  });

  if (!res.ok) throw new Error(await res.text());
}

export async function searchTrack(token, { title, artist }) {
  const qParts = [];
  if (title) qParts.push(`track:${title}`);
  if (artist) qParts.push(`artist:${artist}`);
  const q = encodeURIComponent(qParts.join(" "));
  const url = `https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`;

  const res = await fetch(url, { headers: { ...authHeader(token) } });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  const item = data?.tracks?.items?.[0];
  return item || null;
}

/**
 * uris: ["spotify:track:..."]
 * onProgress: (info) => void
 */
export async function addTracksToPlaylist(token, playlistId, uris, onProgress) {
  const total = uris.length;
  const batchSize = 100; // Spotify limiti
  const totalBatches = Math.ceil(total / batchSize);

  let addedSoFar = 0;

  for (let i = 0; i < total; i += batchSize) {
    const batchIndex = Math.floor(i / batchSize) + 1;
    const chunk = uris.slice(i, i + batchSize);

    onProgress?.({
      currentBatch: batchIndex,
      totalBatches,
      addedSoFar,
      total,
      batchSize: chunk.length,
    });

    const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: "POST",
      headers: {
        ...authHeader(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uris: chunk }),
    });

    if (!res.ok) throw new Error(await res.text());

    addedSoFar += chunk.length;

    onProgress?.({
      currentBatch: batchIndex,
      totalBatches,
      addedSoFar,
      total,
      batchSize: chunk.length,
      doneBatch: true,
    });

    await new Promise((r) => setTimeout(r, 150));
  }
}

// -------------------- EXPORT (Playlist -> Text) --------------------

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(url, options, { maxRetries = 10 } = {}) {
  let attempt = 0;

  while (true) {
    const res = await fetch(url, options);

    if (res.status === 429) {
      const ra = res.headers.get("Retry-After");
      const waitSec = ra ? Number(ra) : 1;

      await sleep(Math.max(1, waitSec) * 1000 + 250);

      attempt += 1;
      if (attempt > maxRetries) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "Rate limit (429). Çok fazla deneme yapıldı.");
      }
      continue;
    }

    if ([500, 502, 503, 504].includes(res.status)) {
      attempt += 1;
      if (attempt > maxRetries) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Sunucu hatası (${res.status}). Çok fazla deneme yapıldı.`);
      }
      const backoff = Math.min(8000, 400 * 2 ** (attempt - 1));
      await sleep(backoff);
      continue;
    }

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || `HTTP hata: ${res.status}`);
    }

    return res;
  }
}

/**
 * Playlist ID'den tüm track'leri çekip "1. Title – Artist" formatına çevirir.
 * - Sayfalama: limit=50 + next
 * - 429: Retry-After ile bekle + retry
 *
 * onProgress: ({ fetched, total, page, pages }) => void
 */
export async function exportPlaylistToText(token, playlistId, onProgress) {
  const limit = 50;

  const firstUrl = `https://api.spotify.com/v1/playlists/${encodeURIComponent(
    playlistId
  )}/tracks?limit=${limit}&offset=0&fields=total,next,items(track(name,artists(name)))`;

  let url = firstUrl;
  let total = null;
  let fetched = 0;

  const lines = [];
  let index = 1;

  while (url) {
    const res = await fetchWithRetry(
      url,
      {
        headers: { ...authHeader(token) },
      },
      { maxRetries: 10 }
    );

    const data = await res.json();

    if (typeof data?.total === "number") total = data.total;
    const items = Array.isArray(data?.items) ? data.items : [];

    for (const it of items) {
      const t = it?.track;
      const name = (t?.name || "").trim();
      const artists = Array.isArray(t?.artists) ? t.artists.map((a) => a?.name).filter(Boolean) : [];
      const artistStr = artists.join(", ").trim();

      if (!name) continue;

      lines.push(`${index}. ${name}${artistStr ? " – " + artistStr : ""}`);
      index += 1;
    }

    fetched += items.length;

    const pages = total ? Math.max(1, Math.ceil(total / limit)) : 1;
    const page = total ? Math.min(pages, Math.max(1, Math.ceil(fetched / limit))) : 1;

    onProgress?.({
      fetched: Math.min(fetched, total ?? fetched),
      total: total ?? fetched,
      page,
      pages,
    });

    url = data?.next || null;

    if (url) await sleep(120);
  }

  return {
    text: lines.join("\n"),
    total: total ?? lines.length,
  };
}
