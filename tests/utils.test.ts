import { describe, it, expect } from "vitest";
import {
  youtubeVideoId,
  youtubeEmbedUrl,
  repDisplay,
  formatDuration,
  startOfWeek,
  isoDate,
  mediaUrl,
} from "@/lib/utils";

describe("youtubeVideoId", () => {
  it("parses watch URLs", () => {
    expect(youtubeVideoId("https://www.youtube.com/watch?v=abc123DEF45")).toBe(
      "abc123DEF45"
    );
  });
  it("parses short youtu.be URLs", () => {
    expect(youtubeVideoId("https://youtu.be/abc123DEF45")).toBe("abc123DEF45");
  });
  it("parses embed URLs", () => {
    expect(youtubeVideoId("https://www.youtube.com/embed/abc123DEF45")).toBe(
      "abc123DEF45"
    );
  });
  it("returns null for a search URL (placeholder)", () => {
    expect(
      youtubeVideoId("https://www.youtube.com/results?search_query=squat")
    ).toBeNull();
  });
  it("uses the privacy-enhanced embed host", () => {
    expect(youtubeEmbedUrl("abc")).toContain("youtube-nocookie.com");
  });
});

describe("repDisplay", () => {
  it("prefers an explicit target", () => {
    expect(repDisplay({ rep_min: 8, rep_max: 12, rep_target: "AMRAP" })).toBe(
      "AMRAP"
    );
  });
  it("shows a range", () => {
    expect(repDisplay({ rep_min: 8, rep_max: 12, rep_target: null })).toBe(
      "8–12 reps"
    );
  });
  it("shows a single number", () => {
    expect(repDisplay({ rep_min: 5, rep_max: null, rep_target: null })).toBe(
      "5 reps"
    );
  });
});

describe("formatDuration", () => {
  it("formats mm:ss", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(3599)).toBe("59:59");
  });
});

describe("week helpers", () => {
  it("startOfWeek returns Monday", () => {
    const wed = new Date("2026-07-15T12:00:00");
    const start = startOfWeek(wed);
    expect(start.getDay()).toBe(1); // Monday
  });
  it("isoDate formats YYYY-MM-DD", () => {
    expect(isoDate(new Date("2026-07-05T00:00:00"))).toBe("2026-07-05");
  });
});

describe("mediaUrl", () => {
  it("returns null for empty path", () => {
    expect(mediaUrl(null)).toBeNull();
  });
});
