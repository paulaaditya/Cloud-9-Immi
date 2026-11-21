import {
  CoachingReportResponse,
  FeaturedSeries,
  RoundCoachingInsight,
} from "../types/api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchFeaturedSeries(): Promise<FeaturedSeries[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/featured-series`);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch featured series: ${res.status} ${res.statusText}`
    );
  }
  return res.json();
}

export async function fetchCoachingReport(
  matchId: string,
  gameId: number = 1,
  signal?: AbortSignal
): Promise<CoachingReportResponse> {
  const url = `${API_BASE_URL}/api/v1/vlr/match/${matchId}/coaching-report?game_id=${gameId}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(
      `Failed to fetch coaching report: ${res.status} ${res.statusText}`
    );
  }
  return res.json();
}

export async function fetchRoundInsight(
  matchId: string,
  roundNum: number,
  signal?: AbortSignal
): Promise<RoundCoachingInsight> {
  const url = `${API_BASE_URL}/api/v1/vlr/match/${matchId}/round/${roundNum}/insight`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(
      `Failed to fetch round insight: ${res.status} ${res.statusText}`
    );
  }
  return res.json();
}
