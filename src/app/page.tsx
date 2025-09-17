"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import "./styles/dashboard.css";

export default function Home() {
  const [topic, setTopic] = useState("");
  const [wordCount, setWordCount] = useState("800");
  const [tone, setTone] = useState("Professional");
  const [seo, setSeo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [outline, setOutline] = useState<string | null>(null);
  const [article, setArticle] = useState<string>("");

  const generate = async (step: "outline" | "article") => {
    setLoading(true);
    setOutline(null);
    setArticle("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step,
          topic,
          wordCount,
          tone,
          seo,
          outline,
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) return;
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        if (step === "outline") setOutline((prev) => (prev || "") + chunk);
        else setArticle((prev) => (prev || "") + chunk);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="dashboard-card"
      >
        {/* Title */}
        <h1 className="dashboard-title">✨ AI Blog Generator</h1>

        {/* Form */}
        <div className="grid gap-4">
          <input
            type="text"
            placeholder="Enter your blog topic..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="dashboard-input"
          />

          <div className="grid md:grid-cols-3 gap-4">
            <input
              type="number"
              value={wordCount}
              onChange={(e) => setWordCount(e.target.value)}
              className="dashboard-select"
              placeholder="Word Count"
            />
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="dashboard-select"
            >
              <option>Professional</option>
              <option>Casual</option>
              <option>Educational</option>
              <option>Persuasive</option>
            </select>
            <label className="flex items-center justify-center gap-2 text-gray-700">
              <input
                type="checkbox"
                checked={seo}
                onChange={() => setSeo(!seo)}
                className="dashboard-checkbox"
              />
               <span> SEO Optimized</span>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex flex-col md:flex-row gap-4 justify-center mt-4">
            <button
              onClick={() => generate("outline")}
              disabled={loading}
              className="dashboard-button dashboard-button-outline"
            >
              📝 Generate Outline
            </button>
            <button
              onClick={() => generate("article")}
              disabled={loading}
              className="dashboard-button dashboard-button-article"
            >
              📄 Generate Article
            </button>
          </div>
        </div>

        {/* Loader */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="dashboard-loader"
          >
            Generating magic... ✨
          </motion.div>
        )}

        {/* Output Section */}
        <div className="dashboard-output">
          {outline && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="dashboard-outline"
            >
              <h2 className="dashboard-outline-title">📝 Outline</h2>
              {outline}
            </motion.div>
          )}

          {article && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="dashboard-article"
              dangerouslySetInnerHTML={{ __html: article }}
            />
          )}
        </div>
      </motion.div>
      <div className="dashboard-footer">
  © {new Date().getFullYear()} AS Consultants. All rights reserved.
</div>
    </div>
  );
}
