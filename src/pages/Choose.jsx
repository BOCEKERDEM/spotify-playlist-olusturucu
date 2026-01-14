import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Choose() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = sessionStorage.getItem("spotify_access_token");
    if (!token) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="page">
      <div className="bg-blur a" />
      <div className="bg-blur b" />

      <main className="card formCard">
        <h1>Ne yapmak istiyorsun?</h1>
        <p className="sub">Import ile playlist oluştur, Export ile playlist’i text’e çevir.</p>

        <div className="actionsRow" style={{ marginTop: 16 }}>
          <button className="btn" type="button" onClick={() => navigate("/builder")}>
            Import
          </button>

          <button className="btn secondary" type="button" onClick={() => navigate("/export")}>
            Export
          </button>
        </div>

        <div className="actionsRow" style={{ marginTop: 12 }}>
          <button
            className="btn secondary"
            type="button"
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
