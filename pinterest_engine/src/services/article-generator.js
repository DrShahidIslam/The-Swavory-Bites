import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export class ArticleGenerator {
  constructor(config = {}) {
    this.config = config;
    const rawKeys = config.geminiApiKeys || process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
    this.apiKeys = rawKeys.split(",").map((k) => k.trim()).filter(Boolean);
    this.keyIndex = 0;
  }

  getApiKey() {
    if (this.apiKeys.length === 0) {
      throw new Error("No GEMINI_API_KEYS found in environment.");
    }
    const key = this.apiKeys[this.keyIndex % this.apiKeys.length];
    this.keyIndex++;
    return key;
  }

  /**
   * Generates a fully AEO, GEO, and SEO optimized article with semantic entities,
   * ALP (Answer-Led Paragraphs), structured FAQ schema, and optimized metadata.
   */
  async generateArticle({ topic, targetKeyword, category = "Recipes", existingPosts = [] }) {
    const apiKey = this.getApiKey();

    // Contextual internal links from existing WordPress posts
    const internalLinkContext = existingPosts
      .slice(0, 15)
      .map((p) => `- Title: "${p.title?.rendered || p.title}" | URL: ${p.link} | Slug: ${p.slug}`)
      .join("\n");

    const prompt = `
You are an elite SEO, AEO (Answer Engine Optimization), and GEO (Generative Engine Optimization) culinary journalist.

Write a 1,200+ word article on:
Topic: "${topic}"
Target Keyword: "${targetKeyword}"
Category: "${category}"

CRITICAL MANDATORY INSTRUCTIONS FOR RETENTION & SEO SILOS:
1. **Massive Content Depth (1,500+ Words GUARANTEED)**:
   - You MUST write a highly detailed, comprehensive guide. You MUST follow this exact word count blueprint:
     * Intro & "Why You'll Love This": 250 words.
     * Food Science & Ingredient Deep Dive: 400 words.
     * Step-by-Step Instructions: 400 words.
     * Troubleshooting, Storage & Pro Tips: 350 words.
     * FAQ: 200 words.
2. **Pinterest-Optimized Visual Modules (Inline CSS REQUIRED)**:
   - You MUST break up the text using visually distinct HTML blocks. Use inline CSS.
   - Include a **"Why You'll Love This"** bulleted list using a soft background box (e.g., <div style="background:#fef7f2; padding:15px; border-left:4px solid #d87439; margin-bottom:20px;">).
   - Include an **"At-a-Glance"** table/box detailing Prep Time, Cook Time, Total Time, Yield, and Estimated Calories.
   - Include a **"Dietary Substitutions"** section (highly searched by Pinterest users).
   - Include a **"Pro Tips for Success"** callout box (e.g., <div style="background:#f4f9f4; padding:15px; border:1px solid #2d9e64; border-radius:5px;">).
3. **AEO & GEO (NLP & Semantic Entities)**:
   - Under every <h2> and <h3> heading, the VERY FIRST 35-40 words must directly answer the section question/topic clearly and concisely.
   - You MUST weave in high-density semantic entities, LSI keywords, and NLP phrasing naturally throughout the text (e.g., Maillard reaction, emulsification, flavor profiles, specific equipment).
4. **STRICT H1 BAN & SEO Structure**:
   - CRITICAL: DO NOT use <h1> tags ANYWHERE in the content. You may ONLY use <h2>, <h3>, and <h4> tags. The title is handled separately.
   - Title must front-load the primary keyword "${targetKeyword}" (< 60 chars).
   - Write an engaging Meta Description (< 155 chars) containing "${targetKeyword}".
5. **Contextual Silo Internal Links**:
   - Naturally embed 2 to 3 contextual internal links to these existing articles in the SAME category:
${internalLinkContext || "- None available"}
6. **FAQ & Schema**:
   - Include an <h2>Frequently Asked Questions</h2> section with 3 distinct questions and answers.

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "title": "SEO Title with keyword (< 60 chars)",
  "slug": "url-friendly-slug",
  "metaDescription": "Click-worthy meta description with keyword (< 155 chars)",
  "excerpt": "Concise 2-sentence summary.",
  "altText": "Keyword-optimized image alt tag describing the dish",
  "contentHtml": "<p>Full HTML content with headings, ALP paragraphs, internal links, key takeaways, and FAQ...</p>",
  "faqJsonLd": [
    { "question": "Question 1?", "answer": "Answer 1." },
    { "question": "Question 2?", "answer": "Answer 2." },
    { "question": "Question 3?", "answer": "Answer 3." }
  ],
  "primaryKeyword": "${targetKeyword}",
  "semanticEntities": ["entity1", "entity2", "entity3"]
}
`;

    console.log(`🤖 Generating AEO/GEO/SEO Article for: "${topic}"...`);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.config.geminiTextModel}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API Error HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const rawJsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const article = JSON.parse(rawJsonText || "{}");

    console.log(`✅ Article generated: "${article.title}"`);
    return article;
  }

  /**
   * Optimizes an image to WebP format, target size < 100KB, with keyword-optimized ALT tag.
   */
  async optimizeImageToWebP(inputImagePath, targetFilename, altText = "") {
    console.log(`🖼️ Optimizing image to WebP (< 100KB)...`);
    
    let quality = 80;
    let buffer = await sharp(inputImagePath)
      .resize(1200, 630, { fit: "cover", position: "attention" })
      .webp({ quality, effort: 6 })
      .toBuffer();

    // Reduce quality dynamically if > 100KB (102,400 bytes)
    while (buffer.length > 100 * 1024 && quality > 45) {
      quality -= 5;
      buffer = await sharp(inputImagePath)
        .resize(1200, 630, { fit: "cover", position: "attention" })
        .webp({ quality, effort: 6 })
        .toBuffer();
    }

    console.log(`✅ Image compressed to WebP: ${(buffer.length / 1024).toFixed(1)} KB (Quality: ${quality}%)`);
    console.log(`🏷️ SEO Alt Tag: "${altText}"`);

    return {
      buffer,
      filename: `${targetFilename}.webp`,
      mimeType: "image/webp",
      sizeKb: (buffer.length / 1024).toFixed(1),
      altText
    };
  }
}
