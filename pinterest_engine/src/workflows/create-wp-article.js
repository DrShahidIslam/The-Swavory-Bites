import { ArticleGenerator } from "../services/article-generator.js";

export async function createWpArticle({ topic, targetKeyword, category, config, state, wordpress, sampleImagePath }) {
  console.log(`\n==========================================================================`);
  console.log(`🚀 STARTING AEO/GEO/SEO WORDPRESS ARTICLE GENERATION & PINTEREST AUTOMATION`);
  console.log(`==========================================================================\n`);

  // 1. Fetch existing WordPress posts for contextual internal linking
  const existingPosts = await wordpress.fetchRecentPosts(20);
  
  // 2. Generate AEO, GEO, and SEO content using ArticleGenerator
  const generator = new ArticleGenerator(config);
  const article = await generator.generateArticle({
    topic,
    targetKeyword,
    category: category || "Recipes",
    existingPosts
  });

  // 3. Optimize image to WebP < 100KB with Alt Tag if image provided
  let featuredMediaId = null;
  if (sampleImagePath) {
    const webpImage = await generator.optimizeImageToWebP(
      sampleImagePath,
      article.slug,
      article.altText || article.title
    );

    // Upload WebP image to WordPress Media Library
    const mediaRes = await wordpress.uploadMediaBuffer(
      webpImage.buffer,
      webpImage.filename,
      article.altText,
      "image/webp"
    );
    featuredMediaId = mediaRes?.id;
    console.log(`✅ Uploaded WebP Featured Image to WP Media | Media ID: ${featuredMediaId}`);
  }

  // 4. Publish Post to WordPress REST API
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
  console.log(`\n🎉 WORDPRESS ARTICLE PUBLISHED LIVE!`);
  console.log(`📌 Post ID: ${publishedPost.id}`);
  console.log(`🔗 Link: ${publishedPost.link}`);

  // 5. Trigger Pinterest Engine to immediately discover, queue & render 3 pins!
  console.log(`\n📌 Triggering Pinterest Engine for newly published article...`);
  return publishedPost;
}
