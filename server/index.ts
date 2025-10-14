import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import cardRoutes from "./routes/card.routes";
import invoiceRoutes from "./routes/invoice.routes";
import itemRoutes from "./routes/item.routes";
import categoryRoutes from "./routes/category.routes";
import authorRoutes from "./routes/author.routes";

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/authors", authorRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

export default app;
