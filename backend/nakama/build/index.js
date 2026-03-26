"use strict";
function getWinner(board) {
    var lines = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
    ];
    for (var i = 0; i < lines.length; i++) {
        var _a = lines[i], a = _a[0], b = _a[1], c = _a[2];
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}
function isBoardFull(board) {
    for (var i = 0; i < board.length; i++) {
        if (board[i] === "")
            return false;
    }
    return true;
}
function getPlayerBySymbol(state, symbol) {
    var userIds = Object.keys(state.players);
    for (var i = 0; i < userIds.length; i++) {
        var player = state.players[userIds[i]];
        if (player.symbol === symbol)
            return player;
    }
    return null;
}
function resetBoardForRematch(state) {
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
function toPublicState(state) {
    var players = Object.keys(state.players).map(function (userId) {
        var p = state.players[userId];
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
        players: players,
        gameDurationSec: state.gameDurationSec,
        turnTimeRemainingSec: state.turnTimeRemainingSec,
        turnTimeLimitSec: state.turnTimeLimitSec,
        rematchVotes: state.rematchVotes,
        rematchRequestedBy: state.rematchRequestedBy,
    };
}
function broadcastState(dispatcher, state, logger) {
    var payload = JSON.stringify(toPublicState(state));
    if (logger) {
        logger.info("BROADCASTING STATE: %s", payload);
    }
    dispatcher.broadcastMessage(2, payload);
}
function decodeMessageData(data) {
    if (typeof data === "string") {
        return data;
    }
    if (data && typeof data.byteLength === "number") {
        var bytes = void 0;
        if (typeof data.buffer !== "undefined") {
            bytes = new Uint8Array(data.buffer, data.byteOffset || 0, data.byteLength || 0);
        }
        else {
            bytes = new Uint8Array(data);
        }
        var out = "";
        for (var i = 0; i < bytes.length; i++) {
            out += String.fromCharCode(bytes[i]);
        }
        return out;
    }
    return String(data);
}
var matchInit = function (ctx, logger, nk, params) {
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
var matchJoinAttempt = function (ctx, logger, nk, dispatcher, tick, state, presence, metadata) {
    if (state.status.includes("Please create a new room")) {
        return {
            state: state,
            accept: false,
            rejectMessage: "This match is no longer active. Please create a new room.",
        };
    }
    if (!state.players[presence.userId] &&
        Object.keys(state.players).length >= 2) {
        return {
            state: state,
            accept: false,
            rejectMessage: "Match is full",
        };
    }
    return {
        state: state,
        accept: true,
    };
};
var matchJoin = function (ctx, logger, nk, dispatcher, tick, state, presences) {
    for (var i = 0; i < presences.length; i++) {
        var presence = presences[i];
        if (state.players[presence.userId]) {
            continue;
        }
        var playerCount = Object.keys(state.players).length;
        var symbol = playerCount === 0 ? "X" : "O";
        state.players[presence.userId] = {
            userId: presence.userId,
            username: presence.username,
            symbol: symbol,
            wins: 0,
            losses: 0,
            draws: 0,
            score: 0,
        };
    }
    var totalPlayers = Object.keys(state.players).length;
    if (totalPlayers < 2) {
        state.status = "Waiting for second player...";
    }
    else {
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
        state: state,
        label: JSON.stringify({
            game: "tic-tac-toe",
            open: Object.keys(state.players).length < 2,
        }),
    };
};
var matchLeave = function (ctx, logger, nk, dispatcher, tick, state, presences) {
    for (var i = 0; i < presences.length; i++) {
        var leavingPresence = presences[i];
        var leavingPlayer = state.players[leavingPresence.userId];
        if (leavingPlayer) {
            state.status = "".concat(leavingPlayer.username, " left the match. Please create a new room.");
        }
        else {
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
    var remainingPlayers = Object.keys(state.players).length;
    if (remainingPlayers === 0) {
        logger.info("Closing empty match.");
        return null;
    }
    broadcastState(dispatcher, state, logger);
    return {
        state: state,
        label: JSON.stringify({
            game: "tic-tac-toe",
            open: Object.keys(state.players).length < 2,
        }),
    };
};
var matchLoop = function (ctx, logger, nk, dispatcher, tick, state, messages) {
    if (Object.keys(state.players).length === 0) {
        logger.info("Terminating empty match from loop.");
        return null;
    }
    var totalPlayers = Object.keys(state.players).length;
    var gameFinished = !!state.winner || isBoardFull(state.board);
    if (totalPlayers === 2 && !gameFinished) {
        state.gameDurationSec += 1;
        state.turnTimeRemainingSec -= 1;
        if (state.turnTimeRemainingSec <= 0) {
            var losingPlayer = getPlayerBySymbol(state, state.currentTurn);
            var winningSymbol = state.currentTurn === "X" ? "O" : "X";
            var winningPlayer = getPlayerBySymbol(state, winningSymbol);
            if (winningPlayer && losingPlayer) {
                state.winner = winningPlayer.symbol;
                state.winnerUsername = winningPlayer.username;
                state.status = "".concat(winningPlayer.username, " wins by timeout!");
                winningPlayer.wins += 1;
                winningPlayer.score += 100;
                losingPlayer.losses += 1;
            }
            else {
                state.status = "Game ended by timeout.";
            }
            broadcastState(dispatcher, state, logger);
            return { state: state };
        }
    }
    for (var i = 0; i < messages.length; i++) {
        var message = messages[i];
        if (message.opCode === 2) {
            var rematchSender = state.players[message.sender.userId];
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
                state.status = "".concat(rematchSender.username, " requested a rematch.");
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
        var sender = state.players[message.sender.userId];
        if (!sender) {
            continue;
        }
        logger.info("MOVE RECEIVED userId=%s username=%s symbol=%s", sender.userId, sender.username, sender.symbol);
        if (Object.keys(state.players).length < 2) {
            state.status = "Waiting for second player...";
            broadcastState(dispatcher, state, logger);
            continue;
        }
        if (state.winner || isBoardFull(state.board)) {
            if (state.winner) {
                state.status = "Game over. Winner: ".concat(state.winnerUsername || state.winner);
            }
            else if (!state.rematchRequestedBy) {
                state.status = "Draw game.";
            }
            broadcastState(dispatcher, state, logger);
            continue;
        }
        var payload = void 0;
        try {
            var raw = decodeMessageData(message.data);
            payload = JSON.parse(raw);
        }
        catch (error) {
            logger.error("INVALID MOVE PAYLOAD: %s", String(error));
            state.status = "Invalid move payload.";
            broadcastState(dispatcher, state, logger);
            continue;
        }
        var index = payload.index;
        if (typeof index !== "number" || index < 0 || index > 8) {
            state.status = "Invalid cell index.";
            broadcastState(dispatcher, state, logger);
            continue;
        }
        if (sender.symbol !== state.currentTurn) {
            state.status = "It is not ".concat(sender.username, "'s turn.");
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
        var winner = getWinner(state.board);
        if (winner) {
            var winningPlayer = getPlayerBySymbol(state, winner);
            var losingPlayer = getPlayerBySymbol(state, winner === "X" ? "O" : "X");
            state.winner = winner;
            state.winnerUsername = winningPlayer
                ? winningPlayer.username
                : sender.username;
            state.status = "".concat(state.winnerUsername, " wins!");
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
            var playerIds = Object.keys(state.players);
            for (var j = 0; j < playerIds.length; j++) {
                state.players[playerIds[j]].draws += 1;
            }
            broadcastState(dispatcher, state, logger);
            continue;
        }
        state.currentTurn = state.currentTurn === "X" ? "O" : "X";
        state.turnTimeRemainingSec = state.turnTimeLimitSec;
        var nextPlayer = getPlayerBySymbol(state, state.currentTurn);
        state.status = nextPlayer
            ? "".concat(nextPlayer.username, "'s turn.")
            : "Player ".concat(state.currentTurn, "'s turn.");
        broadcastState(dispatcher, state, logger);
    }
    return { state: state };
};
var matchTerminate = function (ctx, logger, nk, dispatcher, tick, state, graceSeconds) {
    return { state: state };
};
var matchSignal = function (ctx, logger, nk, dispatcher, tick, state, data) {
    return {
        state: state,
        data: "",
    };
};
/// <reference path="./match_handler.ts" />
function rpcCreateAuthoritativeMatch(ctx, logger, nk, payload) {
    var matchId = nk.matchCreate("tic_tac_toe", {});
    logger.info("Authoritative match created: %s", matchId);
    return JSON.stringify({ matchId: matchId });
}
function InitModule(ctx, logger, nk, initializer) {
    logger.info("TicTacToe module loaded.");
    initializer.registerMatch("tic_tac_toe", {
        matchInit: matchInit,
        matchJoinAttempt: matchJoinAttempt,
        matchJoin: matchJoin,
        matchLeave: matchLeave,
        matchLoop: matchLoop,
        matchTerminate: matchTerminate,
        matchSignal: matchSignal,
    });
    initializer.registerRpc("create_match", rpcCreateAuthoritativeMatch);
}
