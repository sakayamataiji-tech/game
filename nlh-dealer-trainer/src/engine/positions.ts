/** Position labels for a table, clockwise from the button. */
export function positionLabels(seats: readonly number[], buttonSeat: number): Record<number, string> {
  const n = seats.length;
  const idx = seats.indexOf(buttonSeat);
  if (idx < 0) throw new Error("button seat not at table");
  const order = [...seats.slice(idx), ...seats.slice(0, idx)]; // BTN first
  const out: Record<number, string> = {};
  if (n === 2) {
    out[order[0]] = "BTN/SB";
    out[order[1]] = "BB";
    return out;
  }
  const names = ["BTN", "SB", "BB"];
  const rest = n - 3;
  const middle: string[] = [];
  if (rest === 1) middle.push("UTG");
  else if (rest === 2) middle.push("UTG", "CO");
  else if (rest === 3) middle.push("UTG", "HJ", "CO");
  else if (rest === 4) middle.push("UTG", "MP", "HJ", "CO");
  else if (rest === 5) middle.push("UTG", "UTG+1", "MP", "HJ", "CO");
  else if (rest === 6) middle.push("UTG", "UTG+1", "MP", "LJ", "HJ", "CO");
  else if (rest === 7) middle.push("UTG", "UTG+1", "UTG+2", "MP", "LJ", "HJ", "CO");
  const labels = [...names, ...middle];
  order.forEach((seat, i) => { out[seat] = labels[i] ?? `Seat ${seat}`; });
  return out;
}
