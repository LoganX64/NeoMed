const express = require("express");
const router = express.Router();

const {
  createDocument,
  getMyDocuments,
  getSharedDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  getVersions,
  restoreVersion,
  getComments,
  addComment,
  resolveComment,
  heartbeatPresence,
  getPresence,
  exportMarkdown,
} = require("../controllers/documentController");

router.post("/", createDocument);
router.get("/my", getMyDocuments);
router.get("/shared", getSharedDocuments);
router.get("/:id/versions", getVersions);
router.post("/:id/versions/:versionId/restore", restoreVersion);
router.get("/:id/comments", getComments);
router.post("/:id/comments", addComment);
router.post("/:id/comments/:commentId/resolve", resolveComment);
router.post("/:id/presence/heartbeat", heartbeatPresence);
router.get("/:id/presence", getPresence);
router.get("/:id/export/markdown", exportMarkdown);
router.get("/:id", getDocumentById);
router.put("/:id", updateDocument);
router.delete("/:id", deleteDocument);

module.exports = router;
