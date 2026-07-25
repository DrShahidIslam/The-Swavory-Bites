import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export class ImageGeneratorApi {
  constructor(config = {}) {
    const rawHfKeys = process.env.HUGGINGFACE_API_KEY || "";
    this.hfKeys = rawHfKeys.split(",").map((k) => k.trim()).filter(Boolean);
    
    // SiliconFlow is disabled per user request to save money
    // this.siliconFlowKey = process.env.SILICONFLOW_API_KEY || "";
    
    this.cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
    this.cfApiToken = process.env.CLOUDFLARE_API_TOKEN || "";
    this.pexelsKey = process.env.PEXELS_API_KEY || "";
  }

  /**
   * Priority Order:
   * 1. Hugging Face (Rotates across all 10 HF keys)
   * 2. Cloudflare Workers AI SDXL (Free Tier)
   * 3. Pollinations.ai (Zero-key Free Fallback)
   * 4. Pexels HD Stock API
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
            "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
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

      console.warn("❌ All HuggingFace keys exhausted/expired. Falling back to Cloudflare Workers AI...");
    }

    // =========================================================================
    // STEP 2: Cloudflare Workers AI (SDXL)
    // =========================================================================
    if (this.cfAccountId && this.cfApiToken) {
      console.log(`🎨 Step 2: Requesting Cloudflare Workers AI (SDXL)...`);
      try {
        const url = `https://api.cloudflare.com/client/v4/accounts/${this.cfAccountId}/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.cfApiToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            prompt: imagePrompt,
            width: 1216,
            height: 832
          })
        });

        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          await sharp(Buffer.from(arrayBuffer))
            .resize(1200, 800, { fit: "cover" })
            .webp({ quality: 80 })
            .toFile(outputPath);

          console.log(`✅ SUCCESS! Cloudflare AI image generated & saved to WebP (${outputPath})`);
          return outputPath;
        } else {
          console.warn(`⚠️ Cloudflare returned HTTP ${res.status}: ${await res.text()}`);
        }
      } catch (cfErr) {
        console.warn("⚠️ Cloudflare AI call failed:", cfErr.message);
      }
    }

    // =========================================================================
    // STEP 3: Pollinations.ai (Zero-Key Free Fallback)
    // =========================================================================
    console.log(`🎨 Step 3: Falling back to Pollinations.ai (Free zero-key Flux model)...`);
    try {
      const seed = Math.floor(Math.random() * 999999);
      const encodedPrompt = encodeURIComponent(imagePrompt);
      const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1200&height=800&model=flux&nologo=true&seed=${seed}`;
      
      const res = await fetch(url);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        await sharp(Buffer.from(arrayBuffer))
          .webp({ quality: 80 })
          .toFile(outputPath);

        console.log(`✅ SUCCESS! Pollinations.ai image generated & saved to WebP (${outputPath})`);
        return outputPath;
      } else {
        console.warn(`⚠️ Pollinations returned HTTP ${res.status}`);
      }
    } catch (pollErr) {
      console.warn("⚠️ Pollinations AI call failed:", pollErr.message);
    }

    // =========================================================================
    // STEP 4: Pexels HD Stock Photo Fallback
    // =========================================================================
    if (this.pexelsKey) {
      console.log(`📸 Step 4: Falling back to Pexels HD Food Photo API...`);
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
