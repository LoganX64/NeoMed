const prisma = require("../prisma");
const EMPTY_DOC = JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] });
const { getDocumentAccess, ROLE_RANK } = require("../permissions");

// Create document
exports.createDocument = async (req, res) => {
  try {
    const { title, content, ownerId } = req.body || {};
    const actorId = req.userId || Number(ownerId);

    if (!title || !actorId) {
      return res.status(400).json({ error: "title and ownerId required" });
    }

    const doc = await prisma.document.create({
      data: {
        title,
        content: content || EMPTY_DOC,
        ownerId: Number(actorId),
      },
    });

    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get my documents
exports.getMyDocuments = async (req, res) => {
  try {
    const userId = Number(req.userId || req.query.userId);

    const docs = await prisma.document.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
    });

    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get shared documents
exports.getSharedDocuments = async (req, res) => {
  try {
    const userId = Number(req.userId || req.query.userId);
    if (!userId) return res.status(400).json({ error: "userId required" });

    const rows = await prisma.$queryRaw`
      SELECT d.*, u.name as ownerName, s.role as accessRole
      FROM SharedAccess s
      JOIN Document d ON d.id = s.documentId
      JOIN User u ON u.id = d.ownerId
      WHERE s.userId = ${userId}
      ORDER BY d.updatedAt DESC
    `;

    const docs = (rows || []).map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      ownerId: r.ownerId,
      owner: { id: r.ownerId, name: r.ownerName },
      accessRole: r.accessRole,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Get single document
exports.getDocumentById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.userId;

    const doc = await prisma.document.findUnique({
      where: { id },
    });

    if (!doc) return res.status(404).json({ error: "Not found" });

    if (!userId) return res.status(401).json({ error: "Missing user" });
    const access = await getDocumentAccess(id, userId);
    if (!access.allowed) return res.status(403).json({ error: "No access" });

    res.json({ ...doc, accessRole: access.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update document
exports.updateDocument = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { title, content } = req.body || {};
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Missing user" });

    const access = await getDocumentAccess(id, userId);
    if (access.notFound) return res.status(404).json({ error: "Not found" });
    if (!access.allowed || access.rank < ROLE_RANK.EDITOR) {
      return res.status(403).json({ error: "No edit permission" });
    }

    // Create a version snapshot (raw SQL)
    const current = await prisma.document.findUnique({ where: { id } });
    if (current) {
      await prisma.$executeRaw`
        INSERT INTO DocumentVersion (documentId, title, content, createdById, createdAt)
        VALUES (${id}, ${String(current.title || "")}, ${String(current.content || "")}, ${Number(userId)}, datetime('now'))
      `;
    }

    const doc = await prisma.document.update({
      where: { id },
      data: {
        title,
        content,
      },
    });

    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Missing user" });

    const access = await getDocumentAccess(Number(id), userId);
    if (access.notFound) return res.status(404).json({ error: "Not found" });
    if (access.rank < ROLE_RANK.OWNER) {
      return res.status(403).json({ error: "Only owner can delete" });
    }

    // delete shared access first (FK safety)
    await prisma.sharedAccess.deleteMany({
      where: { documentId: Number(id) },
    });

    // delete comments, versions, presence
    await prisma.$executeRaw`DELETE FROM Comment WHERE documentId = ${Number(id)}`;
    await prisma.$executeRaw`DELETE FROM DocumentVersion WHERE documentId = ${Number(id)}`;
    await prisma.$executeRaw`DELETE FROM Presence WHERE documentId = ${Number(id)}`;

    // delete document
    await prisma.document.delete({
      where: { id: Number(id) },
    });

    res.json({ message: "Document deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Versions
exports.getVersions = async (req, res) => {
  try {
    const documentId = Number(req.params.id);
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Missing user" });

    const access = await getDocumentAccess(documentId, userId);
    if (access.notFound) return res.status(404).json({ error: "Not found" });
    if (!access.allowed) return res.status(403).json({ error: "No access" });

    const rows = await prisma.$queryRaw`
      SELECT v.id, v.title, v.createdAt, u.id as createdById, u.name as createdByName
      FROM DocumentVersion v
      JOIN User u ON u.id = v.createdById
      WHERE v.documentId = ${documentId}
      ORDER BY v.createdAt DESC
      LIMIT 50
    `;
    res.json(rows || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.restoreVersion = async (req, res) => {
  try {
    const documentId = Number(req.params.id);
    const versionId = Number(req.params.versionId);
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Missing user" });

    const access = await getDocumentAccess(documentId, userId);
    if (access.notFound) return res.status(404).json({ error: "Not found" });
    if (!access.allowed || access.rank < ROLE_RANK.EDITOR) {
      return res.status(403).json({ error: "No edit permission" });
    }

    const versionRows = await prisma.$queryRaw`
      SELECT title, content
      FROM DocumentVersion
      WHERE id = ${versionId} AND documentId = ${documentId}
      LIMIT 1
    `;
    const version = versionRows?.[0];
    if (!version) return res.status(404).json({ error: "Version not found" });

    await prisma.document.update({
      where: { id: documentId },
      data: { title: version.title, content: version.content },
    });

    res.json({ message: "Restored", documentId, versionId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Comments
exports.getComments = async (req, res) => {
  try {
    const documentId = Number(req.params.id);
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Missing user" });

    const access = await getDocumentAccess(documentId, userId);
    if (access.notFound) return res.status(404).json({ error: "Not found" });
    if (!access.allowed) return res.status(403).json({ error: "No access" });

    const rows = await prisma.$queryRaw`
      SELECT c.id, c.kind, c.body, c.fromPos, c.toPos, c.resolvedAt, c.createdAt,
             u.id as createdById, u.name as createdByName
      FROM Comment c
      JOIN User u ON u.id = c.createdById
      WHERE c.documentId = ${documentId}
      ORDER BY c.createdAt DESC
      LIMIT 200
    `;
    res.json(rows || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addComment = async (req, res) => {
  try {
    const documentId = Number(req.params.id);
    const userId = req.userId;
    const { body, kind, fromPos, toPos } = req.body || {};
    if (!userId) return res.status(401).json({ error: "Missing user" });
    if (!body) return res.status(400).json({ error: "body required" });

    const access = await getDocumentAccess(documentId, userId);
    if (access.notFound) return res.status(404).json({ error: "Not found" });
    if (!access.allowed || access.rank < ROLE_RANK.COMMENTER) {
      return res.status(403).json({ error: "No comment permission" });
    }

    const safeKind = String(kind || "COMMENT").toUpperCase() === "SUGGESTION" ? "SUGGESTION" : "COMMENT";

    await prisma.$executeRaw`
      INSERT INTO Comment (documentId, createdById, kind, body, fromPos, toPos, createdAt)
      VALUES (${documentId}, ${Number(userId)}, ${safeKind}, ${String(body)}, ${fromPos ?? null}, ${toPos ?? null}, datetime('now'))
    `;
    res.json({ message: "Added" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.resolveComment = async (req, res) => {
  try {
    const documentId = Number(req.params.id);
    const commentId = Number(req.params.commentId);
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Missing user" });

    const access = await getDocumentAccess(documentId, userId);
    if (access.notFound) return res.status(404).json({ error: "Not found" });
    if (!access.allowed || access.rank < ROLE_RANK.EDITOR) {
      return res.status(403).json({ error: "No permission" });
    }

    await prisma.$executeRaw`
      UPDATE Comment
      SET resolvedAt = datetime('now')
      WHERE id = ${commentId} AND documentId = ${documentId}
    `;
    res.json({ message: "Resolved" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Presence
exports.heartbeatPresence = async (req, res) => {
  try {
    const documentId = Number(req.params.id);
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Missing user" });

    const access = await getDocumentAccess(documentId, userId);
    if (access.notFound) return res.status(404).json({ error: "Not found" });
    if (!access.allowed) return res.status(403).json({ error: "No access" });

    await prisma.$executeRaw`
      DELETE FROM Presence
      WHERE documentId = ${documentId} AND expiresAt < datetime('now')
    `;

    await prisma.$executeRaw`
      INSERT INTO Presence (documentId, userId, lastSeenAt, expiresAt)
      VALUES (${documentId}, ${Number(userId)}, datetime('now'), datetime('now', '+15 seconds'))
      ON CONFLICT(documentId, userId)
      DO UPDATE SET lastSeenAt = excluded.lastSeenAt, expiresAt = excluded.expiresAt
    `;

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPresence = async (req, res) => {
  try {
    const documentId = Number(req.params.id);
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Missing user" });

    const access = await getDocumentAccess(documentId, userId);
    if (access.notFound) return res.status(404).json({ error: "Not found" });
    if (!access.allowed) return res.status(403).json({ error: "No access" });

    await prisma.$executeRaw`
      DELETE FROM Presence
      WHERE documentId = ${documentId} AND expiresAt < datetime('now')
    `;

    const rows = await prisma.$queryRaw`
      SELECT u.id as userId, u.name as name, p.lastSeenAt
      FROM Presence p
      JOIN User u ON u.id = p.userId
      WHERE p.documentId = ${documentId}
      ORDER BY p.lastSeenAt DESC
    `;
    res.json(rows || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Export
// Exported for testing
const tiptapToMarkdown = exports.tiptapToMarkdown = (node) => {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(tiptapToMarkdown).join("");

  const type = node.type;
  const content = node.content || [];

  if (type === "doc") return content.map(tiptapToMarkdown).join("\n").trim() + "\n";
  if (type === "paragraph") return content.map(tiptapToMarkdown).join("") + "\n";
  if (type === "heading") {
    const level = node.attrs?.level || 1;
    const hashes = "#".repeat(Math.max(1, Math.min(6, level)));
    return `${hashes} ${content.map(tiptapToMarkdown).join("")}\n`;
  }
  if (type === "bulletList") return content.map((c) => `- ${tiptapToMarkdown(c).trim()}\n`).join("");
  if (type === "orderedList") {
    return content
      .map((c, i) => `${i + 1}. ${tiptapToMarkdown(c).trim()}\n`)
      .join("");
  }
  if (type === "listItem") return content.map(tiptapToMarkdown).join("");
  if (type === "text") {
    let t = node.text || "";
    const marks = node.marks || [];
    for (const m of marks) {
      if (m.type === "bold") t = `**${t}**`;
      if (m.type === "italic") t = `*${t}*`;
      if (m.type === "underline") t = `<u>${t}</u>`;
      if (m.type === "code") t = `\`${t}\``;
    }
    return t;
  }
  return content.map(tiptapToMarkdown).join("");
}

exports.exportMarkdown = async (req, res) => {
  try {
    const documentId = Number(req.params.id);
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Missing user" });

    const access = await getDocumentAccess(documentId, userId);
    if (access.notFound) return res.status(404).json({ error: "Not found" });
    if (!access.allowed) return res.status(403).json({ error: "No access" });

    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) return res.status(404).json({ error: "Not found" });

    let md = `# ${doc.title || "Untitled"}\n\n`;
    try {
      const json = JSON.parse(doc.content || "");
      md += tiptapToMarkdown(json);
    } catch {
      md += (doc.content || "") + "\n";
    }

    res.json({ markdown: md });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
