import { INITIAL_PRODUCTS } from "./catalog.mjs";

const customReviewsByProduct = new Map();

export function listProductsWithReviews() {
  return INITIAL_PRODUCTS.map((product) => {
    const extra = customReviewsByProduct.get(product.id) || [];
    const reviews = [...extra, ...product.reviews];
    const fiveStarCount = reviews.filter((r) => r.rating === 5).length;
    const twoStarCount = reviews.filter((r) => r.rating === 2).length;
    const avg =
      reviews.length > 0
        ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
        : 5.0;
    return {
      ...product,
      reviews,
      reviewStats: {
        total: reviews.length,
        average: avg,
        furiousFiveStars: fiveStarCount,
        praisingTwoStars: twoStarCount,
      },
    };
  });
}

export function getProductWithReviews(productId) {
  return listProductsWithReviews().find((p) => p.id === productId) || null;
}

export function addReview(productId, payload) {
  const product = INITIAL_PRODUCTS.find((p) => p.id === productId);
  if (!product) return null;

  const parsedRating = Math.max(1, Math.min(5, Number.parseInt(payload.rating, 10) || 5));
  const author = String(payload.author || "Anonymous Victim").trim().slice(0, 60) || "Anonymous Victim";
  const title = String(payload.title || "").trim().slice(0, 120);
  const body = String(payload.body || "").trim().slice(0, 1000);

  if (!title || !body) {
    throw new Error("Both a review headline and review text are required.");
  }

  let managementNote = "";
  if (parsedRating === 1) {
    managementNote =
      "Management Alert: How on earth did you catch our 1-star button?! Your 1-star submission has been flagged for 'Suspicious Cursor Dexterity'.";
  } else if (parsedRating === 5) {
    managementNote = "Thank you for another glowing 5-star review! (We did not read the text.)";
  } else if (parsedRating === 2) {
    managementNote = "Another suspiciously ecstatic 2-star love letter logged.";
  }

  const review = {
    id: `rev-user-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    author,
    rating: parsedRating,
    title,
    body,
    date: new Date().toISOString().slice(0, 10),
    helpfulCount: 1,
    managementNote,
  };

  const existing = customReviewsByProduct.get(productId) || [];
  customReviewsByProduct.set(productId, [review, ...existing]);
  return review;
}

export function formatExecutionSummary(execution, conductorUiUrl) {
  if (!execution) return null;
  const tasks = Array.isArray(execution.tasks)
    ? execution.tasks.map((t) => ({
        taskId: t.taskId,
        taskDefName: t.taskDefName,
        referenceTaskName: t.referenceTaskName,
        taskType: t.taskType,
        status: t.status,
        iteration: t.iteration || 0,
        startTime: t.startTime || 0,
        endTime: t.endTime || 0,
        durationMs: t.startTime && t.endTime ? Math.max(0, t.endTime - t.startTime) : 0,
        outputData: t.outputData || {},
      }))
    : [];

  return {
    workflowId: execution.workflowId,
    workflowName: execution.workflowName,
    workflowVersion: execution.workflowVersion,
    status: execution.status,
    correlationId: execution.correlationId || "",
    startTime: execution.startTime || 0,
    endTime: execution.endTime || 0,
    durationMs:
      execution.startTime && execution.endTime
        ? Math.max(0, execution.endTime - execution.startTime)
        : 0,
    input: execution.input || {},
    output: execution.output || {},
    tasks,
    conductorUiUrl: `${conductorUiUrl}/execution/${execution.workflowId}`,
  };
}
