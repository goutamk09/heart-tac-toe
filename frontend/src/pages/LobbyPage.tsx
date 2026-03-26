import { useEffect, useMemo, useState } from "react";
import {
  createMatch,
  joinMatch,
  listAvailableMatches,
  type AvailableMatch,
} from "../services/nakama";

const theme = {
  bg: "radial-gradient(circle at 20% 20%, rgba(236,72,153,0.18), transparent 18%), radial-gradient(circle at 80% 70%, rgba(244,114,182,0.12), transparent 20%), linear-gradient(180deg, #12050a 0%, #210814 45%, #14070d 100%)",
  panel: "rgba(31, 11, 20, 0.92)",
  panelSoft: "#2a0f1c",
  border: "#f472b6",
  text: "#ffe4ef",
  muted: "#f9a8d4",
  inputBg: "#1a0b13",
};

const floatingHearts = [
  { left: "4%", top: "8%", size: 24, delay: "0s", duration: "8s", blur: 1 },
  { left: "12%", top: "28%", size: 34, delay: "1s", duration: "10s", blur: 0 },
  { left: "8%", top: "62%", size: 28, delay: "2s", duration: "9s", blur: 1 },
  { left: "18%", top: "84%", size: 42, delay: "0.6s", duration: "11s", blur: 0 },

  { left: "34%", top: "12%", size: 26, delay: "1.5s", duration: "9s", blur: 1 },
  { left: "42%", top: "38%", size: 38, delay: "0.8s", duration: "12s", blur: 0 },
  { left: "36%", top: "70%", size: 30, delay: "2.4s", duration: "8.5s", blur: 1 },
  { left: "46%", top: "90%", size: 22, delay: "1.2s", duration: "10.5s", blur: 0 },

  { left: "62%", top: "10%", size: 32, delay: "0.4s", duration: "11s", blur: 1 },
  { left: "72%", top: "26%", size: 46, delay: "2.1s", duration: "12s", blur: 0 },
  { left: "66%", top: "58%", size: 24, delay: "1.7s", duration: "8s", blur: 1 },
  { left: "74%", top: "82%", size: 36, delay: "0.9s", duration: "10s", blur: 0 },

  { left: "88%", top: "14%", size: 28, delay: "1.1s", duration: "9.5s", blur: 1 },
  { left: "92%", top: "46%", size: 40, delay: "2.6s", duration: "11.5s", blur: 0 },
  { left: "86%", top: "74%", size: 26, delay: "0.5s", duration: "8.8s", blur: 1 },
];

interface LobbyPageProps {
  username: string;
  onMatchCreated: (matchId: string) => void;
}

export default function LobbyPage({
  username,
  onMatchCreated,
}: LobbyPageProps) {
  const [status, setStatus] = useState("Ready to play");
  const [loading, setLoading] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [joinMatchId, setJoinMatchId] = useState("");
  const [availableMatches, setAvailableMatches] = useState<AvailableMatch[]>([]);

  async function refreshMatches(statusMessage?: string) {
    try {
      setLoadingMatches(true);
      const matches = await listAvailableMatches();
      const joinableMatches = matches.filter((match) => match.size === 1);
      setAvailableMatches(joinableMatches);

      if (statusMessage) {
        setStatus(statusMessage);
      } else if (joinableMatches.length === 0) {
        setStatus("No joinable rooms found.");
      } else {
        setStatus("Room list refreshed.");
      }
    } catch (error) {
      console.error("List matches failed:", error);
      setStatus(statusMessage ?? "Could not refresh room list");
    } finally {
      setLoadingMatches(false);
    }
  }

  useEffect(() => {
    refreshMatches("Ready to play");
  }, []);

  async function handleCreateRoom() {
    try {
      setLoading(true);
      setStatus("Creating room...");

      const match = await createMatch();
      setStatus(`Room created: ${match.match_id}`);
      onMatchCreated(match.match_id);
    } catch (error) {
      console.error("Create room failed:", error);
      setStatus("Could not create room");
      await refreshMatches();
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinRoom() {
    if (!joinMatchId.trim()) {
      setStatus("Please enter a match ID");
      return;
    }

    try {
      setLoading(true);
      setStatus("Joining room...");

      const match = await joinMatch(joinMatchId.trim());
      setStatus(`Joined room: ${match.match_id}`);
      onMatchCreated(match.match_id);
    } catch (error) {
      console.error("Join room failed:", error);
      setStatus("Could not join room. Check the match ID and try again.");
      await refreshMatches();
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinListedRoom(matchId: string) {
    try {
      setLoading(true);
      setStatus("Joining listed room...");

      const match = await joinMatch(matchId);
      setStatus(`Joined room: ${match.match_id}`);
      onMatchCreated(match.match_id);
    } catch (error) {
      console.error("Join listed room failed:", error);

      setAvailableMatches((prev) =>
        prev.filter((match) => match.matchId !== matchId)
      );

      await refreshMatches("Room is no longer available. Refreshed the list.");
    } finally {
      setLoading(false);
    }
  }

  const visibleMatches = useMemo(() => {
    return availableMatches.filter((match) => match.size === 1);
  }, [availableMatches]);

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
            color: "rgba(255, 92, 147, 0.28)",
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
          maxWidth: "1180px",
          display: "grid",
          gridTemplateColumns: "1.05fr 0.95fr",
          gap: "26px",
          alignItems: "stretch",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            background: theme.panel,
            border: `1px solid ${theme.border}`,
            borderRadius: "28px",
            padding: "28px",
            boxShadow: "0 25px 60px rgba(0,0,0,0.28)",
            color: theme.text,
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 14px",
              borderRadius: "999px",
              border: `1px solid ${theme.border}`,
              background: "rgba(244,114,182,0.08)",
              width: "fit-content",
              fontWeight: 700,
              marginBottom: "18px",
            }}
          >
            <span style={{ fontSize: "22px" }}>❤</span>
            <span>Heart Tac Toe Lobby</span>
          </div>

          <h1
            style={{
              marginTop: 0,
              marginBottom: "10px",
              fontSize: "44px",
              lineHeight: 1.05,
              fontWeight: 900,
              letterSpacing: "-0.03em",
            }}
          >
            Welcome back,
            <br />
            {username}
          </h1>

          <p
            style={{
              marginTop: 0,
              marginBottom: "24px",
              color: theme.muted,
              fontSize: "17px",
              lineHeight: 1.6,
              maxWidth: "520px",
            }}
          >
            Create a private room, join by code, or pick an active room from the lobby list.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "14px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                padding: "18px",
                borderRadius: "18px",
                border: `1px solid ${theme.border}`,
                background: theme.panelSoft,
              }}
            >
              <div style={{ fontSize: "28px", marginBottom: "10px" }}>⚡</div>
              <div style={{ fontSize: "18px", fontWeight: 800, marginBottom: "6px" }}>
                Live multiplayer
              </div>
              <div style={{ color: theme.muted, lineHeight: 1.5 }}>
                Real time turn sync with match timer and rematch support.
              </div>
            </div>

            <div
              style={{
                padding: "18px",
                borderRadius: "18px",
                border: `1px solid ${theme.border}`,
                background: theme.panelSoft,
              }}
            >
              <div style={{ fontSize: "28px", marginBottom: "10px" }}>💖</div>
              <div style={{ fontSize: "18px", fontWeight: 800, marginBottom: "6px" }}>
                Room discovery
              </div>
              <div style={{ color: theme.muted, lineHeight: 1.5 }}>
                Browse available rooms and join instantly without copying IDs.
              </div>
            </div>
          </div>

          <div
            style={{
              padding: "18px",
              borderRadius: "18px",
              border: `1px solid ${theme.border}`,
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <div style={{ color: theme.muted, marginBottom: "8px", fontWeight: 700 }}>
              Quick play guide
            </div>
            <div style={{ lineHeight: 1.7 }}>
              1. Create Room
              <br />
              2. Share the match ID or let a friend join from the room list
              <br />
              3. Play live
              <br />
              4. Request rematch after the result
            </div>
          </div>
        </div>

        <div
          style={{
            background: theme.panel,
            border: `1px solid ${theme.border}`,
            borderRadius: "28px",
            padding: "28px",
            boxShadow: "0 25px 60px rgba(0,0,0,0.28)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              color: theme.text,
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                fontSize: "16px",
                fontWeight: 800,
                color: theme.muted,
                marginBottom: "8px",
              }}
            >
              Match actions
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: "34px",
                fontWeight: 900,
                lineHeight: 1.1,
              }}
            >
              Create, join, or browse
            </h2>
          </div>

          <div style={{ display: "grid", gap: "14px" }}>
            <button
              onClick={handleCreateRoom}
              disabled={loading}
              style={{
                width: "100%",
                padding: "16px",
                border: "none",
                borderRadius: "16px",
                background: "linear-gradient(135deg, #ec4899, #be185d)",
                color: "white",
                cursor: "pointer",
                fontWeight: 900,
                fontSize: "17px",
                opacity: loading ? 0.75 : 1,
                boxShadow: "0 10px 30px rgba(236,72,153,0.28)",
              }}
            >
              {loading ? "Working..." : "Create Room"}
            </button>

            <div
              style={{
                display: "grid",
                gap: "12px",
                padding: "16px",
                borderRadius: "18px",
                border: `1px solid ${theme.border}`,
                background: theme.panelSoft,
              }}
            >
              <div
                style={{
                  color: theme.muted,
                  fontWeight: 700,
                }}
              >
                Join using match ID
              </div>

              <input
                type="text"
                placeholder="Paste match ID"
                value={joinMatchId}
                onChange={(e) => setJoinMatchId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "15px 16px",
                  borderRadius: "14px",
                  border: `1px solid ${theme.border}`,
                  background: theme.inputBg,
                  color: theme.text,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />

              <button
                onClick={handleJoinRoom}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "15px",
                  border: `1px solid ${theme.border}`,
                  borderRadius: "14px",
                  background: "#3a1325",
                  color: theme.text,
                  cursor: "pointer",
                  fontWeight: 900,
                  fontSize: "16px",
                }}
              >
                Join Room
              </button>
            </div>

            <div
              style={{
                padding: "16px",
                borderRadius: "18px",
                border: `1px solid ${theme.border}`,
                background: theme.panelSoft,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    color: theme.text,
                    fontWeight: 900,
                    fontSize: "18px",
                  }}
                >
                  Available Rooms
                </div>

                <button
                  onClick={() => refreshMatches("Room list refreshed")}
                  disabled={loadingMatches}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "12px",
                    border: `1px solid ${theme.border}`,
                    background: "rgba(255,255,255,0.04)",
                    color: theme.text,
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  {loadingMatches ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              <div style={{ display: "grid", gap: "10px" }}>
                {visibleMatches.length === 0 ? (
                  <div
                    style={{
                      padding: "14px",
                      borderRadius: "14px",
                      background: "rgba(255,255,255,0.04)",
                      color: theme.muted,
                    }}
                  >
                    No joinable rooms found.
                  </div>
                ) : (
                  visibleMatches.map((match) => (
                    <div
                      key={match.matchId}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "12px",
                        padding: "14px",
                        borderRadius: "14px",
                        background: "rgba(255,255,255,0.04)",
                        border: `1px solid ${theme.border}`,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            color: theme.text,
                            fontWeight: 800,
                            marginBottom: "4px",
                            wordBreak: "break-all",
                          }}
                        >
                          {match.matchId}
                        </div>
                        <div
                          style={{
                            color: theme.muted,
                            fontSize: "13px",
                          }}
                        >
                          Players: {match.size}/2
                        </div>
                      </div>

                      <button
                        onClick={() => handleJoinListedRoom(match.matchId)}
                        disabled={loading}
                        style={{
                          padding: "10px 14px",
                          borderRadius: "12px",
                          border: "none",
                          background: "linear-gradient(135deg, #ec4899, #be185d)",
                          color: "white",
                          cursor: "pointer",
                          fontWeight: 800,
                          whiteSpace: "nowrap",
                        }}
                      >
                        Join
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div
              style={{
                padding: "16px",
                borderRadius: "16px",
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${theme.border}`,
                color: theme.text,
                lineHeight: 1.6,
                wordBreak: "break-word",
              }}
            >
              <strong>Status:</strong> {status}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes floatHeart {
          0% {
            transform: translateY(0px) translateX(0px) scale(1) rotate(0deg);
            opacity: 0.22;
          }
          25% {
            transform: translateY(-10px) translateX(8px) scale(1.04) rotate(4deg);
            opacity: 0.35;
          }
          50% {
            transform: translateY(-20px) translateX(-6px) scale(1.08) rotate(-4deg);
            opacity: 0.28;
          }
          75% {
            transform: translateY(-12px) translateX(10px) scale(1.03) rotate(3deg);
            opacity: 0.38;
          }
          100% {
            transform: translateY(0px) translateX(0px) scale(1) rotate(0deg);
            opacity: 0.22;
          }
        }

        @media (max-width: 920px) {
          div[style*="grid-template-columns: 1.05fr 0.95fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}