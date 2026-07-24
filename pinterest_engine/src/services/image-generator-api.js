import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export class ImageGeneratorApi {
  constructor(config = {}) {
    const rawHfKeys = process.env.HUGGINGFACE_API_KEY || "";
    this.hfKeys = rawHfKeys.split(",").map((k) => k.trim()).filter(Boolean);
    this.siliconFlowKey = process.env.SILICONFLOW_API_KEY || "";
    this.pexelsKey = process.env.PEXELS_API_KEY || "";
  }

  /**
   * Priority Order:
   * 1. Hugging Face (Rotates across all 10 HF keys)
   * 2. SiliconFlow Kolors AI Model (Kwai-Kolors/Kolors)
   * 3. Pexels HD Stock API
   */
  async generateFoodImage({ prompt, topic, outputPath }) {
    const imagePrompt = `Professional editorial food photography of ${prompt || topic}, 8k resolution, food styling, natural soft lighting, shallow depth of field, delicious, cinematic gourmet magazine photo`;

    // =========================================================================
    // STEP 1: Hugging Face (Try ALL 10 keys in rotation)
    // =========================================================================
    if (this.hfKeys.length > 0) {
      console.log(`🤖 Step 1: Trying HuggingFace FLUX Model (${this.hfKeys.length} keys available)...`);
      
      for (let i = 0; i < this.hfKeys.length; i++) {
        const apiKey = this.hfKeys[i];
        console.log(`   🔑 Key ${i + 1}/${this.hfKeys.length} (${apiKey.slice(0, 7)}...)...`);

        try {
          const response = await fetch(
            "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev",
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json"
              },
              method: "POST",
              body: JSON.stringify({ inputs: imagePrompt })
            }
          );

          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            await sharp(buffer)
              .resize(1200, 800, { fit: "cover" })
              .webp({ quality: 80 })
              .toFile(outputPath);

            console.log(`✅ SUCCESS! Hugging Face AI image generated & saved to WebP (${outputPath})`);
            return outputPath;
          } else {
            console.warn(`   ⚠️ HF Key ${i + 1} returned status ${response.status}. Trying next key...`);
          }
        } catch (err) {
          console.warn(`   ⚠️ HF Key ${i + 1} failed: ${err.message}. Trying next key...`);
        }
      }

      console.warn("❌ All HuggingFace keys exhausted/expired. Falling back to SiliconFlow Kolors AI...");
    }

    // =========================================================================
    // STEP 2: SiliconFlow Kolors AI Model (Kwai-Kolors/Kolors)
    // =========================================================================
    if (this.siliconFlowKey) {
      console.log(`🎨 Step 2: Requesting SiliconFlow Kolors AI Model (Kwai-Kolors/Kolors)...`);
      try {
        const res = await fetch("https://api.siliconflow.cn/v1/images/generations", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.siliconFlowKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "Kwai-Kolors/Kolors",
            prompt: imagePrompt,
            image_size: "1024x768"
          })
        });

        if (res.ok) {
          const data = await res.json();
          const imgUrl = data.images?.[0]?.url || data.data?.[0]?.url;
          if (imgUrl) {
            const imgRes = await fetch(imgUrl);
            const arrayBuffer = await imgRes.arrayBuffer();

            await sharp(Buffer.from(arrayBuffer))
              .resize(1200, 800, { fit: "cover" })
              .webp({ quality: 80 })
              .toFile(outputPath);

            console.log(`✅ SUCCESS! SiliconFlow Kolors AI image generated & saved to WebP (${outputPath})`);
            return outputPath;
          }
        } else {
          console.warn(`⚠️ SiliconFlow Kolors returned HTTP ${res.status}: ${await res.text()}`);
        }
      } catch (sfErr) {
        console.warn("⚠️ SiliconFlow Kolors API call failed:", sfErr.message);
      }
    }

    // =========================================================================
    // STEP 3: Pexels HD Stock Photo Fallback
    // =========================================================================
    if (this.pexelsKey) {
      console.log(`📸 Step 3: Falling back to Pexels HD Food Photo API...`);
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
            console.log(`✅ SUCCESS! Pexels HD Food Photo fetched & saved to WebP (${outputPath})`);
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
