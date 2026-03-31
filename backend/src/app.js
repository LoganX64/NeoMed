const express = require("express");
const cors = require("cors");
const userRoutes = require("./routes/users");
const documentRoutes = require("./routes/documents");
const shareRoutes = require("./routes/share");
const uploadRoutes = require("./routes/upload");
const { getUserId } = require("./auth");

const app = express();

app.use(cors());
app.use(express.json());
app.use((req, _res, next) => {
  req.userId = getUserId(req);
  next();
});

app.get("/", (req, res) => {
  res.json({ message: "API running" });
});

app.use("/documents", documentRoutes);
app.use("/users", userRoutes);
app.use("/share", shareRoutes);

app.use("/upload", uploadRoutes);

module.exports = app;
