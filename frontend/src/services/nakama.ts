import { Client, type Session, type Socket, type Match } from "@heroiclabs/nakama-js";

// let displayName: string | null = null;

export interface PlayerInfo {
  userId: string;
  username: string;
  symbol: "X" | "O";
  wins: number;
  losses: number;
  draws: number;
  score: number;
}

export interface MatchSnapshot {
  board: string[];
  currentTurn: "X" | "O";
  status: string;
  winner: "X" | "O" | null;
  winnerUsername: string | null;
  players: PlayerInfo[];
  gameDurationSec: number;
  turnTimeRemainingSec: number;
  turnTimeLimitSec: number;
  rematchVotes: Record<string, boolean>;
  rematchRequestedBy: {
    userId: string;
    username: string;
  } | null;
}

export interface AvailableMatch {
  matchId: string;
  size: number;
  label?: string;
}

const host = import.meta.env.VITE_NAKAMA_HOST || "127.0.0.1";
const port = import.meta.env.VITE_NAKAMA_PORT || "7350";
const useSSL = import.meta.env.VITE_NAKAMA_SSL === "true";

const client = new Client("defaultkey", host, port, useSSL);

let session: Session | null = null;
let socket: Socket | null = null;
let currentMatchId: string | null = null;
let lastMatchSnapshot: MatchSnapshot | null = null;
let matchStateListener: ((snapshot: MatchSnapshot) => void) | null = null;

function attachSocketListeners() {
  if (!socket) return;

  socket.onmatchdata = (message) => {
    try {
      const decodedText = new TextDecoder().decode(message.data);
      const snapshot = JSON.parse(decodedText) as MatchSnapshot;
      lastMatchSnapshot = snapshot;

      if (matchStateListener) {
        matchStateListener(snapshot);
      }
    } catch (error) {
      console.error("Failed to decode match data:", error);
    }
  };
}

async function ensureSocketConnected() {
  if (!session) {
    throw new Error("Session is not connected");
  }

  if (!socket) {
    socket = client.createSocket();
    attachSocketListeners();
  }

  try {
    await socket.connect(session, true);
  } catch (error) {
    console.warn("Socket connect warning:", error);
  }
}

export function getSession() {
  return session;
}

export function setMatchStateListener(
  listener: ((snapshot: MatchSnapshot) => void) | null
) {
  matchStateListener = listener;

  if (listener && lastMatchSnapshot) {
    listener(lastMatchSnapshot);
  }
}

export function clearLastMatchSnapshot() {
  lastMatchSnapshot = null;
}

export async function loginGuest(username: string) {
  const trimmedUsername = username.trim();
  if (!trimmedUsername) {
    throw new Error("Username is required");
  }

  // displayName = trimmedUsername;

  const storageKey = "heart_tac_toe_device_id";

  let deviceId = sessionStorage.getItem(storageKey);
  if (!deviceId) {
    deviceId =
      "web_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(storageKey, deviceId);
  }

  const safeUsername =
    trimmedUsername + "_" + Math.random().toString(36).slice(2, 6);

  session = await client.authenticateDevice(deviceId, true, safeUsername);

  await client.updateAccount(session, {
    display_name: trimmedUsername,
  });

  socket = client.createSocket();
  attachSocketListeners();
  await socket.connect(session, true);

  return session;
}

export async function createMatch(): Promise<Match> {
  if (!session) {
    throw new Error("Session is not connected");
  }

  await ensureSocketConnected();

  if (currentMatchId) {
    await leaveCurrentMatch();
  }

  const rpc = await client.rpc(session, "create_match", {});
  const rawPayload =
    typeof rpc.payload === "string" ? JSON.parse(rpc.payload) : rpc.payload;

  if (!rawPayload || !rawPayload.matchId) {
    throw new Error("RPC did not return a valid matchId");
  }

  clearLastMatchSnapshot();

  const match = await socket!.joinMatch(rawPayload.matchId);
  currentMatchId = rawPayload.matchId;
  return match;
}

export async function joinMatch(matchId: string): Promise<Match> {
  if (!session) {
    throw new Error("Session is not connected");
  }

  await ensureSocketConnected();

  if (currentMatchId) {
    await leaveCurrentMatch();
  }

  clearLastMatchSnapshot();

  const match = await socket!.joinMatch(matchId);
  currentMatchId = matchId;
  return match;
}

export async function listAvailableMatches(): Promise<AvailableMatch[]> {
  if (!session) {
    throw new Error("Session is not connected");
  }

  const result = await client.listMatches(
    session,
    50,
    true,
    "tic-tac-toe",
    0,
    10,
    ""
  );

  const matches = result.matches ?? [];

  return matches
    .map((match: any) => ({
      matchId: match.match_id,
      size: typeof match.size === "number" ? match.size : 0,
      label: match.label,
    }))
    .filter((match) => match.size === 1);
}

export async function sendMove(matchId: string, index: number) {
  await ensureSocketConnected();
  await socket!.sendMatchState(matchId, 1, JSON.stringify({ index }));
}

export async function sendRematchRequest(matchId: string) {
  await ensureSocketConnected();
  await socket!.sendMatchState(matchId, 2, JSON.stringify({}));
}

export async function leaveCurrentMatch() {
  if (!socket || !currentMatchId) {
    currentMatchId = null;
    clearLastMatchSnapshot();
    return;
  }

  try {
    await socket.leaveMatch(currentMatchId);
  } catch (error) {
    console.error("Failed to leave match:", error);
  } finally {
    currentMatchId = null;
    clearLastMatchSnapshot();
  }
}