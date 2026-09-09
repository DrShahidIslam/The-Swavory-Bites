import { clampText } from "../lib/text.js";

export async function enrichVariantsWithCopy(post, classification, variants, config) {
  const keys = (config.geminiApiKeys && config.geminiApiKeys.length > 0)
    ? config.geminiApiKeys
    : [config.geminiApiKey].filter(Boolean);

  if (keys.length === 0) {
    console.warn("⚠️ No Gemini API key found for pin copywriting, using plan fallback.");
    return variants;
  }

  const models = [
    config.geminiTextModel || "gemini-3.1-flash-lite-preview",
    "gemini-2.5-flash",
    "gemini-3.6-flash"
  ];

  const prompt = [
    "You are a top-tier Pinterest food marketing specialist and food editor.",
    "Your goal is to generate viral, high-CTR Pinterest Pin copy for this recipe.",
    "Return valid JSON only in this exact format:",
    JSON.stringify({
      variants: [
        {
          overlayTitle: "Short punchy text on image (3-5 words, e.g., 'Crispy Bang Bang Skewers')",
          overlaySubtitle: "Benefit badge (2-4 words, e.g., '20-Min Weeknight Dinner')",
          pinTitle: "Click-worthy, front-loaded title with keyword (< 100 chars)",
          pinDescription: "Mouth-watering, sensory-rich 50-75 word description. Describe the flavor, texture, and ease. End with: 'Get the full recipe with ingredients, cook times, and tips on The Swavory Bites.' NO hashtags.",
          searchTags: ["keyword 1", "keyword 2", "keyword 3", "keyword 4"]
        }
      ]
    }, null, 2),
    "",
    "CRITICAL RULES:",
    "1. Overlay Title: MUST be appetizing, catchy, and 3-5 words max. NEVER use 'Worth Trying' or 'Click-Worthy'.",
    "2. Description: 50-75 words of delicious, warm, engaging copy. Highlight flavors, ease of cooking, and why pinners will love it.",
    "3. Language: Write in " + (post.language === "fr" ? "French" : "English") + ".",
    `Post title: ${post.title}`,
    `Language: ${post.language}`,
    `Board: ${classification.boardName}`,
    `Content type: ${classification.contentType}`,
    `Excerpt: ${post.excerpt || "N/A"}`
  ].join("\n");

  for (const apiKey of keys) {
    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.8,
                responseMimeType: "application/json"
              }
            })
          }
        );

        if (!response.ok) {
          continue; // Try next model or key
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = JSON.parse(text || "{}");
        const generated = Array.isArray(parsed.variants) ? parsed.variants : [];

        if (generated.length === 0) continue;

        console.log(`✅ Generated AI Pinterest Copy using model ${model} for "${post.title}"`);

        return variants.map((variant, index) => {
          const item = generated[index] || {};
          const tags = Array.isArray(item.searchTags) ? item.searchTags : variant.searchTags || [];
          return {
            ...variant,
            overlayTitle: clampText(item.overlayTitle || variant.overlayTitle, 56),
            overlaySubtitle: clampText(item.overlaySubtitle || variant.overlaySubtitle, 70),
            pinTitle: clampText(item.pinTitle || variant.pinTitle, 100),
            pinDescription: clampText(item.pinDescription || variant.pinDescription, 320),
            searchTags: [...new Set(tags.map((value) => String(value || "").trim()).filter(Boolean))].slice(0, 8)
          };
        });
      } catch (err) {
        // Continue to next model/key
      }
    }
  }

  console.warn("⚠️ All Gemini keys/models failed for copywriting. Falling back to plan.");
  return variants;
}

