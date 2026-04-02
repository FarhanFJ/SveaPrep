import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";
import cors from "cors";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // In-memory store for MVP (Naive Model)
  const db = {
    curricula: [] as any[],
    questions: [] as any[],
  };

  // API: Scrape KTH Syllabus
  app.post("/api/scrape", async (req, res) => {
    const { courseCode } = req.body;
    const url = `https://www.kth.se/student/kurser/kurs/${courseCode}?l=en`;

    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      const title = $("h1").text().trim();
      const objectives = $("#intended-learning-outcomes").nextUntil("h2").text().trim();
      const content = $("#course-main-content").nextUntil("h2").text().trim();
      const prerequisites = $("#specific-prerequisites").nextUntil("h2").text().trim();

      const curriculum = {
        id: Date.now().toString(),
        courseCode,
        title,
        objectives,
        content,
        prerequisites,
        url,
      };

      db.curricula.push(curriculum);
      res.json(curriculum);
    } catch (error) {
      console.error("Scraping error:", error);
      res.status(500).json({ error: "Failed to scrape syllabus" });
    }
  });

  // API: Generate Questions (Now handled by frontend, this endpoint just returns curriculum)
  app.post("/api/generate-questions", async (req, res) => {
    const { curriculumId } = req.body;
    const curriculum = db.curricula.find((c) => c.id === curriculumId);

    if (!curriculum) {
      return res.status(404).json({ error: "Curriculum not found" });
    }
    
    res.json({ curriculum });
  });

  // API: Save Generated Questions
  app.post("/api/save-questions", async (req, res) => {
    const { questions } = req.body;
    if (Array.isArray(questions)) {
      db.questions.push(...questions);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "Invalid questions format" });
    }
  });

  // API: Get Questions
  app.get("/api/questions", (req, res) => {
    res.json(db.questions);
  });

  // API: Update Question Status (Instructor Review)
  app.patch("/api/questions/:id", (req, res) => {
    const { id } = req.params;
    const { status, question_text, correct_answer, distractors } = req.body;
    const question = db.questions.find((q) => q.id === id);

    if (question) {
      if (status) question.status = status;
      if (question_text) question.question_text = question_text;
      if (correct_answer) question.correct_answer = correct_answer;
      if (distractors) question.distractors = distractors;
      res.json(question);
    } else {
      res.status(404).json({ error: "Question not found" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
