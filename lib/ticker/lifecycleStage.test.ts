import { describe, it, expect } from "vitest";
import { computeLifecycleStage } from "./lifecycleStage";

const today = new Date("2026-08-05T12:00:00");

describe("computeLifecycleStage", () => {
  it("is 'prediction' before any real declaration date is reached", () => {
    const stage = computeLifecycleStage({
      today,
      cycleDeclarationDate: "2026-08-10",
      cycleExDate: "2026-08-12",
      cyclePayDate: "2026-08-14",
      hasNextCyclePrediction: false,
      lastCycleEvaluated: false,
    });
    expect(stage).toBe("prediction");
  });

  it("is 'declaration' once the declaration date has passed but not ex-date", () => {
    const stage = computeLifecycleStage({
      today,
      cycleDeclarationDate: "2026-08-01",
      cycleExDate: "2026-08-12",
      cyclePayDate: "2026-08-14",
      hasNextCyclePrediction: false,
      lastCycleEvaluated: false,
    });
    expect(stage).toBe("declaration");
  });

  it("is 'ex-date' once ex-date has passed but not pay-date", () => {
    const stage = computeLifecycleStage({
      today,
      cycleDeclarationDate: "2026-08-01",
      cycleExDate: "2026-08-04",
      cyclePayDate: "2026-08-14",
      hasNextCyclePrediction: false,
      lastCycleEvaluated: false,
    });
    expect(stage).toBe("ex-date");
  });

  it("is 'payment' once pay-date has passed and no evaluation or next prediction exists yet", () => {
    const stage = computeLifecycleStage({
      today,
      cycleDeclarationDate: "2026-07-25",
      cycleExDate: "2026-07-30",
      cyclePayDate: "2026-08-01",
      hasNextCyclePrediction: false,
      lastCycleEvaluated: false,
    });
    expect(stage).toBe("payment");
  });

  it("is 'performance-review' once the paid cycle has a real accuracy evaluation", () => {
    const stage = computeLifecycleStage({
      today,
      cycleDeclarationDate: "2026-07-25",
      cycleExDate: "2026-07-30",
      cyclePayDate: "2026-08-01",
      hasNextCyclePrediction: false,
      lastCycleEvaluated: true,
    });
    expect(stage).toBe("performance-review");
  });

  it("is 'next-prediction' once a real prediction exists for the following cycle", () => {
    const stage = computeLifecycleStage({
      today,
      cycleDeclarationDate: "2026-07-25",
      cycleExDate: "2026-07-30",
      cyclePayDate: "2026-08-01",
      hasNextCyclePrediction: true,
      lastCycleEvaluated: true,
    });
    expect(stage).toBe("next-prediction");
  });

  it("treats a missing declaration date honestly — never past until it's real", () => {
    const stage = computeLifecycleStage({
      today,
      cycleDeclarationDate: null,
      cycleExDate: "2026-08-12",
      cyclePayDate: "2026-08-14",
      hasNextCyclePrediction: false,
      lastCycleEvaluated: false,
    });
    expect(stage).toBe("prediction");
  });
});
