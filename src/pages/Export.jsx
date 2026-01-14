import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { exportPlaylistToText } from "../spotifyApi";

function extractPlaylistId(input) {
  const s = (input || "").trim();
  if (!s) return "";

  const uriMatch = s.match(/spotify:playlist:([a-zA-Z0-9]+)/);
  if (uriMatch) return uriMatch[1];

  const urlMatch = s.match(/playlist\/([a-zA-Z0-9]+)/);
  if (urlMatch) return urlMatch[1];

  if (/^[a-zA-Z0-9]{10,}$/.test(s)) return s;

  return "";
}

export default function Export() {
  const navigate = useNavigate();

  const [needsLogin, setNeedsLogin] = useState(false);

  const [playlistInput, setPlaylistInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [log, setLog] = useState([]);
  const [output, setOutput] = useState("");

  const playlistId = useMemo(() => extractPlaylistId(playlistInput), [playlistInput]);

  // Sayfaya direkt girilirse token yoksa ekranı kilitle.
  useEffect(() => {
    const token = sessionStorage.getItem("spotify_access_token");
    if (!token) setNeedsLogin(true);
  }, []);

  function pushLog(line) {
    setLog((p) => [...p, line]);
  }

  async function onConvert() {
    setError("");
    setLog([]);
    setOutput("");

    const token = sessionStorage.getItem("spotify_access_token");
    if (!token) {
      setNeedsLogin(true);
      setError("Giriş bilgisi yok. Lütfen Spotify ile giriş yapın.");
      return;
    }

    if (!playlistId) {
      setError("Playlist linki/URI/ID okunamadı. Örn: https://open.spotify.com/playlist/...");
      return;
    }

    setBusy(true);
    try {
      pushLog("Playlist okunuyor...");
      const { text, total } = await exportPlaylistToText(token, playlistId, (p) => {
        pushLog(`Çekiliyor: ${p.fetched}/${p.total} (sayfa ${p.page}/${p.pages})`);
      });

      setOutput(text);
      pushLog(`Tamamlandı. Toplam şarkı: ${total}`);
    } catch (e) {
      setError(e?.message || "Bilinmeyen hata");
    } finally {
      setBusy(false);
    }
  }

  async function onCopy() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      pushLog("Kopyalandı.");
    } catch {
      pushLog("Kopyalama başarısız. Çıktıyı seçip manuel kopyalayabilirsin.");
    }
  }

  // LOGIN GEREKLİ EKRANI
  if (needsLogin) {
    return (
      <div className="page">
        <div className="bg-blur a" />
        <div className="bg-blur b" />

        <main className="card formCard">
          <h1>Giriş gerekli</h1>
          <p className="sub">Bu sayfayı kullanmak için önce Spotify ile giriş yapmalısın.</p>

          {error && <div className="errorBox">{error}</div>}

          <div className="actionsRow" style={{ marginTop: 12 }}>
            <button className="btn" type="button" onClick={() => navigate("/", { replace: true })}>
              Spotify ile giriş yap
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="bg-blur a" />
      <div className="bg-blur b" />

      <main className="card formCard">
        <h1>Playlist → Text</h1>
        <p className="sub">Spotify playlist linkini yapıştır, bizim formatta text olarak al.</p>

        <label className="field" style={{ marginTop: 12 }}>
          <span>Playlist linki / URI / ID</span>
          <input
            className="input"
            value={playlistInput}
            onChange={(e) => setPlaylistInput(e.target.value)}
            disabled={busy}
            placeholder='Örn: https://open.spotify.com/playlist/xxxx...  veya  spotify:playlist:xxxx'
          />
          <div className="metaRow">
            <span className="pill">Algılanan ID: {playlistId || "-"}</span>
          </div>
        </label>

        {error && <div className="errorBox">{error}</div>}

        <div className="actionsRow" style={{ marginTop: 12 }}>
          <button className="btn" onClick={onConvert} disabled={busy}>
            {busy ? "Çevriliyor..." : "Çevir"}
          </button>

          <button className="btn secondary" onClick={onCopy} disabled={busy || !output}>
            Kopyala
          </button>

          <button className="btn secondary" type="button" disabled={busy} onClick={() => navigate("/choose")}>
            Menüye dön
          </button>
        </div>

        <label className="field" style={{ marginTop: 12 }}>
          <span>Çıktı (bizim format)</span>
          <textarea
            className="textarea"
            value={output}
            readOnly
            placeholder="Çevirince burada görünecek..."
            style={{ minHeight: 240 }}
          />
        </label>

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
