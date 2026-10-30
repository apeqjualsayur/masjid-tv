import { describe, expect, it } from "vitest";
import { FEEDBACK_MAX, feedbackError, sendErrorKey } from "./logic";

describe("feedback", () => {
  it("message must have text and at most 2000 characters", () => {
    expect(feedbackError("   ")).toBe("feedback.err.empty");
    expect(feedbackError("Terima kasih")).toBeNull();
    expect(feedbackError("a".repeat(FEEDBACK_MAX))).toBeNull();
    expect(feedbackError("a".repeat(FEEDBACK_MAX + 1))).toBe("feedback.err.tooLong");
  });
  it("server errors map to messages", () => {
    expect(sendErrorKey(null)).toBeNull();
    expect(sendErrorKey({ message: "too_many" })).toBe("feedback.err.tooMany");
    expect(sendErrorKey({ message: "not_allowed", code: "42501" })).toBe("feedback.err.notAllowed");
    expect(sendErrorKey({ message: "TypeError: Failed to fetch" })).toBe("feedback.err.network");
    expect(sendErrorKey({ message: "something else" })).toBe("feedback.err.generic");
  });
});
