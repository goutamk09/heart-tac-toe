import { useEffect, useMemo, useState } from "react";
import { getDisplayUsername } from "../utils/displayName";
import {
  getSession,
  sendMove,
  setMatchStateListener,
  sendRematchRequest,
  leaveCurrentMatch,
  type MatchSnapshot,
} from "../services/nakama";

const theme = {
  bg: "radial-gradient(circle at top, rgba(236,72,153,0.16), transparent 26%), linear-gradient(180deg, #14070d 0%, #2a0d1c 45%, #12050a 100%)",
  panel: "rgba(31, 11, 20, 0.94)",
  panelSoft: "#2a0f1c",
  border: "#f472b6",
  text: "#ffe4ef",
  muted: "#f9a8d4",
  accent: "#ec4899",
  accentDark: "#be185d",
  resultBg: "#fff7fb",
  goldBg: "linear-gradient(135deg, #ffd1e8, #f9a8d4)",
  goldText: "#6b1038",
  whiteCard: "#ffffff",
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

interface MatchPageProps {
  username: string;
  matchId: string;
  onLeave: () => void;
}

// type PlayerRow = {
//   userId: string;
//   username: string;
//   symbol: "X" | "O";
//   wins: number;
//   losses: number;
//   draws: number;
//   score: number;
// };

const EMPTY_SNAPSHOT: MatchSnapshot = {
  board: ["", "", "", "", "", "", "", "", ""],
  currentTurn: "X",
  status: "Waiting for game state...",
  winner: null,
  winnerUsername: null,
  players: [],
  gameDurationSec: 0,
  turnTimeRemainingSec: 0,
  turnTimeLimitSec: 45,
  rematchVotes: {},
  rematchRequestedBy: null,
};

function formatTime(totalSec: number) {
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function displaySymbol(symbol: "X" | "O" | null) {
  if (symbol === "X") return "❤";
  if (symbol === "O") return "O";
  return "…";
}

function displayCell(cell: string) {
  if (cell === "X") return "❤";
  if (cell === "O") return "O";
  return "";
}

function cleanStatusText(text: string) {
  return text.replace(/_[a-z0-9]{4}\b/gi, "");
}

export default function MatchPage({
  username,
  matchId,
  onLeave,
}: MatchPageProps) {
  const [snapshot, setSnapshot] = useState<MatchSnapshot>(EMPTY_SNAPSHOT);

  const session = getSession();

  useEffect(() => {
    setSnapshot(EMPTY_SNAPSHOT);

    const handleSnapshot = (payload: MatchSnapshot) => {
      setSnapshot({
        board: Array.isArray(payload.board) ? payload.board : EMPTY_SNAPSHOT.board,
        currentTurn: payload.currentTurn ?? "X",
        status: payload.status ?? "Waiting for game state...",
        winner: payload.winner ?? null,
        winnerUsername: payload.winnerUsername ?? null,
        players: Array.isArray(payload.players) ? payload.players : [],
        gameDurationSec: payload.gameDurationSec ?? 0,
        turnTimeRemainingSec: payload.turnTimeRemainingSec ?? 0,
        turnTimeLimitSec: payload.turnTimeLimitSec ?? 45,
        rematchVotes: payload.rematchVotes ?? {},
        rematchRequestedBy: payload.rematchRequestedBy ?? null,
      });
    };

    setMatchStateListener(handleSnapshot);

    return () => {
      setMatchStateListener(null);
    };
  }, [matchId]);

  const {
    board,
    currentTurn,
    status,
    winner,
    players,
    gameDurationSec,
    turnTimeRemainingSec,
    turnTimeLimitSec,
    rematchVotes,
    rematchRequestedBy,
  } = snapshot;

  const myPlayer = useMemo(() => {
    if (!session) return null;
    return players.find((p) => p.userId === session.user_id) ?? null;
  }, [players, session]);

  const opponentPlayer = useMemo(() => {
    if (!session) return null;
    return players.find((p) => p.userId !== session.user_id) ?? null;
  }, [players, session]);

  const mySymbol = myPlayer?.symbol ?? null;
  const normalizedStatus = status.toLowerCase();
  const waitingForSecondPlayer =
    players.length < 2 && normalizedStatus.includes("waiting");
  const playerLeftMatch =
    normalizedStatus.includes("left the match") ||
    normalizedStatus.includes("please create a new room");
  const onlyOnePlayerLeft = players.length < 2;
  const matchAbandoned = playerLeftMatch;
  const boardFull = board.every((cell) => cell !== "");
  const isDraw = !winner && boardFull;
  const isGameFinished = !!winner || isDraw || matchAbandoned;

  const canPlay =
    !!mySymbol &&
    mySymbol === currentTurn &&
    !isGameFinished &&
    players.length === 2 &&
    board.some((cell) => cell === "");

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => b.score - a.score);
  }, [players]);

  const didIRequestRematch =
    !!session &&
    !!rematchRequestedBy &&
    rematchRequestedBy.userId === session.user_id;

  const shouldApproveRematch =
    !!session &&
    !!rematchRequestedBy &&
    rematchRequestedBy.userId !== session.user_id &&
    !matchAbandoned &&
    players.length === 2;

  const iWon = !!myPlayer && !!winner && winner === myPlayer.symbol;
  const iLost = !!myPlayer && !!winner && winner !== myPlayer.symbol;

  async function handleCellClick(index: number) {
    if (!canPlay) return;
    if (board[index] !== "") return;

    try {
      await sendMove(matchId, index);
    } catch (error) {
      console.error("Move send failed:", error);
    }
  }

  async function handleLeaveMatch() {
    await leaveCurrentMatch();
    onLeave();
  }

  async function handleRematchAction() {
    if (matchAbandoned || players.length < 2) return;

    try {
      await sendRematchRequest(matchId);
    } catch (error) {
      console.error("Rematch action failed:", error);
    }
  }

  function getResultTitle() {
    if (matchAbandoned) return "Match Ended";
    if (iWon) return "You Won!";
    if (iLost) return "You Lost";
    return "Match Finished";
  }

  function getResultSubtitle() {
    if (matchAbandoned) return status;
    if (iWon) return "Amazing round. You won the match.";
    if (iLost) return "You lost this round. Ask for a rematch.";
    return "The match ended in a draw.";
  }

  const boardGlow = canPlay
    ? "0 0 0 2px rgba(244,114,182,0.65), 0 20px 60px rgba(236,72,153,0.18)"
    : "0 20px 60px rgba(0,0,0,0.22)";

  const showRematchBanner =
    !!rematchRequestedBy && !onlyOnePlayerLeft && !matchAbandoned;

  const showAskForRematchButton =
    !onlyOnePlayerLeft && !matchAbandoned && !rematchRequestedBy;

  const showApproveRematchButton =
    !onlyOnePlayerLeft && !matchAbandoned && shouldApproveRematch;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.bg,
        padding: "20px",
        position: "relative",
        overflow: "hidden",
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
            color: "rgba(255, 92, 147, 0.20)",
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
          maxWidth: "1280px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "420px minmax(0, 1fr)",
          gap: "22px",
          alignItems: "start",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ display: "grid", gap: "18px" }}>
          <div
            style={{
              background: theme.panel,
              border: `1px solid ${theme.border}`,
              borderRadius: "28px",
              padding: "24px",
              boxShadow: "0 25px 60px rgba(0,0,0,0.28)",
              color: theme.text,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                padding: "9px 14px",
                borderRadius: "999px",
                border: `1px solid ${theme.border}`,
                background: "rgba(244,114,182,0.08)",
                width: "fit-content",
                fontWeight: 800,
                marginBottom: "16px",
              }}
            >
              <span style={{ fontSize: "20px" }}>❤</span>
              <span>Heart Tac Toe</span>
            </div>

            <h1
              style={{
                marginTop: 0,
                marginBottom: "8px",
                fontSize: "42px",
                lineHeight: 1,
                fontWeight: 900,
                letterSpacing: "-0.03em",
              }}
            >
              Live Match
            </h1>

            <p
              style={{
                marginTop: 0,
                marginBottom: "18px",
                color: theme.muted,
                lineHeight: 1.6,
              }}
            >
              Real time multiplayer with turn sync, rematches, timers, and score tracking.
            </p>

            <div
              style={{
                display: "grid",
                gap: "10px",
                color: theme.text,
                lineHeight: 1.6,
                fontSize: "15px",
              }}
            >
              <div><strong>Match ID:</strong> {matchId}</div>
              <div><strong>Status:</strong> {cleanStatusText(status)}</div>
              <div><strong>Your Symbol:</strong> {displaySymbol(mySymbol)}</div>
              <div><strong>Current Turn:</strong> {displaySymbol(currentTurn)}</div>
            </div>
          </div>

          <div
            style={{
              background: theme.panel,
              border: `1px solid ${theme.border}`,
              borderRadius: "28px",
              padding: "20px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.22)",
            }}
          >
            <div
              style={{
                color: theme.text,
                fontWeight: 900,
                fontSize: "22px",
                marginBottom: "14px",
              }}
            >
              Players
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
              <div
                style={{
                  padding: "16px",
                  borderRadius: "18px",
                  border:
                    currentTurn === myPlayer?.symbol && players.length === 2
                      ? `2px solid ${theme.border}`
                      : `1px solid ${theme.border}`,
                  background:
                    currentTurn === myPlayer?.symbol && players.length === 2
                      ? "rgba(244,114,182,0.10)"
                      : theme.panelSoft,
                  color: theme.text,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: "18px" }}>
                    {myPlayer?.username
                      ? getDisplayUsername(myPlayer.username)
                      : username}
                  </div>
                  <div style={{ fontSize: "26px", fontWeight: 900 }}>
                    {displaySymbol(myPlayer?.symbol ?? null)}
                  </div>
                </div>
                <div style={{ color: theme.muted, fontSize: "14px" }}>
                  {players.length < 2
                    ? "Waiting"
                    : currentTurn === myPlayer?.symbol
                    ? "Your turn"
                    : "Waiting"}
                </div>
              </div>

              <div
                style={{
                  padding: "16px",
                  borderRadius: "18px",
                  border:
                    currentTurn === opponentPlayer?.symbol && players.length === 2
                      ? `2px solid ${theme.border}`
                      : `1px solid ${theme.border}`,
                  background:
                    currentTurn === opponentPlayer?.symbol && players.length === 2
                      ? "rgba(244,114,182,0.10)"
                      : theme.panelSoft,
                  color: theme.text,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: "18px" }}>
                    {opponentPlayer?.username
                      ? getDisplayUsername(opponentPlayer.username)
                      : "Waiting for player"}
                  </div>
                  <div style={{ fontSize: "26px", fontWeight: 900 }}>
                    {displaySymbol(opponentPlayer?.symbol ?? null)}
                  </div>
                </div>
                <div style={{ color: theme.muted, fontSize: "14px" }}>
                  {opponentPlayer
                    ? currentTurn === opponentPlayer.symbol
                      ? "Opponent turn"
                      : "Waiting"
                    : "Not joined yet"}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "14px",
            }}
          >
            <div
              style={{
                background: theme.panel,
                border: `1px solid ${theme.border}`,
                borderRadius: "22px",
                padding: "18px",
                boxShadow: "0 18px 40px rgba(0,0,0,0.18)",
              }}
            >
              <div style={{ color: theme.muted, fontSize: "13px", marginBottom: "8px" }}>
                Game Timer
              </div>
              <div
                style={{
                  color: theme.text,
                  fontSize: "34px",
                  fontWeight: 900,
                }}
              >
                {formatTime(gameDurationSec)}
              </div>
            </div>

            <div
              style={{
                background: theme.panel,
                border: `1px solid ${theme.border}`,
                borderRadius: "22px",
                padding: "18px",
                boxShadow: "0 18px 40px rgba(0,0,0,0.18)",
              }}
            >
              <div style={{ color: theme.muted, fontSize: "13px", marginBottom: "8px" }}>
                Move Timer
              </div>
              <div
                style={{
                  color: turnTimeRemainingSec <= 10 ? "#fb7185" : theme.text,
                  fontSize: "34px",
                  fontWeight: 900,
                }}
              >
                {turnTimeRemainingSec}s
              </div>
              <div style={{ color: theme.muted, fontSize: "12px" }}>
                out of {turnTimeLimitSec}s
              </div>
            </div>
          </div>

          {!isGameFinished && (
            <button
              onClick={handleLeaveMatch}
              style={{
                width: "100%",
                padding: "15px",
                borderRadius: "16px",
                border: `1px solid ${theme.border}`,
                background: theme.panelSoft,
                color: theme.text,
                cursor: "pointer",
                fontWeight: 900,
                fontSize: "16px",
              }}
            >
              Leave Match
            </button>
          )}
        </div>

        <div style={{ position: "relative", minHeight: "100%" }}>
          <div
            style={{
              background: theme.panel,
              border: `1px solid ${theme.border}`,
              borderRadius: "30px",
              padding: "24px",
              boxShadow: boardGlow,
              transition: "box-shadow 0.25s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "18px",
                gap: "14px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    color: theme.text,
                    fontWeight: 900,
                    fontSize: "28px",
                    lineHeight: 1,
                  }}
                >
                  Tic Tac Toe Board
                </div>
                <div style={{ color: theme.muted, marginTop: "8px" }}>
                  {waitingForSecondPlayer
                    ? "Waiting for second player"
                    : canPlay
                    ? "Your move — choose a cell"
                    : isGameFinished
                    ? "Match completed"
                    : "Waiting for the active player"}
                </div>
              </div>

              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "999px",
                  border: `1px solid ${theme.border}`,
                  background: "rgba(244,114,182,0.08)",
                  color: theme.text,
                  fontWeight: 800,
                }}
              >
                Turn: {displaySymbol(currentTurn)}
              </div>
            </div>

            <div
              style={{
                width: "100%",
                maxWidth: "760px",
                margin: "0 auto",
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "16px",
                filter: isGameFinished ? "blur(2px)" : "none",
                opacity: isGameFinished ? 0.42 : 1,
                pointerEvents: isGameFinished ? "none" : "auto",
                transition: "all 0.25s ease",
              }}
            >
              {board.map((cell, index) => (
                <button
                  key={index}
                  onClick={() => handleCellClick(index)}
                  disabled={!canPlay || cell !== ""}
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    borderRadius: "24px",
                    border: `2px solid ${theme.border}`,
                    background: theme.whiteCard,
                    fontSize: "clamp(42px, 6vw, 78px)",
                    fontWeight: 900,
                    color: cell === "X" ? "#ff4d88" : "#111827",
                    cursor: !canPlay || cell !== "" ? "not-allowed" : "pointer",
                    boxShadow: cell
                      ? "0 0 24px rgba(236,72,153,0.18)"
                      : "0 10px 30px rgba(0,0,0,0.10)",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  }}
                >
                  {displayCell(cell)}
                </button>
              ))}
            </div>
          </div>

          {isGameFinished && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "12px",
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: "640px",
                  background: theme.resultBg,
                  borderRadius: "28px",
                  padding: "26px",
                  boxShadow: "0 25px 60px rgba(15,23,42,0.28)",
                  border: `1px solid ${theme.border}`,
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    marginBottom: "20px",
                    padding: "20px",
                    borderRadius: "20px",
                    background: theme.goldBg,
                    border: `1px solid ${theme.border}`,
                  }}
                >
                  <div style={{ fontSize: "38px" }}>
                    {matchAbandoned ? "🚪" : iWon ? "💖" : iLost ? "💔" : "🎉"}
                  </div>
                  <div
                    style={{
                      fontSize: "34px",
                      fontWeight: 900,
                      color: theme.goldText,
                      marginTop: "8px",
                    }}
                  >
                    {getResultTitle()}
                  </div>
                  <div
                    style={{
                      marginTop: "10px",
                      color: theme.goldText,
                      fontWeight: 600,
                      fontSize: "16px",
                    }}
                  >
                    {getResultSubtitle()}
                  </div>
                </div>

                <div
                  style={{
                    padding: "18px",
                    borderRadius: "20px",
                    border: `1px solid ${theme.border}`,
                    background: "#fff0f7",
                    marginBottom: "16px",
                  }}
                >
                  <h3
                    style={{
                      marginTop: 0,
                      marginBottom: "14px",
                      color: theme.goldText,
                      fontSize: "24px",
                    }}
                  >
                    Leaderboard
                  </h3>

                  <div style={{ display: "grid", gap: "12px" }}>
                    {sortedPlayers.map((p) => (
                      <div
                        key={p.userId}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "14px 16px",
                          borderRadius: "16px",
                          background: "white",
                          border: `1px solid #fbcfe8`,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: 900,
                              color: theme.goldText,
                              fontSize: "18px",
                            }}
                          >
                            {getDisplayUsername(p.username)} ({displaySymbol(p.symbol)})
                          </div>
                          <div
                            style={{
                              fontSize: "13px",
                              color: "#9d174d",
                              marginTop: "4px",
                            }}
                          >
                            W: {p.wins} | L: {p.losses} | D: {p.draws}
                          </div>
                        </div>

                        <div
                          style={{
                            fontWeight: 900,
                            color: theme.goldText,
                            fontSize: "18px",
                          }}
                        >
                          {p.score} pts
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {showRematchBanner && (
                  <div
                    style={{
                      marginBottom: "14px",
                      padding: "13px 15px",
                      borderRadius: "16px",
                      background: "#ffe4ef",
                      border: `1px solid ${theme.border}`,
                      color: theme.accentDark,
                      fontWeight: 700,
                    }}
                  >
                    {didIRequestRematch
                      ? "Waiting for opponent to approve your rematch request."
                      : `${rematchRequestedBy?.username ? getDisplayUsername(rematchRequestedBy.username) : "Opponent"} requested a rematch. Approve if you want to play again.`}
                  </div>
                )}

                {matchAbandoned && (
                  <div
                    style={{
                      marginBottom: "14px",
                      padding: "13px 15px",
                      borderRadius: "16px",
                      background: "#ffe4ef",
                      border: `1px solid ${theme.border}`,
                      color: theme.accentDark,
                      fontWeight: 700,
                    }}
                  >
                    {cleanStatusText(status)}
                  </div>
                )}

                <div style={{ display: "grid", gap: "12px" }}>
                  {showAskForRematchButton && (
                    <button
                      onClick={handleRematchAction}
                      style={{
                        width: "100%",
                        padding: "15px",
                        borderRadius: "16px",
                        border: "none",
                        background: "linear-gradient(135deg, #ec4899, #be185d)",
                        color: "white",
                        cursor: "pointer",
                        fontWeight: 900,
                        fontSize: "16px",
                        boxShadow: "0 10px 24px rgba(236,72,153,0.22)",
                      }}
                    >
                      Ask for Rematch
                    </button>
                  )}

                  {showApproveRematchButton && (
                    <button
                      onClick={handleRematchAction}
                      style={{
                        width: "100%",
                        padding: "15px",
                        borderRadius: "16px",
                        border: "none",
                        background: "linear-gradient(135deg, #fb7185, #ec4899)",
                        color: "white",
                        cursor: "pointer",
                        fontWeight: 900,
                        fontSize: "16px",
                        boxShadow: "0 10px 24px rgba(236,72,153,0.18)",
                      }}
                    >
                      Approve Rematch
                    </button>
                  )}

                  <button
                    onClick={handleLeaveMatch}
                    style={{
                      width: "100%",
                      padding: "15px",
                      borderRadius: "16px",
                      border: `1px solid ${theme.border}`,
                      background: "white",
                      color: theme.goldText,
                      cursor: "pointer",
                      fontWeight: 900,
                      fontSize: "16px",
                    }}
                  >
                    Exit Match
                  </button>
                </div>

                <div
                  style={{
                    marginTop: "12px",
                    textAlign: "center",
                    fontSize: "13px",
                    color: "#9d174d",
                  }}
                >
                  Rematch votes: {Object.keys(rematchVotes).length} / 2
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes floatHeart {
          0% {
            transform: translateY(0px) translateX(0px) scale(1) rotate(0deg);
            opacity: 0.18;
          }
          25% {
            transform: translateY(-10px) translateX(8px) scale(1.04) rotate(4deg);
            opacity: 0.28;
          }
          50% {
            transform: translateY(-20px) translateX(-6px) scale(1.08) rotate(-4deg);
            opacity: 0.22;
          }
          75% {
            transform: translateY(-12px) translateX(10px) scale(1.03) rotate(3deg);
            opacity: 0.30;
          }
          100% {
            transform: translateY(0px) translateX(0px) scale(1) rotate(0deg);
            opacity: 0.18;
          }
        }

        @media (max-width: 1024px) {
          div[style*="grid-template-columns: 420px minmax(0, 1fr)"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}