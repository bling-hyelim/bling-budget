#!/usr/bin/env node
/**
 * 앱 아이콘 생성 스크립트
 *
 * 사용법:
 *   1) public/icons/icon.svg 를 본인 디자인으로 교체
 *   2) npm install sharp --save-dev
 *   3) node scripts/generate-icons.mjs
 */

import sharp from "sharp";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const iconsDir = join(root, "public", "icons");

if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

const sources = [
  { src: "icon.svg",          out: "icon-192.png",          size: 192 },
  { src: "icon.svg",          out: "icon-512.png",          size: 512 },
  { src: "icon-maskable.svg", out: "icon-512-maskable.png", size: 512 },
  { src: "icon.svg",          out: "apple-touch-icon.png",  size: 180 },
  { src: "icon.svg",          out: "favicon.png",           size: 32  },
];

for (const { src, out, size } of sources) {
  const srcPath = join(iconsDir, src);
  const outPath = join(iconsDir, out);
  const buffer = readFileSync(srcPath);
  await sharp(buffer).resize(size, size).png().toFile(outPath);
  console.log(`✓ ${out} (${size}x${size})`);
}
