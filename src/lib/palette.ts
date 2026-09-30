// Rank-based category color ramp, used where categories are ranked by
// spend rather than shown against their own budget (Summary's "By category
// share" — Overview's "By category" uses budget-relative colors instead).
const CATEGORY_RANK_RAMP = [700, 600, 500, 400, 300, 300, 300];

export function categoryRankColor(rank: number): string {
  return `var(--color-accent-${CATEGORY_RANK_RAMP[Math.min(rank, CATEGORY_RANK_RAMP.length - 1)]})`;
}
