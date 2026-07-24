import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export class ImageGeneratorApi {
  constructor(config = {}) {
    const rawHfKeys = process.env.HUGGINGFACE_API_KEY || "";
    this.hfKeys = rawHfKeys.split(",").map((k) => k.trim()).filter(Boolean);
    this.pexelsKey = process.env.PEXELS_API_KEY || "";
    this.pixabayKey = process.env.PIXABAY_API_KEY || "";
    this.keyIndex = 0;
  }

  getHfKey() {
    if (this.hfKeys.length === 0) return null;
    const key = this.hfKeys[this.keyIndex % this.hfKeys.length];
    this.keyIndex++;
    return key;
  }

  /**
   * Generates or fetches an HD food photograph via API (HuggingFace FLUX / Pexels / Pixabay).
   */
  async generateFoodImage({ prompt, topic, outputPath }) {
    console.log(`🎨 Generating AI Food Photo via API for: "${topic}"...`);

    // 1. Try Hugging Face FLUX.1-dev AI Image Generation API
    const hfKey = this.getHfKey();
    if (hfKey) {
      try {
        const imagePrompt = `Professional editorial food photography of ${prompt || topic}, 8k resolution, food styling, natural soft lighting, shallow depth of field, delicious, cinematic gourmet magazine photo`;
        console.log(`🤖 Requesting HuggingFace FLUX AI Image Model...`);
        
        const response = await fetch(
          "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev",
          {
            headers: {
              Authorization: `Bearer ${hfKey}`,
              "Content-Type": "application/json"
            },
            method: "POST",
            body: JSON.stringify({ inputs: imagePrompt })
          }
        );

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Compress to WebP < 100KB using Sharp
          await sharp(buffer)
            .resize(1200, 800, { fit: "cover" })
            .webp({ quality: 80 })
            .toFile(outputPath);

          console.log(`✅ AI Food Image generated & compressed to WebP: ${outputPath}`);
          return outputPath;
        } else {
          console.warn(`⚠️ HuggingFace AI status ${response.status}. Trying Pexels/Pixabay stock API...`);
        }
      } catch (err) {
        console.warn(`⚠️ HuggingFace image call failed: ${err.message}. Trying stock API...`);
      }
    }

    // 2. Fallback to Pexels HD Food Photo API
    if (this.pexelsKey) {
      try {
        const searchUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(topic + " food")}&per_page=1`;
        const res = await fetch(searchUrl, {
          headers: { Authorization: this.pexelsKey }
        });
        if (res.ok) {
          const data = await res.json();
          const photoUrl = data.photos?.[0]?.src?.large2x || data.photos?.[0]?.src?.large;
          if (photoUrl) {
            const imgRes = await fetch(photoUrl);
            const arrayBuffer = await imgRes.arrayBuffer();
            await sharp(Buffer.from(arrayBuffer))
              .resize(1200, 800, { fit: "cover" })
              .webp({ quality: 80 })
              .toFile(outputPath);
            console.log(`✅ HD Pexels Food Photo fetched & saved to WebP: ${outputPath}`);
            return outputPath;
          }
        }
      } catch (err) {
        console.warn("Pexels API call failed:", err.message);
      }
    }

    return null;
  }
}
