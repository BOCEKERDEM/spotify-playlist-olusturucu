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

export async function createPlaylist(token, userId, { name, isPublic }) {
  // Spotify: private playlist = public:false
  const res = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
    method: "POST",
    headers: {
      ...authHeader(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      public: Boolean(isPublic), // Public seçildiyse true, private seçildiyse false olmalı
      description: "Created with Spotify Playlist Oluşturucu",
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
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
 *   info = { currentBatch, totalBatches, addedSoFar, total }
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

    // Çok hızlı ardışık isteklerde rate limit riskini azaltır (opsiyonel ama faydalı)
    await new Promise((r) => setTimeout(r, 150));
  }
}
