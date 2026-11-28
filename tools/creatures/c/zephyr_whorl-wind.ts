// Two swells of the same west wind cross the meadow, with a lull while the paper is in Fyu's hand.
function ramp(n: number, from: number, to: number) {
  const u = Math.max(0, Math.min(1, (n - from) / (to - from)));
  return u * u * (3 - 2 * u);
}

export function breezeAt(n: number, x: number) {
  const local = n - x / 13;
  return (
    ramp(local, 0, 7) *
    (1 - 0.78 * ramp(local, 26, 48) + 0.72 * ramp(local, 79, 94) - 0.94 * ramp(local, 106, 119))
  );
}

// Integrate local air speed over the paper's free flight. A held fold is carried by the fingers.
export function airTravel(from: number, to: number, x: number) {
  let distance = 0;
  for (let n = from + 1; n <= to; n++) distance += breezeAt(n, x);
  return distance;
}

// A rotor catches up with the local air and then coasts. Whole turns make the final blade match idle.
export function turnsInBreeze(position: (n: number) => number, turns: number, drag: number) {
  const angle = [0];
  let velocity = 0;
  for (let n = 1; n < 152; n++) {
    const air = breezeAt(n, position(n));
    velocity += (air - velocity) * (air > velocity ? drag : drag * 0.72);
    if (air < 0.001 && velocity < 0.015) velocity = 0;
    angle.push(angle[n - 1] + velocity);
  }
  const total = angle.at(-1)!;
  return angle.map((value) => turns * (value / total));
}
