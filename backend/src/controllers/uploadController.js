const prisma = require("../prisma");

// Convert plain text → TipTap JSON
const textToTipTap = (text) => ({
  type: "doc",
  content: text.split("\n").map((line) => ({
    type: "paragraph",
    content: line ? [{ type: "text", text: line }] : [],
  })),
});

exports.uploadFile = async (req, res) => {
  try {
    const file = req.file;
    let { ownerId } = req.body || {};
    const actorId = req.userId;

    if (!file) {
      return res.status(400).json({ error: "File required" });
    }

    ownerId = Number(actorId || ownerId); // Ensure number
    if (!ownerId) return res.status(400).json({ error: "ownerId required" });

    const text = file.buffer.toString("utf-8");

    const doc = await prisma.document.create({
      data: {
        title: file.originalname,
        content: JSON.stringify(textToTipTap(text)),
        owner: { connect: { id: ownerId } }, // ✅ connect existing user
      },
    });

    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
