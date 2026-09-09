import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { escapeHtml, wrapText } from "../templates/svg-text.js";

const THEMES = {
  recipe: { accent: "#d87439", text: "#ffffff", shadow: "rgba(0,0,0,0.8)" },
  baking: { accent: "#d4af37", text: "#ffffff", shadow: "rgba(0,0,0,0.8)" },
  drink: { accent: "#2d9e64", text: "#ffffff", shadow: "rgba(0,0,0,0.8)" },
  fruit: { accent: "#e8633a", text: "#ffffff", shadow: "rgba(0,0,0,0.8)" },
  spread: { accent: "#b8860b", text: "#ffffff", shadow: "rgba(0,0,0,0.8)" },
  trend: { accent: "#cb6e45", text: "#ffffff", shadow: "rgba(0,0,0,0.8)" },
  quick: { accent: "#2e7fc0", text: "#ffffff", shadow: "rgba(0,0,0,0.8)" }
};

export async function renderAsset(asset, config) {
  const theme = THEMES[asset.contentType] || THEMES.recipe;
  const fileName = `${asset.postSlug || asset.postId}-${asset.variant}.jpg`;
  const outputPath = path.join(config.assetsDir, "pinterest", fileName);
  const overlayStyle = asset.overlayStyle || process.env.PIN_OVERLAY_STYLE || "minimal_luxury";

  let visualBuffer = await loadImageBuffer(asset.imageSourceUrl || asset.featuredImage);

  // If remote buffer is empty, search local assets directory for matching post food photo
  if (!visualBuffer) {
    const candidateFiles = [
      `${asset.postSlug}-hero.jpg`,
      `${asset.postSlug}.jpg`,
      `${asset.postSlug}.webp`,
      `temp-${asset.postSlug}.jpg`,
      "classic-homemade-peach-crisp-recipe-hero.jpg",
      "creamy-30-minute-marry-me-chicken-budget-hero.jpg"
    ];

    for (const cand of candidateFiles) {
      const candPath = path.join(config.assetsDir, "pinterest", cand);
      try {
        const stats = await fs.stat(candPath);
        if (stats.size > 30000) {
          visualBuffer = await fs.readFile(candPath);
          console.log(`🖼️ Resolved food photo fallback from local asset: ${cand}`);
          break;
        }
      } catch {}
    }
  }

  if (!visualBuffer) {
    throw new Error(`CRITICAL: Cannot render pin for "${asset.id}" — No valid food photo found. Blank pins are forbidden.`);
  }

  await fs.mkdir(path.join(config.assetsDir, "pinterest"), { recursive: true });

  // 1. Prepare base 1000x1500 vertical food photo with appetizing color pop
  const baseImageBuffer = await sharp(visualBuffer)
    .resize(1000, 1500, { fit: "cover", position: "attention" })
    .modulate({ saturation: 1.08, brightness: 1.02 })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();

  // 2. Return clean photo if clean_photo style requested
  if (overlayStyle === "clean_photo") {
    await sharp(baseImageBuffer).toFile(outputPath);
    return outputPath;
  }

  // 3. Render High-CTR Top Luxury Badge Typography Overlay
  const overlaySvg = buildTopBadgeOverlay(asset, theme);

  await sharp(baseImageBuffer)
    .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(outputPath);

  return outputPath;
}

function cleanTypography(str) {
  if (!str) return "";
  return str
    .replace(/&#8217;|&#8216;|&rsquo;|&lsquo;/g, "'")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&ndash;|&mdash;|&#8211;|&#8212;/g, "-")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildTopBadgeOverlay(asset, theme) {
  const rawTitle = cleanTypography(asset.overlayTitle || asset.pinTitle || "");
  const rawSubtitle = cleanTypography(asset.overlaySubtitle || "");

  // Format main title into punchy lines (max 18 chars per line)
  const titleLines = wrapText(rawTitle, 18, 3);
  
  const boxWidth = 840;
  const boxX = (1000 - boxWidth) / 2; // 80px margin on each side
  const boxY = 80;
  
  // Calculate dynamic box height based on subtitle and title lines
  const hasSubtitle = rawSubtitle && rawSubtitle.length > 2 && rawSubtitle.length < 35;
  const lineSpacing = 68;
  const contentHeight = (hasSubtitle ? 65 : 15) + titleLines.length * lineSpacing + 40;
  const boxHeight = Math.max(160, contentHeight);

  // Render subtitle badge if present
  let subtitleSvg = "";
  let titleStartY = boxY + 70;

  if (hasSubtitle) {
    const cleanSub = escapeHtml(rawSubtitle.toUpperCase());
    const pillWidth = Math.min(760, Math.max(260, cleanSub.length * 15 + 50));
    const pillX = -pillWidth / 2;
    subtitleSvg = `
      <g transform="translate(500, ${boxY + 46})">
        <rect x="${pillX}" y="-20" width="${pillWidth}" height="40" rx="20" fill="#d4af37" />
        <text x="0" y="7" text-anchor="middle" font-size="20" font-family="'Outfit', sans-serif" font-weight="900" fill="#1f1612" letter-spacing="2">
          ${cleanSub}
        </text>
      </g>
    `;
    titleStartY = boxY + 125;
  }

  // Render title lines
  const titleSvg = titleLines
    .map((line, i) => {
      const y = titleStartY + i * lineSpacing;
      return `
        <text x="500" y="${y}" text-anchor="middle" font-size="58" font-family="'Playfair Display', Georgia, serif" fill="#ffffff" font-weight="900" filter="url(#dropShadow)">
          ${escapeHtml(line)}
        </text>
      `;
    })
    .join("");

  return `
    <svg width="1000" height="1500" viewBox="0 0 1000 1500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.8"/>
        </filter>
        <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="12" stdDeviation="24" flood-color="#000000" flood-opacity="0.45"/>
        </filter>
        <!-- Subtle Top Gradient for natural blend -->
        <linearGradient id="topGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(20, 12, 10, 0.45)" />
          <stop offset="100%" stop-color="transparent" />
        </linearGradient>
      </defs>

      <!-- Soft top ambient vignette -->
      <rect x="0" y="0" width="1000" height="480" fill="url(#topGlow)"/>

      <!-- Floating High-End Luxury Badge (Upper-Third) -->
      <g filter="url(#cardShadow)">
        <rect x="${boxX}" y="${boxY}" width="${boxWidth}" height="${boxHeight}" rx="28" fill="rgba(25, 16, 14, 0.88)" stroke="rgba(212, 175, 55, 0.5)" stroke-width="2.5" />
      </g>

      ${subtitleSvg}
      ${titleSvg}
    </svg>
  `;
}

async function loadImageBuffer(url) {
  if (!url) return null;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "User-Agent": "TheSwavoryBites-Agent/1.0"
      }
    });

    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}
