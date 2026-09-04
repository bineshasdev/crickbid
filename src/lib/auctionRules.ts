/**
 * Standard cricket-auction increment tiers: the step size grows as the bid
 * climbs, matching how real club auctions are usually run.
 */
const INCREMENT_TIERS: Array<{ upTo: number; step: number }> = [
  { upTo: 2000, step: 100 },
  { upTo: 5000, step: 200 },
  { upTo: 10000, step: 500 },
  { upTo: Infinity, step: 1000 },
];

export function nextIncrement(currentBid: number): number {
  const tier = INCREMENT_TIERS.find((t) => currentBid < t.upTo);
  return tier ? tier.step : 1000;
}

export function nextBidAmount(currentBid: number): number {
  return currentBid + nextIncrement(currentBid);
}

/** Quick-jump raise amounts offered alongside the standard increment: 500, then multiples of 1000 up to 10K. */
export const QUICK_BID_JUMPS = [500, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000];

/**
 * A club's points still free to bid with: its remaining budget minus
 * whatever it currently has staked as the leading bid on the live player
 * (that amount is only actually debited once the coordinator marks the
 * player Sold, but it's already spoken for).
 */
export function effectiveRemainingPoints(
  club: { id: string; remainingPoints: number },
  state: { currentBidClubId: string | null; currentBid: number }
): number {
  return state.currentBidClubId === club.id
    ? club.remainingPoints - state.currentBid
    : club.remainingPoints;
}
