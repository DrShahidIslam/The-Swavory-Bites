import path from "node:path";
import fs from "node:fs/promises";
import { ArticleGenerator } from "../services/article-generator.js";
import { ImageGeneratorApi } from "../services/image-generator-api.js";
import { PINTEREST_HIGH_SEARCH_TOPICS } from "../services/trend-strategy.js";
import { discoverPosts } from "./discover-posts.js";
import { renderPendingAssets } from "./render-assets.js";
import { publishApiDueQueue } from "./publish-api-queue.js";

export async function runDailyArticleAutopilot({ config, state, wordpress }) {
  console.log("\n==========================================================================");
  console.log("🚀 DAILY WORDPRESS ARTICLE AUTOPILOT — AEO / GEO / SEO GENERATION");
  console.log("==========================================================================\n");

  // 1. Fetch recent WordPress posts to prevent duplicate topics & build internal links
  const existingPosts = await wordpress.fetchRecentPosts(25);
  const existingTitles = existingPosts.map((p) => p.title?.rendered || p.title || "").join(" ").toLowerCase();

  // 2. Select next unwritten trend topic from curated list
  let selectedTopic = PINTEREST_HIGH_SEARCH_TOPICS.find(
    (t) => !existingTitles.includes(t.searchKeywords[0].toLowerCase()) && !existingTitles.includes(t.topic.toLowerCase())
  );

  if (!selectedTopic) {
    selectedTopic = {
      category: "Viral Desserts",
      topic: "Easy 3-Ingredient Peanut Butter Blossom Cookies",
      searchKeywords: ["easy peanut butter cookies", "3 ingredient dessert", "quick baking"],
      suggestedSlug: "easy-3-ingredient-peanut-butter-cookies",
      targetBoard: "Easy Dessert Recipes"
    };
  }

  console.log(`📌 Target Topic for Today: "${selectedTopic.topic}"`);
  console.log(`🎯 Category: ${selectedTopic.category} | Board: ${selectedTopic.targetBoard}`);

  // 3. Generate article text with Gemini AI
  const generator = new ArticleGenerator(config);
  const article = await generator.generateArticle({
    topic: selectedTopic.topic,
    targetKeyword: selectedTopic.searchKeywords[0],
    category: selectedTopic.category,
    existingPosts
  });

  // 4. Generate HD Food Photo via AI Image API (HuggingFace FLUX / Pexels)
  const imageApi = new ImageGeneratorApi(config);
  const tempImagePath = path.resolve(`data/assets/pinterest/temp-${article.slug}.jpg`);
  const generatedImagePath = await imageApi.generateFoodImage({
    prompt: article.primaryKeyword || selectedTopic.topic,
    topic: selectedTopic.topic,
    outputPath: tempImagePath
  });

  // 5. Compress image to WebP < 100KB & upload to WordPress Media
  let featuredMediaId = null;
  const inputPath = generatedImagePath || path.resolve("data/assets/pinterest/classic-homemade-peach-crisp-recipe-hero.jpg");

  try {
    const webpImage = await generator.optimizeImageToWebP(
      inputPath,
      article.slug,
      article.altText || article.title
    );

    const mediaRes = await wordpress.uploadMediaBuffer(
      webpImage.buffer,
      webpImage.filename,
      article.altText,
      "image/webp"
    );
    featuredMediaId = mediaRes?.id;
    console.log(`✅ Uploaded WebP Featured Image to WP Media | Media ID: ${featuredMediaId}`);
  } catch (imgErr) {
    console.warn("⚠️ Featured image upload skipped:", imgErr.message);
  }

  // 6. Publish Post live to WordPress REST API
  const postData = {
    title: article.title,
    slug: article.slug,
    content: article.contentHtml,
    excerpt: article.excerpt,
    status: "publish",
    featured_media: featuredMediaId,
    meta: {
      meta_description: article.metaDescription,
      primary_keyword: article.primaryKeyword
    }
  };

  const publishedPost = await wordpress.createPost(postData);
  console.log(`\n🎉 WORDPRESS ARTICLE PUBLISHED LIVE TO SITE!`);
  console.log(`📌 Post ID: ${publishedPost.id}`);
  console.log(`🔗 Link: ${publishedPost.link}`);

  // 7. Instantly trigger Pinterest Discovery, Render & Publish Pipeline!
  console.log(`\n📌 Handing off new article to Pinterest Engine...`);
  await discoverPosts({ config, state, wordpress });
  await renderPendingAssets({ config, state });
  await publishApiDueQueue({ config, state });

  await state.save();
  console.log("\n==========================================================================");
  console.log("🎉 DAILY WORDPRESS ARTICLE & PINTEREST PIPELINE COMPLETE!");
  console.log("==========================================================================\n");
}
