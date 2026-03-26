import { useState } from "react";
import { loginGuest } from "../services/nakama";

const theme = {
  bg: "radial-gradient(circle at 20% 20%, rgba(236,72,153,0.18), transparent 18%), radial-gradient(circle at 80% 70%, rgba(244,114,182,0.12), transparent 20%), linear-gradient(180deg, #12050a 0%, #210814 45%, #14070d 100%)",
  panel: "rgba(20, 8, 14, 0.9)",
  panelSoft: "#2a0f1c",
  border: "#f472b6",
  text: "#fff1f7",
  muted: "#f9a8d4",
  accent: "#ec4899",
  accentDark: "#be185d",
  inputBg: "#1a0b13",
};

const floatingHearts = [
  { left: "8%", top: "18%", size: 42, delay: "0s", duration: "7s", blur: 1 },
  { left: "18%", top: "72%", size: 58, delay: "1s", duration: "9s", blur: 0 },
  { left: "42%", top: "12%", size: 30, delay: "2s", duration: "8s", blur: 1 },
  { left: "66%", top: "22%", size: 46, delay: "0.5s", duration: "10s", blur: 0 },
  { left: "82%", top: "64%", size: 70, delay: "1.5s", duration: "11s", blur: 1 },
  { left: "58%", top: "78%", size: 38, delay: "2.5s", duration: "8.5s", blur: 0 },
];

interface LoginPageProps {
  onLoginSuccess: (username: string) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const clean = username.trim();

    if (!clean) {
      alert("Please enter a nickname.");
      return;
    }

    try {
      setLoading(true);
      await loginGuest(clean);
      onLoginSuccess(clean);
    } catch (error: any) {
      console.error("LOGIN FAILED:", error);
      alert(error?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {floatingHearts.map((heart, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: heart.left,
            top: heart.top,
            fontSize: `${heart.size}px`,
            color: "rgba(255, 92, 147, 0.35)",
            filter: `blur(${heart.blur}px)`,
            pointerEvents: "none",
            animation: `floatHeart ${heart.duration} ease-in-out ${heart.delay} infinite`,
            transform: "translate3d(0,0,0)",
            zIndex: 0,
          }}
        >
          ❤
        </div>
      ))}

      <div
        style={{
          width: "100%",
          maxWidth: "1160px",
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: "30px",
          alignItems: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            color: theme.text,
            display: "grid",
            gap: "22px",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-40px",
              left: "40px",
              width: "120px",
              height: "120px",
              background: "radial-gradient(circle, rgba(236,72,153,0.28), transparent 70%)",
              filter: "blur(10px)",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 16px",
              borderRadius: "999px",
              border: `1px solid ${theme.border}`,
              background: "rgba(244,114,182,0.08)",
              width: "fit-content",
              fontWeight: 800,
              letterSpacing: "0.02em",
            }}
          >
            <span style={{ fontSize: "20px" }}>❤</span>
            <span>Multiplayer Game</span>
          </div>

          <div>
            <div
              style={{
                fontSize: "clamp(48px, 8vw, 90px)",
                lineHeight: 0.92,
                fontWeight: 900,
                letterSpacing: "-0.05em",
                color: theme.text,
                textShadow: "0 8px 30px rgba(236,72,153,0.18)",
              }}
            >
              HEART
              <br />
              TAC T<span style={{ color: "#ff5c93" }}>❤</span>E
            </div>

            <p
              style={{
                marginTop: "18px",
                marginBottom: 0,
                maxWidth: "560px",
                color: theme.muted,
                fontSize: "18px",
                lineHeight: 1.7,
              }}
            >
              Room based multiplayer. Timed turns. Instant rematch.
              A romantic twist on classic tic tac toe.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "14px",
              maxWidth: "520px",
              marginTop: "6px",
            }}
          >
            {["❤", "", "O", "", "❤", "", "O", "", "❤"].map((cell, index) => (
              <div
                key={index}
                style={{
                  aspectRatio: "1 / 1",
                  borderRadius: "22px",
                  border: `1px solid ${theme.border}`,
                  background: "rgba(255,255,255,0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "36px",
                  fontWeight: 900,
                  color: cell === "❤" ? "#ff5c93" : "#fff1f7",
                  boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
                  backdropFilter: "blur(8px)",
                }}
              >
                {cell}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            background: theme.panel,
            border: `1px solid ${theme.border}`,
            borderRadius: "30px",
            padding: "30px",
            boxShadow: "0 30px 70px rgba(0,0,0,0.35)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              marginBottom: "22px",
              color: theme.text,
            }}
          >
            <div
              style={{
                fontSize: "16px",
                fontWeight: 800,
                color: theme.muted,
                marginBottom: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Join the room
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: "38px",
                lineHeight: 1.05,
                fontWeight: 900,
              }}
            >
              Enter your nickname
            </h2>

            <p
              style={{
                marginTop: "12px",
                marginBottom: 0,
                color: theme.muted,
                lineHeight: 1.7,
                fontSize: "15px",
              }}
            >
              Pick a name and jump into a live match with synced turns,
              score tracking, and rematch flow.
            </p>
          </div>

          <div style={{ display: "grid", gap: "14px" }}>
            <input
              type="text"
              placeholder="Nickname"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLogin();
              }}
              style={{
                width: "100%",
                padding: "16px 18px",
                borderRadius: "16px",
                border: `1px solid ${theme.border}`,
                background: theme.inputBg,
                color: theme.text,
                fontSize: "16px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            <button
              onClick={handleLogin}
              disabled={loading}
              style={{
                width: "100%",
                padding: "16px",
                border: "none",
                borderRadius: "16px",
                background: "linear-gradient(135deg, #ec4899, #be185d)",
                color: "white",
                fontSize: "17px",
                fontWeight: 900,
                cursor: "pointer",
                opacity: loading ? 0.75 : 1,
                boxShadow: "0 12px 30px rgba(236,72,153,0.28)",
              }}
            >
              {loading ? "Connecting..." : "Continue"}
            </button>
          </div>

          <div
            style={{
              marginTop: "18px",
              color: theme.muted,
              fontSize: "13px",
              lineHeight: 1.7,
            }}
          >
            Live multiplayer • Timed turns • Mobile friendly demo
          </div>
        </div>
      </div>

      <style>{`
        @keyframes floatHeart {
          0% {
            transform: translateY(0px) translateX(0px) scale(1) rotate(0deg);
            opacity: 0.25;
          }
          25% {
            transform: translateY(-10px) translateX(8px) scale(1.04) rotate(4deg);
            opacity: 0.4;
          }
          50% {
            transform: translateY(-22px) translateX(-6px) scale(1.08) rotate(-4deg);
            opacity: 0.32;
          }
          75% {
            transform: translateY(-12px) translateX(10px) scale(1.03) rotate(3deg);
            opacity: 0.42;
          }
          100% {
            transform: translateY(0px) translateX(0px) scale(1) rotate(0deg);
            opacity: 0.25;
          }
        }

        @media (max-width: 920px) {
          div[style*="grid-template-columns: 1.1fr 0.9fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}