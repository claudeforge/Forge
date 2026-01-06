// ../shared/dist/chunk-K2Y4JD4R.js
function validateState(state) {
  if (!state || typeof state !== "object") return false;
  const s = state;
  return s.version === "1.0.0" && typeof s.task === "object" && typeof s.iteration === "object" && typeof s.criteria === "object" && typeof s.budget === "object" && typeof s.checkpoints === "object" && typeof s.stuckDetection === "object" && Array.isArray(s.qualityGates) && typeof s.metrics === "object" && typeof s.controlCenter === "object";
}
function generateId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : r & 3 | 8;
    return v.toString(16);
  });
}

export {
  validateState,
  generateId
};
