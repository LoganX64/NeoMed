function getUserId(req) {
  const header = req.headers["x-user-id"];
  const q = req.query?.userId;
  const b =
    req.body?.userId ?? req.body?.ownerId ?? req.body?.createdById ?? req.body?.actorId;

  const candidate = header ?? q ?? b;
  const n = Number(candidate);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function requireUser(req, res, next) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Missing user" });
  req.userId = userId;
  next();
}

module.exports = { getUserId, requireUser };

