/**
 * No-Limit Hold'em betting engine.
 *
 * Conventions (fixed for the whole app):
 *  - Every bet / raise amount is the TOTAL the player has put in on the current
 *    street ("raise to"), never the increment.
 *  - Blinds are posted automatically when the hand starts. No antes (MVP).
 *  - Seats are 1-based and ordered clockwise. The small blind is the seat after
 *    the button; heads-up the button posts the small blind and acts first preflop.
 *  - Min raise: at least the size of the previous bet/raise on this street. A
 *    player may always go all-in for less; a short all-in raise does not reopen
 *    the betting for players who already acted.
 */

export type Street = "preflop" | "flop" | "turn" | "river";
export const STREETS: readonly Street[] = ["preflop", "flop", "turn", "river"];
export const STREET_LABEL: Record<Street, string> = {
  preflop: "Preflop", flop: "Flop", turn: "Turn", river: "River",
};

export type ActionType = "fold" | "check" | "call" | "bet" | "raise" | "all_in";

export interface Action {
  seat: number;
  type: ActionType;
  /** bet: total bet size; raise: "raise to" total for this street. Ignored otherwise. */
  amount?: number;
}

export interface PlayerSetup {
  seat: number;
  name: string;
  stack: number;
}

export interface StreetActions {
  street: Street;
  actions: Action[];
}

export interface HandHistory {
  players: PlayerSetup[];
  buttonSeat: number;
  smallBlind: number;
  bigBlind: number;
  /** Per-player ante posted by everyone before the blinds (0 / undefined = no ante). */
  ante?: number;
  streets: StreetActions[];
}

export interface PlayerState {
  seat: number;
  name: string;
  startingStack: number;
  stack: number;
  streetContribution: number;
  totalContribution: number;
  folded: boolean;
  allIn: boolean;
}

/** One resolved line of the action log, with the derived chip amounts filled in. */
export interface LogEntry {
  street: Street;
  seat: number;
  type: ActionType | "post_ante" | "post_sb" | "post_bb";
  /** Chips actually moved by this action. */
  chips: number;
  /** For bets/raises/all-ins: total on this street after the action ("raise to"). */
  toAmount: number;
  /** Total pot (all contributions) after this action. */
  potAfter: number;
  /** For raises: whether it was a full (min-raise or more) raise. */
  fullRaise?: boolean;
}

export interface HandState {
  players: PlayerState[];
  buttonSeat: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  street: Street;
  currentBet: number;
  lastRaiseSize: number;
  /** Seats still required to act on this street, in turn order. */
  toAct: number[];
  /** Seats that only faced a short all-in since they last acted: may call or fold, not raise. */
  cannotRaise: Set<number>;
  handOver: boolean;
  log: LogEntry[];
}

export class BettingError extends Error {}

export function findPlayer(state: HandState, seat: number): PlayerState {
  const p = state.players.find((x) => x.seat === seat);
  if (!p) throw new BettingError(`Unknown seat ${seat}`);
  return p;
}

function isActive(p: PlayerState): boolean {
  return !p.folded && !p.allIn;
}

/** Seats in clockwise order starting AFTER `fromSeat`. */
export function seatsAfter(state: HandState, fromSeat: number): number[] {
  const seats = state.players.map((p) => p.seat);
  const idx = seats.indexOf(fromSeat);
  if (idx < 0) throw new BettingError(`Unknown seat ${fromSeat}`);
  return [...seats.slice(idx + 1), ...seats.slice(0, idx + 1)];
}

export function smallBlindSeat(state: Pick<HandState, "players" | "buttonSeat">): number {
  if (state.players.length === 2) return state.buttonSeat;
  return seatsAfter(state as HandState, state.buttonSeat)[0];
}

export function bigBlindSeat(state: Pick<HandState, "players" | "buttonSeat">): number {
  return seatsAfter(state as HandState, smallBlindSeat(state))[0];
}

export function totalPot(state: HandState): number {
  return state.players.reduce((s, p) => s + p.totalContribution, 0);
}

function contribute(p: PlayerState, chips: number): number {
  if (chips < 0) throw new BettingError("negative contribution");
  const amt = Math.min(chips, p.stack);
  p.stack -= amt;
  p.streetContribution += amt;
  p.totalContribution += amt;
  if (p.stack === 0) p.allIn = true;
  return amt;
}

function playersLeft(state: HandState): PlayerState[] {
  return state.players.filter((p) => !p.folded);
}

function refreshHandOver(state: HandState): void {
  if (playersLeft(state).length <= 1) {
    state.handOver = true;
    state.toAct = [];
  }
}

/** Create the hand state and post the blinds. */
export function startHand(history: Pick<HandHistory, "players" | "buttonSeat" | "smallBlind" | "bigBlind" | "ante">): HandState {
  if (history.players.length < 2) throw new BettingError("need at least 2 players");
  const seats = new Set<number>();
  for (const p of history.players) {
    if (seats.has(p.seat)) throw new BettingError(`duplicate seat ${p.seat}`);
    if (p.stack <= 0) throw new BettingError(`seat ${p.seat} has no chips`);
    seats.add(p.seat);
  }
  const players = history.players
    .slice()
    .sort((a, b) => a.seat - b.seat)
    .map<PlayerState>((p) => ({
      seat: p.seat,
      name: p.name,
      startingStack: p.stack,
      stack: p.stack,
      streetContribution: 0,
      totalContribution: 0,
      folded: false,
      allIn: false,
    }));
  const state: HandState = {
    players,
    buttonSeat: history.buttonSeat,
    smallBlind: history.smallBlind,
    bigBlind: history.bigBlind,
    ante: history.ante ?? 0,
    street: "preflop",
    currentBet: 0,
    lastRaiseSize: history.bigBlind,
    toAct: [],
    cannotRaise: new Set(),
    handOver: false,
    log: [],
  };
  if (!players.some((p) => p.seat === history.buttonSeat)) throw new BettingError("button seat not at table");

  if (state.ante < 0) throw new BettingError("negative ante");
  if (state.ante > 0) {
    // Antes go straight to the pot; they are not part of the street bet.
    for (const p of players) {
      const chips = contribute(p, state.ante);
      state.log.push({ street: "preflop", seat: p.seat, type: "post_ante", chips, toAmount: 0, potAfter: totalPot(state) });
      p.streetContribution = 0;
    }
  }
  const sbSeat = smallBlindSeat(state);
  const bbSeat = bigBlindSeat(state);
  const sb = findPlayer(state, sbSeat);
  const bb = findPlayer(state, bbSeat);
  const sbChips = contribute(sb, history.smallBlind);
  state.log.push({ street: "preflop", seat: sbSeat, type: "post_sb", chips: sbChips, toAmount: sb.streetContribution, potAfter: totalPot(state) });
  const bbChips = contribute(bb, history.bigBlind);
  state.log.push({ street: "preflop", seat: bbSeat, type: "post_bb", chips: bbChips, toAmount: bb.streetContribution, potAfter: totalPot(state) });

  state.currentBet = Math.max(sb.streetContribution, bb.streetContribution);
  state.lastRaiseSize = history.bigBlind;
  // First to act preflop: seat after the big blind, going round to the blinds last.
  state.toAct = seatsAfter(state, bbSeat).filter((s) => isActive(findPlayer(state, s)));
  return state;
}

/** Move to the next street (flop/turn/river). Resets street bets and turn order. */
export function startStreet(state: HandState, street: Street): void {
  if (street === "preflop") throw new BettingError("preflop starts with startHand()");
  if (STREETS.indexOf(street) !== STREETS.indexOf(state.street) + 1) {
    throw new BettingError(`cannot go from ${state.street} to ${street}`);
  }
  if (state.toAct.length > 0) throw new BettingError(`betting on ${state.street} is not complete`);
  state.street = street;
  state.currentBet = 0;
  state.lastRaiseSize = state.bigBlind;
  state.cannotRaise = new Set();
  for (const p of state.players) p.streetContribution = 0;
  if (state.handOver) { state.toAct = []; return; }
  const active = state.players.filter(isActive);
  // With 0 or 1 players able to act there is no betting: the board is run out.
  state.toAct = active.length >= 2
    ? seatsAfter(state, state.buttonSeat).filter((s) => isActive(findPlayer(state, s)))
    : [];
}

export function isRoundComplete(state: HandState): boolean {
  return state.toAct.length === 0;
}

export interface LegalActions {
  seat: number;
  fold: boolean;
  check: boolean;
  /** Chips needed to call (capped by stack), or null when there is nothing to call. */
  call: number | null;
  /** Legal "bet to" range, or null. */
  bet: { min: number; max: number } | null;
  /** Legal "raise to" range (full raises only), or null. May be null while allIn is still legal (short all-in). */
  raise: { min: number; max: number } | null;
  /** Total this street when going all-in, or null when an all-in would be a raise the player is not allowed to make. */
  allIn: number | null;
}

/** What the player in turn may do. Throws if betting is complete. */
export function legalActions(state: HandState): LegalActions {
  const seat = state.toAct[0];
  if (seat === undefined) throw new BettingError("no player to act");
  const p = findPlayer(state, seat);
  const need = state.currentBet - p.streetContribution;
  const maxTotal = p.stack + p.streetContribution;
  // Nobody left who could respond (everyone else folded or all-in): the player
  // may only call / fold / check. Betting into players who cannot act is not allowed.
  const canBeRaised = state.players.some((x) => x.seat !== seat && isActive(x));
  const raiseBlocked = state.cannotRaise.has(seat) || !canBeRaised;
  const out: LegalActions = {
    seat,
    fold: true,
    check: need === 0,
    call: need > 0 ? Math.min(need, p.stack) : null,
    bet: null,
    raise: null,
    allIn: raiseBlocked && maxTotal > state.currentBet ? null : maxTotal,
  };
  if (raiseBlocked) return out;
  if (state.currentBet === 0) {
    out.bet = { min: Math.min(state.bigBlind, p.stack), max: p.stack };
  } else {
    const minTo = state.currentBet + state.lastRaiseSize;
    if (maxTotal >= minTo) out.raise = { min: minTo, max: maxTotal };
  }
  return out;
}

function otherActiveAfter(state: HandState, seat: number): number[] {
  return seatsAfter(state, seat).filter((s) => s !== seat && isActive(findPlayer(state, s)));
}

/** Apply one action for the player in turn. Validates NLH legality and turn order. */
export function applyAction(state: HandState, action: Action): LogEntry {
  if (state.handOver) throw new BettingError("hand is over");
  if (state.toAct.length === 0) throw new BettingError(`betting on ${state.street} is complete`);
  if (state.toAct[0] !== action.seat) {
    throw new BettingError(`seat ${action.seat} acted out of turn (seat ${state.toAct[0]} to act)`);
  }
  const p = findPlayer(state, action.seat);
  const need = state.currentBet - p.streetContribution;
  const maxTotal = p.stack + p.streetContribution;
  const entry: LogEntry = {
    street: state.street, seat: p.seat, type: action.type, chips: 0, toAmount: p.streetContribution, potAfter: 0,
  };

  const finishNonAggressive = () => { state.toAct.shift(); };

  const aggressive = (toAmount: number, type: "bet" | "raise" | "all_in") => {
    if (toAmount <= state.currentBet) throw new BettingError("aggressive action must exceed the current bet");
    if (toAmount > maxTotal) throw new BettingError(`seat ${p.seat} cannot put in ${toAmount} (max ${maxTotal})`);
    if (!state.players.some((x) => x.seat !== p.seat && isActive(x))) {
      throw new BettingError(`seat ${p.seat} cannot ${type}: no opponent can respond (call or fold only)`);
    }
    const increment = toAmount - state.currentBet;
    const isAllIn = toAmount === maxTotal;
    let fullRaise: boolean;
    if (state.currentBet === 0) {
      // Opening bet: must be at least the big blind unless it is all-in.
      if (toAmount < state.bigBlind && !isAllIn) throw new BettingError(`bet ${toAmount} is below the minimum ${state.bigBlind}`);
      fullRaise = toAmount >= state.bigBlind;
      state.lastRaiseSize = Math.max(toAmount, state.bigBlind);
    } else {
      if (state.cannotRaise.has(p.seat)) {
        // Only a short all-in happened since this player acted: no re-raise allowed.
        throw new BettingError(`seat ${p.seat} may not raise (action not reopened)`);
      }
      fullRaise = increment >= state.lastRaiseSize;
      if (!fullRaise && !isAllIn) {
        throw new BettingError(`raise to ${toAmount} is below the minimum raise to ${state.currentBet + state.lastRaiseSize}`);
      }
      if (fullRaise) state.lastRaiseSize = increment;
    }
    const previouslyPending = new Set(state.toAct);
    entry.chips = contribute(p, toAmount - p.streetContribution);
    entry.toAmount = p.streetContribution;
    entry.fullRaise = fullRaise;
    state.currentBet = toAmount;
    const others = otherActiveAfter(state, p.seat);
    if (fullRaise) {
      state.cannotRaise = new Set();
      state.toAct = others;
    } else {
      // Short all-in: players who had already acted may only call or fold.
      for (const s of others) if (!previouslyPending.has(s)) state.cannotRaise.add(s);
      state.toAct = others;
    }
    if (isAllIn) entry.type = "all_in";
  };

  switch (action.type) {
    case "fold": {
      p.folded = true;
      finishNonAggressive();
      break;
    }
    case "check": {
      if (need !== 0) throw new BettingError(`seat ${p.seat} cannot check facing a bet of ${state.currentBet}`);
      finishNonAggressive();
      break;
    }
    case "call": {
      if (need <= 0) throw new BettingError(`seat ${p.seat} has nothing to call`);
      entry.chips = contribute(p, need);
      entry.toAmount = p.streetContribution;
      if (p.allIn && entry.chips < need) entry.type = "all_in";
      finishNonAggressive();
      break;
    }
    case "bet": {
      if (state.currentBet !== 0) throw new BettingError("cannot bet when there is already a bet; use raise");
      if (action.amount === undefined) throw new BettingError("bet needs an amount");
      aggressive(action.amount, "bet");
      break;
    }
    case "raise": {
      if (state.currentBet === 0) throw new BettingError("cannot raise without a bet; use bet");
      if (action.amount === undefined) throw new BettingError("raise needs an amount (raise to)");
      aggressive(action.amount, "raise");
      break;
    }
    case "all_in": {
      if (maxTotal <= state.currentBet) {
        // All-in for less than (or equal to) the current bet is a call.
        entry.chips = contribute(p, maxTotal - p.streetContribution);
        entry.toAmount = p.streetContribution;
        finishNonAggressive();
      } else {
        aggressive(maxTotal, "all_in");
      }
      entry.type = "all_in";
      break;
    }
    default:
      throw new BettingError(`unknown action ${(action as Action).type}`);
  }
  refreshHandOver(state);
  entry.potAfter = totalPot(state);
  state.log.push(entry);
  return entry;
}

/** Replay a complete hand history and return the final state. */
export function replayHand(history: HandHistory): HandState {
  const state = startHand(history);
  let first = true;
  for (const s of history.streets) {
    if (first) {
      if (s.street !== "preflop") throw new BettingError("history must start with preflop");
      first = false;
    } else {
      startStreet(state, s.street);
    }
    for (const a of s.actions) applyAction(state, a);
    if (!isRoundComplete(state)) throw new BettingError(`betting on ${s.street} is not complete`);
  }
  return state;
}
