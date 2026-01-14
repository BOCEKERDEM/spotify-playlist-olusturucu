import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { exchangeCodeForToken } from "../spotifyAuth";

export default function Callback() {
  const [msg, setMsg] = useState("Spotify'dan dönüş alındı. Giriş tamamlanıyor...");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const state = params.get("state");
        const error = params.get("error");

        if (error) throw new Error(error);
        if (!code) throw new Error("code yok. Tekrar giriş yapın.");

        const tokenData = await exchangeCodeForToken(code, state);
        sessionStorage.setItem("spotify_access_token", tokenData.access_token);

        setMsg("Başarılı. Yönlendiriliyorsun...");
        navigate("/choose", { replace: true });
      } catch (e) {
        setMsg(`Hata: ${e.message}`);
      }
    })();
  }, [navigate]);

  return (
    <div className="page">
      <main className="card">
        <h1>Giriş</h1>
        <p className="sub">{msg}</p>
      </main>
    </div>
  );
}
