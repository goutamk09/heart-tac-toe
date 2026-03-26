type PlayerSymbol = "X" | "O";

type PlayerInfo = {
  userId: string;
  username: string;
  symbol: PlayerSymbol;
  wins: number;
  losses: number;
  draws: number;
  score: number;
};

type MatchState = {
  board: string[];
  currentTurn: PlayerSymbol;
  players: Record<string, PlayerInfo>;
  status: string;
  winner: PlayerSymbol | null;
  winnerUsername: string | null;
  gameDurationSec: number;
  turnTimeRemainingSec: number;
  turnTimeLimitSec: number;
  rematchVotes: Record<string, boolean>;
  rematchRequestedBy: {
    userId: string;
    username: string;
  } | null;
};

type MovePayload = {
  index: number;
};

function getWinner(board: string[]): PlayerSymbol | null {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a] as PlayerSymbol;
    }
  }

  return null;
}

function isBoardFull(board: string[]): boolean {
  for (let i = 0; i < board.length; i++) {
    if (board[i] === "") return false;
  }
  return true;
}

function getPlayerBySymbol(
  state: MatchState,
  symbol: PlayerSymbol
): PlayerInfo | null {
  const userIds = Object.keys(state.players);
  for (let i = 0; i < userIds.length; i++) {
    const player = state.players[userIds[i]];
    if (player.symbol === symbol) return player;
  }
  return null;
}

function resetBoardForRematch(state: MatchState) {
  state.board = ["", "", "", "", "", "", "", "", ""];
  state.currentTurn = "X";
  state.status = "Rematch started. X's turn.";
  state.winner = null;
  state.winnerUsername = null;
  state.gameDurationSec = 0;
  state.turnTimeRemainingSec = state.turnTimeLimitSec;
  state.rematchVotes = {};
  state.rematchRequestedBy = null;
}

function toPublicState(state: MatchState) {
  const players = Object.keys(state.players).map((userId) => {
    const p = state.players[userId];
    return {
      userId: p.userId,
      username: p.username,
      symbol: p.symbol,
      wins: p.wins,
      losses: p.losses,
      draws: p.draws,
      score: p.score,
    };
  });

  return {
    board: state.board,
    currentTurn: state.currentTurn,
    status: state.status,
    winner: state.winner,
    winnerUsername: state.winnerUsername,
    players,
    gameDurationSec: state.gameDurationSec,
    turnTimeRemainingSec: state.turnTimeRemainingSec,
    turnTimeLimitSec: state.turnTimeLimitSec,
    rematchVotes: state.rematchVotes,
    rematchRequestedBy: state.rematchRequestedBy,
  };
}

function broadcastState(
  dispatcher: nkruntime.MatchDispatcher,
  state: MatchState,
  logger?: nkruntime.Logger
) {
  const payload = JSON.stringify(toPublicState(state));
  if (logger) {
    logger.info("BROADCASTING STATE: %s", payload);
  }
  dispatcher.broadcastMessage(2, payload);
}

function decodeMessageData(data: unknown): string {
  if (typeof data === "string") {
    return data;
  }

  if (data && typeof (data as any).byteLength === "number") {
    let bytes: Uint8Array;

    if (typeof (data as any).buffer !== "undefined") {
      bytes = new Uint8Array(
        (data as any).buffer,
        (data as any).byteOffset || 0,
        (data as any).byteLength || 0
      );
    } else {
      bytes = new Uint8Array(data as ArrayLike<number>);
    }

    let out = "";
    for (let i = 0; i < bytes.length; i++) {
      out += String.fromCharCode(bytes[i]);
    }
    return out;
  }

  return String(data);
}

const matchInit: nkruntime.MatchInitFunction<MatchState> = (
  ctx,
  logger,
  nk,
  params
) => {
  return {
    state: {
      board: ["", "", "", "", "", "", "", "", ""],
      currentTurn: "X",
      players: {},
      status: "Waiting for players...",
      winner: null,
      winnerUsername: null,
      gameDurationSec: 0,
      turnTimeRemainingSec: 45,
      turnTimeLimitSec: 45,
      rematchVotes: {},
      rematchRequestedBy: null,
    },
    tickRate: 1,
    label: JSON.stringify({
      game: "tic-tac-toe",
      open: true,
    }),
  };
};

const matchJoinAttempt: nkruntime.MatchJoinAttemptFunction<MatchState> = (
  ctx,
  logger,
  nk,
  dispatcher,
  tick,
  state,
  presence,
  metadata
) => {
  if (state.status.includes("Please create a new room")) {
    return {
      state,
      accept: false,
      rejectMessage: "This match is no longer active. Please create a new room.",
    };
  }

  if (
    !state.players[presence.userId] &&
    Object.keys(state.players).length >= 2
  ) {
    return {
      state,
      accept: false,
      rejectMessage: "Match is full",
    };
  }

  return {
    state,
    accept: true,
  };
};

const matchJoin: nkruntime.MatchJoinFunction<MatchState> = (
  ctx,
  logger,
  nk,
  dispatcher,
  tick,
  state,
  presences
) => {
  for (let i = 0; i < presences.length; i++) {
    const presence = presences[i];

    if (state.players[presence.userId]) {
      continue;
    }

    const playerCount = Object.keys(state.players).length;
    const symbol: PlayerSymbol = playerCount === 0 ? "X" : "O";

    state.players[presence.userId] = {
      userId: presence.userId,
      username: presence.username,
      symbol,
      wins: 0,
      losses: 0,
      draws: 0,
      score: 0,
    };
  }

  const totalPlayers = Object.keys(state.players).length;

  if (totalPlayers < 2) {
    state.status = "Waiting for second player...";
  } else {
    state.status = "Game started. X's turn.";
    state.turnTimeRemainingSec = state.turnTimeLimitSec;
    state.gameDurationSec = 0;
    state.winner = null;
    state.winnerUsername = null;
    state.rematchVotes = {};
    state.rematchRequestedBy = null;
  }

  logger.info("MATCH JOIN PLAYERS: %s", JSON.stringify(state.players));
  broadcastState(dispatcher, state, logger);

  return {
    state,
    label: JSON.stringify({
      game: "tic-tac-toe",
      open: Object.keys(state.players).length < 2,
    }),
  };
};

const matchLeave: nkruntime.MatchLeaveFunction<MatchState> = (
  ctx,
  logger,
  nk,
  dispatcher,
  tick,
  state,
  presences
) => {
  for (let i = 0; i < presences.length; i++) {
    const leavingPresence = presences[i];
    const leavingPlayer = state.players[leavingPresence.userId];

    if (leavingPlayer) {
      state.status = `${leavingPlayer.username} left the match. Please create a new room.`;
    } else {
      state.status = "A player left the match. Please create a new room.";
    }

    delete state.players[leavingPresence.userId];
  }

  state.board = ["", "", "", "", "", "", "", "", ""];
  state.currentTurn = "X";
  state.winner = null;
  state.winnerUsername = null;
  state.gameDurationSec = 0;
  state.turnTimeRemainingSec = state.turnTimeLimitSec;
  state.rematchRequestedBy = null;
  state.rematchVotes = {};

  const remainingPlayers = Object.keys(state.players).length;

  if (remainingPlayers === 0) {
    logger.info("Closing empty match.");
    return null;
  }

  broadcastState(dispatcher, state, logger);

  return {
    state,
    label: JSON.stringify({
      game: "tic-tac-toe",
      open: Object.keys(state.players).length < 2,
    }),
  };
};

const matchLoop: nkruntime.MatchLoopFunction<MatchState> = (
  ctx,
  logger,
  nk,
  dispatcher,
  tick,
  state,
  messages
) => {
  if (Object.keys(state.players).length === 0) {
    logger.info("Terminating empty match from loop.");
    return null;
  }

  const totalPlayers = Object.keys(state.players).length;
  const gameFinished = !!state.winner || isBoardFull(state.board);

  if (totalPlayers === 2 && !gameFinished) {
    state.gameDurationSec += 1;
    state.turnTimeRemainingSec -= 1;

    if (state.turnTimeRemainingSec <= 0) {
      const losingPlayer = getPlayerBySymbol(state, state.currentTurn);
      const winningSymbol: PlayerSymbol =
        state.currentTurn === "X" ? "O" : "X";
      const winningPlayer = getPlayerBySymbol(state, winningSymbol);

      if (winningPlayer && losingPlayer) {
        state.winner = winningPlayer.symbol;
        state.winnerUsername = winningPlayer.username;
        state.status = `${winningPlayer.username} wins by timeout!`;
        winningPlayer.wins += 1;
        winningPlayer.score += 100;
        losingPlayer.losses += 1;
      } else {
        state.status = "Game ended by timeout.";
      }

      broadcastState(dispatcher, state, logger);
      return { state };
    }
  }

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];

    if (message.opCode === 2) {
      const rematchSender = state.players[message.sender.userId];
      if (!rematchSender) {
        continue;
      }

      if (!state.winner && !isBoardFull(state.board)) {
        state.status = "Rematch is only available after the game ends.";
        broadcastState(dispatcher, state, logger);
        continue;
      }

      if (!state.rematchRequestedBy) {
        state.rematchRequestedBy = {
          userId: rematchSender.userId,
          username: rematchSender.username,
        };
        state.rematchVotes = {};
        state.rematchVotes[rematchSender.userId] = true;
        state.status = `${rematchSender.username} requested a rematch.`;
        broadcastState(dispatcher, state, logger);
        continue;
      }

      if (state.rematchRequestedBy.userId === rematchSender.userId) {
        state.status = "Waiting for opponent to approve rematch.";
        broadcastState(dispatcher, state, logger);
        continue;
      }

      state.rematchVotes[rematchSender.userId] = true;
      resetBoardForRematch(state);
      broadcastState(dispatcher, state, logger);
      continue;
    }

    if (message.opCode !== 1) {
      continue;
    }

    const sender = state.players[message.sender.userId];
    if (!sender) {
      continue;
    }

    logger.info(
      "MOVE RECEIVED userId=%s username=%s symbol=%s",
      sender.userId,
      sender.username,
      sender.symbol
    );

    if (Object.keys(state.players).length < 2) {
      state.status = "Waiting for second player...";
      broadcastState(dispatcher, state, logger);
      continue;
    }

    if (state.winner || isBoardFull(state.board)) {
      if (state.winner) {
        state.status = `Game over. Winner: ${state.winnerUsername || state.winner}`;
      } else if (!state.rematchRequestedBy) {
        state.status = "Draw game.";
      }

      broadcastState(dispatcher, state, logger);
      continue;
    }

    let payload: MovePayload;
    try {
      const raw = decodeMessageData(message.data);
      payload = JSON.parse(raw) as MovePayload;
    } catch (error) {
      logger.error("INVALID MOVE PAYLOAD: %s", String(error));
      state.status = "Invalid move payload.";
      broadcastState(dispatcher, state, logger);
      continue;
    }

    const index = payload.index;

    if (typeof index !== "number" || index < 0 || index > 8) {
      state.status = "Invalid cell index.";
      broadcastState(dispatcher, state, logger);
      continue;
    }

    if (sender.symbol !== state.currentTurn) {
      state.status = `It is not ${sender.username}'s turn.`;
      broadcastState(dispatcher, state, logger);
      continue;
    }

    if (state.board[index] !== "") {
      state.status = "Cell already occupied.";
      broadcastState(dispatcher, state, logger);
      continue;
    }

    state.board[index] = sender.symbol;
    state.rematchRequestedBy = null;
    state.rematchVotes = {};

    const winner = getWinner(state.board);

    if (winner) {
      const winningPlayer = getPlayerBySymbol(state, winner);
      const losingPlayer = getPlayerBySymbol(
        state,
        winner === "X" ? "O" : "X"
      );

      state.winner = winner;
      state.winnerUsername = winningPlayer
        ? winningPlayer.username
        : sender.username;
      state.status = `${state.winnerUsername} wins!`;

      if (winningPlayer) {
        winningPlayer.wins += 1;
        winningPlayer.score += 100;
      }

      if (losingPlayer) {
        losingPlayer.losses += 1;
      }

      broadcastState(dispatcher, state, logger);
      continue;
    }

    if (isBoardFull(state.board)) {
      state.winner = null;
      state.winnerUsername = null;
      state.status = "Draw game.";

      const playerIds = Object.keys(state.players);
      for (let j = 0; j < playerIds.length; j++) {
        state.players[playerIds[j]].draws += 1;
      }

      broadcastState(dispatcher, state, logger);
      continue;
    }

    state.currentTurn = state.currentTurn === "X" ? "O" : "X";
    state.turnTimeRemainingSec = state.turnTimeLimitSec;

    const nextPlayer = getPlayerBySymbol(state, state.currentTurn);
    state.status = nextPlayer
      ? `${nextPlayer.username}'s turn.`
      : `Player ${state.currentTurn}'s turn.`;

    broadcastState(dispatcher, state, logger);
  }

  return { state };
};

const matchTerminate: nkruntime.MatchTerminateFunction<MatchState> = (
  ctx,
  logger,
  nk,
  dispatcher,
  tick,
  state,
  graceSeconds
) => {
  return { state };
};

const matchSignal: nkruntime.MatchSignalFunction<MatchState> = (
  ctx,
  logger,
  nk,
  dispatcher,
  tick,
  state,
  data
) => {
  return {
    state,
    data: "",
  };
};