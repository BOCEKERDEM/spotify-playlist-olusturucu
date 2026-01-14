const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;

// Hangi adresten açtıysan callback oraya döner (Cloudflare tunnel dahil)
const REDIRECT_URI = `${window.location.origin}/callback`;

// Public/Private seçimi kaldırıldı. Playlist her zaman public.
// Bu nedenle yalnızca playlist-modify-public yeterli.
const SCOPES = ["user-read-private", "playlist-modify-public"];

function base64UrlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return await crypto.subtle.digest("SHA-256", data);
}

function randomString(length = 64) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let result = "";
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) result += chars[array[i] % chars.length];
  return result;
}

export async function startSpotifyLogin() {
  if (!CLIENT_ID) {
    alert(".env.local içinde VITE_SPOTIFY_CLIENT_ID eksik.");
    return;
  }

  // PKCE
  const verifier = randomString(64);
  const challenge = base64UrlEncode(await sha256(verifier));
  sessionStorage.setItem("spotify_pkce_verifier", verifier);

  // OAuth state (ek güvenlik)
  const state = randomString(32);
  sessionStorage.setItem("spotify_oauth_state", state);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    code_challenge_method: "S256",
    code_challenge: challenge,
    scope: SCOPES.join(" "),
    state,
    show_dialog: "false",
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code, returnedState) {
  const verifier = sessionStorage.getItem("spotify_pkce_verifier");
  if (!verifier) throw new Error("PKCE verifier yok. Tekrar giriş yapın.");

  // State doğrulama (Callback sayfasında returnedState gönderiyoruz)
  const expectedState = sessionStorage.getItem("spotify_oauth_state");
  if (expectedState && returnedState && expectedState !== returnedState) {
    throw new Error("OAuth state uyuşmuyor. Güvenlik nedeniyle işlem iptal edildi.");
  }

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier,
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || "Token alınamadı.");
  }

  return await res.json();
}
