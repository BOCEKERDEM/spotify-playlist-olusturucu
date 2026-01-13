import { startSpotifyLogin } from "../spotifyAuth";

export default function Login() {
  return (
    <div className="page">
      <div className="bg-blur a" />
      <div className="bg-blur b" />

      <main className="card">
        <div className="brand">
          <div className="logo" aria-hidden="true">♪</div>
          <div>
            <h1>Spotify Playlist Oluşturucu</h1>
            <p className="sub">
              Playlist adını ve şarkı listesini ver, Spotify hesabında otomatik playlist oluşturalım.
            </p>
          </div>
        </div>

        <div className="actions">
          <button className="btn" onClick={() => startSpotifyLogin()}>
            Spotify ile giriş
          </button>
          <p className="hint">
            Giriş yaptıktan sonra seni playlist oluşturma ekranına yönlendireceğiz.
          </p>
        </div>

        <div className="footer">
          <span className="pill">127.0.0.1</span>
          <span className="dot" />
          <span className="pill">PKCE Auth</span>
          <span className="dot" />
          <span className="pill">Private / Public</span>
        </div>
      </main>
    </div>
  );
}
