import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

export default function Done() {
  const navigate = useNavigate();

  const playlistUrl = sessionStorage.getItem("last_playlist_url") || "";

  const total = Number(sessionStorage.getItem("last_total") || "0");
  const found = Number(sessionStorage.getItem("last_found") || "0");
  const notFoundCountStored = Number(sessionStorage.getItem("last_not_found_count") || "0");

  const notFound = useMemo(() => {
    try {
      const arr = JSON.parse(sessionStorage.getItem("last_not_found") || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }, []);

  const notFoundCount = notFound.length || notFoundCountStored;

  return (
    <div className="page">
      <div className="bg-blur a" />
      <div className="bg-blur b" />

      <main className="card">
        <h1>Tamamlandı</h1>

        <p className="sub">
          {total > 0
            ? `${found} şarkı bulundu, ${notFoundCount} şarkı bulunamadı.`
            : "Playlist oluşturuldu ve bulunan şarkılar eklendi."}
        </p>

        {playlistUrl && (
          <a className="btn" href={playlistUrl} target="_blank" rel="noreferrer">
            Spotify’da aç
          </a>
        )}

        {notFound.length > 0 && (
          <div className="logBox" style={{ marginTop: 16 }}>
            <div className="logTitle">Bulunamayan şarkılar</div>
            <ul className="logList">
              {notFound.map((x, i) => (
                <li key={i}>
                  {x.title}
                  {x.artist ? ` — ${x.artist}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="actionsRow" style={{ marginTop: 16 }}>
          <button className="btn" onClick={() => navigate("/export")}>
            Playlist’ten text çıkar
          </button>

          <button className="btn secondary" onClick={() => navigate("/builder")}>
            Yeni playlist oluştur
          </button>

          <button
            className="btn secondary"
            onClick={() => {
              sessionStorage.removeItem("spotify_access_token");
              navigate("/", { replace: true });
            }}
          >
            Çıkış
          </button>
        </div>
      </main>
    </div>
  );
}
