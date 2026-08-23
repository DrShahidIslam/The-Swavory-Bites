import path from "node:path";
import fs from "node:fs/promises";
import { ArticleGenerator } from "../services/article-generator.js";
import { ImageGeneratorApi } from "../services/image-generator-api.js";

import { discoverPosts } from "./discover-posts.js";
import { renderPendingAssets } from "./render-assets.js";
import { publishApiDueQueue } from "./publish-api-queue.js";

export async function runDailyArticleAutopilot({ config, state, wordpress }) {
  console.log("\n==========================================================================");
  console.log("🚀 DAILY WORDPRESS ARTICLE AUTOPILOT — AEO / GEO / SEO GENERATION");
  console.log("==========================================================================\n");

  // 1. Fetch recent WordPress posts to build internal links
  const existingPosts = await wordpress.fetchRecentPosts(25);

  // 2. Select next unwritten trend topic from JSON database
  const trendingTopicsPath = path.resolve("data/trending_topics.json");
  const trendingTopicsData = await fs.readFile(trendingTopicsPath, "utf-8");
  const trendingTopics = JSON.parse(trendingTopicsData);

  state.state.publishedTrendIds = state.state.publishedTrendIds || [];

  const SPLINTER_IDENTITIES = [
    "for Busy Moms on a Budget",
    "for Women Over 50",
    "for College Students",
    "for Picky Eaters",
    "for Weight Loss",
    "for Beginners",
    "for Meal Prep",
    "for Large Families",
    "for Gut Health",
    "for a Romantic Date Night",
    "for Hosting a Party",
    "for Post-Workout Recovery",
    "for Diabetic Diets",
    "for PCOS",
    "for Menopause",
    "for High School Athletes",
    "for a Girls Night In",
    "for Road Trips",
    "for Toddlers",
    "for People with No Time"
  ];
  
  let selectedTopic = null;
  let selectedSplinterId = null;

  // Find the first combo of Base Topic + Splinter Identity that hasn't been published
  for (const t of trendingTopics) {
    for (let i = 0; i < SPLINTER_IDENTITIES.length; i++) {
      const splinterId = `${t.id}-splinter-${i}`;
      if (!state.state.publishedTrendIds.includes(splinterId)) {
        selectedTopic = { ...t, topic: `${t.topic} ${SPLINTER_IDENTITIES[i]}` };
        selectedSplinterId = splinterId;
        break;
      }
    }
    if (selectedTopic) break;
  }

  if (!selectedTopic) {
    console.error("❌ CRITICAL: trending_topics.json is exhausted! No new topics available.");
    return;
  }

  console.log(`📌 Target Topic for Today: "${selectedTopic.topic}"`);
  console.log(`🎯 Category: ${selectedTopic.category} | Board: ${selectedTopic.targetBoard}`);

  // Fetch WordPress categories to dynamically map the topic category and build the SEO Silo
  let categoryIds = [];
  let siloPosts = existingPosts; // Fallback to all if no category match
  try {
    const wpCategories = await wordpress.fetchCategories();
    const matchedCategory = wpCategories.find(c => 
      c.name.toLowerCase() === selectedTopic.category.toLowerCase() || 
      c.slug.toLowerCase() === selectedTopic.category.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    );
    if (matchedCategory) {
      categoryIds = [matchedCategory.id];
      console.log(`📂 Mapped category "${selectedTopic.category}" to WP Category ID: ${matchedCategory.id}`);
      
      // SEO SILO: Filter existing posts to ONLY include posts in this exact category
      siloPosts = existingPosts.filter(p => p.categories && p.categories.includes(matchedCategory.id));
      console.log(`🔗 Found ${siloPosts.length} existing posts in this Silo for internal linking.`);
    } else {
      console.log(`⚠️ Category "${selectedTopic.category}" not found in WordPress, defaulting to Uncategorized.`);
    }
  } catch (err) {
    console.warn("⚠️ Failed to fetch categories:", err.message);
  }

  // 3. Generate article text with Gemini AI
  const generator = new ArticleGenerator(config);
  const article = await generator.generateArticle({
    topic: selectedTopic.topic,
    targetKeyword: selectedTopic.searchKeywords[0],
    category: selectedTopic.category,
    existingPosts: siloPosts // Pass the strictly filtered Silo posts
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
    categories: categoryIds.length > 0 ? categoryIds : undefined,
    meta: {
      meta_description: article.metaDescription,
      primary_keyword: article.primaryKeyword
    }
  };

  const publishedPost = await wordpress.createPost(postData);
  console.log(`\n🎉 WORDPRESS ARTICLE PUBLISHED LIVE TO SITE!`);
  console.log(`📌 Post ID: ${publishedPost.id}`);
  console.log(`🔗 Link: ${publishedPost.link}`);

  // Mark this specific splinter permutation as published
  state.state.publishedTrendIds.push(selectedSplinterId);

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
