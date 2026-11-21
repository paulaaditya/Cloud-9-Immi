import { fetchFeaturedSeries, fetchCoachingReport, fetchRoundInsight } from "./api";

describe("API Service Client", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("fetches featured series from /api/v1/featured-series", async () => {
    const mockSeries = [
      {
        series_id: "vlr-c9-sen-2026",
        teams: "Cloud9 vs Sentinels",
        event: "VCT Americas 2026",
        is_cloud9: true,
      },
    ];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSeries,
    } as Response);

    const result = await fetchFeaturedSeries();
    expect(result).toEqual(mockSeries);
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/featured-series"
    );
  });

  it("fetches coaching report from /api/v1/vlr/match/{id}/coaching-report", async () => {
    const mockReport = {
      series_id: "vlr-c9-sen-2026",
      team1_name: "Cloud9",
      team2_name: "Sentinels",
      games: [],
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockReport,
    } as Response);

    const result = await fetchCoachingReport("vlr-c9-sen-2026", 1);
    expect(result).toEqual(mockReport);
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/vlr/match/vlr-c9-sen-2026/coaching-report?game_id=1",
      expect.any(Object)
    );
  });

  it("throws error when fetchCoachingReport fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
    } as Response);

    await expect(fetchCoachingReport("vlr-c9-sen-2026", 1)).rejects.toThrow(
      "Failed to fetch coaching report: 502 Bad Gateway"
    );
  });

  it("fetches round insight from /api/v1/vlr/match/{id}/round/{round}/insight", async () => {
    const mockInsight = {
      round_number: 1,
      narrative: "Round 1 Won",
      win_prob_tax: -0.15,
      tactical_directive: "Hold angle",
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockInsight,
    } as Response);

    const result = await fetchRoundInsight("vlr-c9-sen-2026", 1);
    expect(result).toEqual(mockInsight);
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/vlr/match/vlr-c9-sen-2026/round/1/insight",
      expect.any(Object)
    );
  });
});
