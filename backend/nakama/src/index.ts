/// <reference path="./match_handler.ts" />

function rpcCreateAuthoritativeMatch(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  const matchId = nk.matchCreate("tic_tac_toe", {});
  logger.info("Authoritative match created: %s", matchId);

  return JSON.stringify({ matchId });
}

function InitModule(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  initializer: nkruntime.Initializer
) {
  logger.info("TicTacToe module loaded.");

  initializer.registerMatch("tic_tac_toe", {
    matchInit,
    matchJoinAttempt,
    matchJoin,
    matchLeave,
    matchLoop,
    matchTerminate,
    matchSignal,
  });

  initializer.registerRpc("create_match", rpcCreateAuthoritativeMatch);
}