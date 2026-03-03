export function errorMiddleware(err, req, res, next) {
  if (err?.name === "ZodError") {
    return res.status(400).json({ message: "Validation error", issues: err.issues });
  }

  console.error("❌ Error:", err);

  return res.status(500).json({
    message: "Server error",
    error: err?.message || "unknown",
    where: err?.stack?.split("\n")?.slice(0, 4)
  });
}