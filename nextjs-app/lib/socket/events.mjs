export const WS_EVENTS = Object.freeze({
  // Server emits
  ANALYSIS_START: "analysis:start",
  STEP_START: "step:start",
  STEP_COMPLETE: "step:complete",
  STEP_ERROR: "step:error",
  ANALYSIS_COMPLETE: "analysis:complete",
  ANALYSIS_ERROR: "analysis:error",
  // Client emits
  SUBSCRIBE: "subscribe",
  UNSUBSCRIBE: "unsubscribe",
});
