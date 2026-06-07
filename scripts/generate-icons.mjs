import { createCanvas } from "canvas";
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#6366f1";
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${Math.round(size * 0.35)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("BW", size / 2, size / 2);

  return canvas.toBuffer("image/png");
}

writeFileSync(join(publicDir, "icon-192.png"), drawIcon(192));
writeFileSync(join(publicDir, "icon-512.png"), drawIcon(512));

console.log("Generated public/icon-192.png and public/icon-512.png");
