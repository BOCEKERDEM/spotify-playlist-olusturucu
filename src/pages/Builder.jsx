import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addTracksToPlaylist, createPlaylist, getMe, searchTrack } from "../spotifyApi";

const EXAMPLE_TEXT = `1. LE CANE – Muti, UZI, Critical, Heijan
2. Kandil Dağı – Şehîd Sefkan
3. Bıji Serhildan – Şemdin
4. F*ck Love – XXXTENTACION, Trippie Redd
5. Goosebumps – Travis Scott
6. Mask Off – Future
7. Moonlight – XXXTENTACION
8. Codeine Crazy – Future
9. Highest in the Room – Travis Scott
10. Denizkızı – UZI
`;

const EXAMPLE_JSON = `[
  { "title": "LE CANE", "artist": "Muti, UZI, Critical, Heijan" },
  { "title": "Kandil Dağı", "artist": "Şehîd Sefkan" },
  { "title": "Bıji Serhildan", "artist": "Şemdin" },
  { "title": "F*ck Love", "artist": "XXXTENTACION, Trippie Redd" },
  { "title": "Goosebumps", "artist": "Travis Scott" },
  { "title": "Mask Off", "artist": "Future" },
  { "title": "Moonlight", "artist": "XXXTENTACION" },
  { "title": "Codeine Crazy", "artist": "Future" },
  { "title": "Highest in the Room", "artist": "Travis Scott" },
  { "title": "Denizkızı", "artist": "UZI" }
]
`;

function normalizeLine(line) {
  if (!line) return null;
  let s = line.trim();
  if (!s) return null;

  // "1. ..." gibi numaraları temizle
  s = s.replace(/^\s*\d+\s*[\.\)\-]\s*/, "").trim();

  // "Şarkı – Artist" veya "Şarkı - Artist"
  const parts = s.split(/\s[-–]\s/);
  if (parts.length >= 2) {
    const title = parts[0].trim();
    const artist = parts.slice(1).join(" - ").trim();
    return title ? { title, artist } : null;
  }

  // Sadece başlık girilmişse
  return { title: s.trim(), artist: "" };
}

function parseSongInput(text) {
  const t = (text || "").trim();
  if (!t) return [];

  // 1) JSON dene
  try {
    const json = JSON.parse(t);
    if (Array.isArray(json)) {
      return json
        .map((item) => {
          if (typeof item === "string") return normalizeLine(item);
          if (item && typeof item === "object") {
            const title = (item.title || item.name || "").trim();
            const artist = (item.artist || item.artists || "").toString().trim();
            return title ? { title, artist } : null;
          }
          return null;
        })
        .filter(Boolean);
    }
  } catch (_) {
    // JSON değilse devam
  }

  // 2) Düz metin: satır satır
  return t
    .split("\n")
    .map((line) => normalizeLine(line))
    .filter(Boolean);
}

export default function Builder() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false); // false => private
  const [raw, setRaw] = useState("");

  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState([]);
  const [error, setError] = useState("");

  const [showExamples, setShowExamples] = useState(false);

  const parsed = useMemo(() => parseSongInput(raw), [raw]);

  function pushLog(line) {
    setLog((prev) => [...prev, line]);
  }

  async function onCreate() {
    setError("");
    setLog([]);

    const token = sessionStorage.getItem("spotify_access_token");
    if (!token) {
      setError("Giriş bilgisi yok. Lütfen tekrar Spotify ile giriş yapın.");
      navigate("/", { replace: true });
      return;
    }

    if (!name.trim()) {
      setError("Playlist adı boş olamaz.");
      return;
    }

    if (parsed.length === 0) {
      setError("Şarkı listesi boş olamaz.");
      return;
    }

    setBusy(true);

    try {
      pushLog("Spotify hesabı doğrulanıyor...");
      const me = await getMe(token);

      pushLog(`Playlist oluşturuluyor: "${name.trim()}" (${isPublic ? "Public" : "Private"})`);
      const playlist = await createPlaylist(token, me.id, { name: name.trim(), isPublic });

      pushLog("Şarkılar aranıyor...");
      const foundUris = [];
      const notFound = [];

      for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i];
        pushLog(`(${i + 1}/${parsed.length}) Aranıyor: ${item.title}${item.artist ? " — " + item.artist : ""}`);
        const track = await searchTrack(token, item);
        if (track?.uri) foundUris.push(track.uri);
        else notFound.push(item);
      }

      pushLog(`Bulunan şarkı: ${foundUris.length}/${parsed.length}`);

      if (foundUris.length > 0) {
        pushLog("Playlist'e ekleme başlıyor (100'lü paketler)...");
        await addTracksToPlaylist(token, playlist.id, foundUris, (p) => {
          if (p.doneBatch) {
            pushLog(`Eklendi: paket ${p.currentBatch}/${p.totalBatches} (toplam ${p.addedSoFar}/${p.total})`);
          } else {
            pushLog(`Gönderiliyor: paket ${p.currentBatch}/${p.totalBatches} (${p.batchSize} şarkı)`);
          }
        });
      } else {
        pushLog("Hiç şarkı bulunamadı, playlist boş oluşturuldu.");
      }

      sessionStorage.setItem("last_playlist_url", playlist.external_urls?.spotify || "");
      sessionStorage.setItem("last_not_found", JSON.stringify(notFound));

      pushLog("Tamamlandı.");
      navigate("/done", { replace: true });
    } catch (e) {
      setError(e?.message || "Bilinmeyen hata");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="bg-blur a" />
      <div className="bg-blur b" />

      <main className="card formCard">
        <h1>Playlist Oluştur</h1>
        <p className="sub">Playlist adını yaz, public/private seç, şarkı listesini yapıştır.</p>

        <div className="grid">
          <label className="field">
            <span>Playlist adı</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Gece Sürüşü"
              disabled={busy}
            />
          </label>

          <label className="field">
            <span>Görünürlük</span>
            <div className="seg">
              <button
                className={`segBtn ${!isPublic ? "active" : ""}`}
                type="button"
                onClick={() => setIsPublic(false)}
                disabled={busy}
              >
                Private
              </button>
              <button
                className={`segBtn ${isPublic ? "active" : ""}`}
                type="button"
                onClick={() => setIsPublic(true)}
                disabled={busy}
              >
                Public
              </button>
            </div>
          </label>
        </div>

        <div className="actionsRow" style={{ marginTop: 12 }}>
          <button
            className="btn secondary"
            type="button"
            disabled={busy}
            onClick={() => setShowExamples((v) => !v)}
          >
            {showExamples ? "Örnekleri Gizle" : "Örnekleri Görüntüle"}
          </button>
        </div>

        {showExamples && (
          <div className="logBox" style={{ marginTop: 12 }}>
            <div className="logTitle">Örnek Düz Metin</div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "rgba(255,255,255,0.82)", lineHeight: 1.5 }}>
              {EXAMPLE_TEXT}
            </pre>

            <div style={{ height: 12 }} />

            <div className="logTitle">Örnek JSON</div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "rgba(255,255,255,0.82)", lineHeight: 1.5 }}>
              {EXAMPLE_JSON}
            </pre>

            <div style={{ marginTop: 10, color: "rgba(255,255,255,0.55)", fontSize: 13 }}>
              İpucu: Bu örnekleri seçip kopyalayabilirsiniz.
            </div>
          </div>
        )}

        <label className="field" style={{ marginTop: 12 }}>
          <span>Şarkı listesi (JSON veya düz metin)</span>
          <textarea
            className="textarea"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            disabled={busy}
            placeholder="Şarkı listesini buraya yapıştır (JSON veya düz metin)."
          />
          <div className="metaRow">
            <span className="pill">Algılanan şarkı: {parsed.length}</span>
          </div>
        </label>

        {error && <div className="errorBox">{error}</div>}

        <div className="actionsRow">
          <button className="btn" onClick={onCreate} disabled={busy}>
            {busy ? "Oluşturuluyor..." : "Oluştur"}
          </button>

          <button
            className="btn secondary"
            type="button"
            disabled={busy}
            onClick={() => {
              sessionStorage.removeItem("spotify_access_token");
              navigate("/", { replace: true });
            }}
          >
            Çıkış
          </button>
        </div>

        <div className="logBox">
          <div className="logTitle">İlerleme</div>
          <ul className="logList">
            {log.map((l, idx) => (
              <li key={idx}>{l}</li>
            ))}
          </ul>
          {log.length === 0 && <div className="logEmpty">Henüz işlem yok.</div>}
        </div>
      </main>
    </div>
  );
}
