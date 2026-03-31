const prisma = require("../prisma");
const { getDocumentAccess, normalizeRole } = require("../permissions");

// Share document
const shareDocument = async (req, res) => {
  try {
    const actorId = req.userId;
    const { documentId, userId, role } = req.body;

    if (!actorId) return res.status(401).json({ error: "Missing user" });
    if (!documentId || !userId) {
      return res.status(400).json({ error: "documentId and userId required" });
    }

    const docAccess = await getDocumentAccess(documentId, actorId);
    if (docAccess.notFound) return res.status(404).json({ error: "Not found" });
    if (!docAccess.allowed || docAccess.rank < 4) {
      return res.status(403).json({ error: "Only owner can share" });
    }

    const targetUserId = Number(userId);
    if (!targetUserId) return res.status(400).json({ error: "Invalid userId" });

    const normalizedRole = normalizeRole(role);

    // Upsert using raw SQL (Prisma client may not be regenerated)
    await prisma.$executeRaw`
      INSERT INTO SharedAccess (documentId, userId, role, createdAt)
      VALUES (${Number(documentId)}, ${targetUserId}, ${normalizedRole}, datetime('now'))
      ON CONFLICT(documentId, userId)
      DO UPDATE SET role = excluded.role
    `;

    const share = await prisma.$queryRaw`
      SELECT documentId, userId, role
      FROM SharedAccess
      WHERE documentId = ${Number(documentId)} AND userId = ${targetUserId}
      LIMIT 1
    `;

    res.json(share?.[0] || { documentId: Number(documentId), userId: targetUserId, role: normalizedRole });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get users
const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ EXPORT EVERYTHING
module.exports = {
  shareDocument,
  getUsers,
};
