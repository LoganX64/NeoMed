const prisma = require("./prisma");

const ROLE_RANK = {
  VIEWER: 1,
  COMMENTER: 2,
  EDITOR: 3,
  OWNER: 4,
};

function normalizeRole(role) {
  const r = String(role || "").toUpperCase();
  if (r === "COMMENTER" || r === "EDITOR" || r === "VIEWER") return r;
  return "VIEWER";
}

async function getDocumentAccess(documentId, userId) {
  const docId = Number(documentId);
  const uId = Number(userId);
  if (!docId || !uId) return { allowed: false, role: null, rank: 0, ownerId: null };

  const docRows = await prisma.$queryRaw`
    SELECT id, ownerId
    FROM Document
    WHERE id = ${docId}
    LIMIT 1
  `;

  const doc = docRows?.[0];
  if (!doc) return { allowed: false, role: null, rank: 0, ownerId: null, notFound: true };

  if (Number(doc.ownerId) === uId) {
    return { allowed: true, role: "OWNER", rank: ROLE_RANK.OWNER, ownerId: doc.ownerId };
  }

  const shareRows = await prisma.$queryRaw`
    SELECT role
    FROM SharedAccess
    WHERE documentId = ${docId} AND userId = ${uId}
    LIMIT 1
  `;

  const shared = shareRows?.[0];
  if (!shared) return { allowed: false, role: null, rank: 0, ownerId: doc.ownerId };

  const role = normalizeRole(shared.role);
  return { allowed: true, role, rank: ROLE_RANK[role], ownerId: doc.ownerId };
}

module.exports = { ROLE_RANK, normalizeRole, getDocumentAccess };

