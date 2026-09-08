/**
 * Cloudflare Pages Edge Function: /bridge_page/
 * Server-Side Injects Schema.org Recipe Rich Pins JSON-LD and Meta Tags
 * Allows Pinterest Scraper & Search Crawlers to read Recipe Rich Pins
 * without executing client-side JavaScript.
 */
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const slug = url.searchParams.get("id");

  // Fetch the static HTML bridge template asset
  const assetResponse = await context.next();

  if (!slug) {
    return assetResponse;
  }

  let html = await assetResponse.text();

  try {
    const wpRes = await fetch(`https://el-mordjene.info/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_embed`);
    if (wpRes.ok) {
      const posts = await wpRes.json();
      if (Array.isArray(posts) && posts.length > 0) {
        const post = posts[0];
        const title = (post.title?.rendered || "").replace(/<[^>]*>/g, "").trim();
        let excerpt = (post.excerpt?.rendered || "").replace(/<[^>]*>/g, "").trim();
        if (!excerpt || excerpt.length < 20) {
          excerpt = (post.content?.rendered || "").replace(/<[^>]*>/g, "").slice(0, 160).trim();
        }

        let featuredImg = "";
        if (post._embedded?.["wp:featuredmedia"]?.[0]?.source_url) {
          featuredImg = post._embedded["wp:featuredmedia"][0].source_url;
        }

        // Look for embedded Recipe Schema in content
        let recipeSchema = null;
        const schemaMatches = post.content?.rendered?.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
        if (schemaMatches) {
          for (const match of schemaMatches) {
            try {
              const parsed = JSON.parse(match[1]);
              if (parsed["@type"] === "Recipe") {
                recipeSchema = parsed;
                break;
              }
            } catch (e) {}
          }
        }

        // Fallback recipe schema if post doesn't have embedded recipe JSON-LD
        if (!recipeSchema) {
          recipeSchema = {
            "@context": "https://schema.org",
            "@type": "Recipe",
            "name": title,
            "description": excerpt,
            "image": featuredImg ? [featuredImg] : [],
            "author": { "@type": "Organization", "name": "The Swavory Bites" },
            "prepTime": "PT15M",
            "cookTime": "PT20M",
            "totalTime": "PT35M",
            "recipeYield": "4 servings",
            "recipeCategory": "Dinner",
            "recipeIngredient": [
              "Fresh high-quality ingredients as detailed in full guide",
              "Pantry seasonings & chef-tested spices",
              "Signature glaze & homemade sauce"
            ],
            "recipeInstructions": [
              { "@type": "HowToStep", "text": "Follow the complete step-by-step culinary instructions on our journal." }
            ]
          };
        } else {
          if (featuredImg && (!recipeSchema.image || recipeSchema.image.length === 0)) {
            recipeSchema.image = [featuredImg];
          }
          recipeSchema.author = recipeSchema.author || { "@type": "Organization", "name": "The Swavory Bites" };
        }

        // Inject dynamic Title, Description, OG tags
        html = html.replace(/<title id="meta-title">[\s\S]*?<\/title>/i, `<title>${title} — The Swavory Bites</title>`);
        html = html.replace(/<meta name="description" id="meta-desc" content="[^"]*">/i, `<meta name="description" id="meta-desc" content="${excerpt.replace(/"/g, '&quot;')}">`);
        html = html.replace(/<meta property="og:title" id="og-title" content="[^"]*">/i, `<meta property="og:title" id="og-title" content="${title.replace(/"/g, '&quot;')}">`);
        html = html.replace(/<meta property="og:description" id="og-desc" content="[^"]*">/i, `<meta property="og:description" id="og-desc" content="${excerpt.replace(/"/g, '&quot;')}">`);
        if (featuredImg) {
          html = html.replace(/<meta property="og:image" id="og-img" content="[^"]*">/i, `<meta property="og:image" id="og-img" content="${featuredImg}">`);
        }

        // Replace the placeholder schema with the actual recipeSchema
        const recipeSchemaJson = JSON.stringify(recipeSchema, null, 2);
        html = html.replace(/<script id="schema-recipe" type="application\/ld\+json">[\s\S]*?<\/script>/i, `<script id="schema-recipe" type="application/ld+json">\n${recipeSchemaJson}\n</script>`);

        return new Response(html, {
          headers: {
            "content-type": "text/html;charset=UTF-8",
            "cache-control": "public, max-age=3600, s-maxage=86400"
          }
        });
      }
    }
  } catch (err) {
    // If external fetch fails, safely return the base HTML
  }

  return new Response(html, {
    headers: {
      "content-type": "text/html;charset=UTF-8"
    }
  });
}
