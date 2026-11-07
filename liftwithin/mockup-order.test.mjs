import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { leadingImage, mockupImageUrls, mockupRank, orderedImageUrls } from "./mockup-order.js";

const shared = new URL("../supabase/functions/_shared/mockup-order.js", import.meta.url);
test("edge helper matches the shop module", () => {
  assert.equal(readFileSync(shared, "utf8"), readFileSync(new URL("./mockup-order.js", import.meta.url), "utf8"));
});

test("front mockups lead and backs go last, other views stay in order", () => {
  const urls = orderedImageUrls([
    "img/tee-black-back.webp",
    "img/tee-black-front-2.webp",
    "img/tee-detail.webp",
    "img/tee-black-front.webp",
    "img/tee-left-front.webp",
    "img/tee-right-back.webp",
    "img/tee-right.webp",
  ]);
  assert.deepEqual(urls, [
    "img/tee-black-front-2.webp",
    "img/tee-black-front.webp",
    "img/tee-left-front.webp",
    "img/tee-detail.webp",
    "img/tee-right.webp",
    "img/tee-black-back.webp",
    "img/tee-right-back.webp",
  ]);
});

test("a plain back mockup does not lead when the Printful preview carries the design", () => {
  const printful = "https://files.cdn.printful.com/files/d1a/d1ae1f5319cf2305c9b96cb3d55ad3a2_preview.png";
  const back = "/liftwithin/img/mockups/unisex-fine-jersey-t-shirt-black-back-6aeb671b88f7b.webp";
  const items = [
    { url: back, color: "Black" },
    { url: printful, color: "Black" },
  ];
  assert.equal(orderedImageUrls(items)[0], printful);
  assert.equal(leadingImage(items, "Black"), printful);
  assert.equal(mockupRank(back), 2);
  assert.equal(mockupRank(printful), 1);
});

test("list cards keep a Black front ahead of another color's front", () => {
  const items = [
    { url: "/liftwithin/img/mockups/unisex-tee-navy-front.webp", color: "Navy" },
    { url: "/liftwithin/img/mockups/unisex-tee-black-back.webp", color: "Black" },
    { url: "/liftwithin/img/mockups/unisex-tee-black-front.webp", color: "Black" },
  ];
  assert.equal(leadingImage(items, "Black"), "/liftwithin/img/mockups/unisex-tee-black-front.webp");
});

test("background is not treated as a back view", () => {
  assert.equal(mockupRank("img/background-texture.webp"), 1);
});

test("Printful preview files: front placement before an unlabeled preview, back filename last", () => {
  const urls = mockupImageUrls([
    { type: "preview", filename: "shirt-back.png", preview_url: "https://cdn.example/back.png" },
    { type: "preview", preview_url: "https://cdn.example/hash_preview.png" },
    { type: "preview", placement: "front", preview_url: "https://cdn.example/front.png" },
    { type: "default", filename: "logo.png", preview_url: "https://cdn.example/logo.png", url: "https://cdn.example/logo.pdf" },
  ]);
  assert.deepEqual(urls, [
    "https://cdn.example/front.png",
    "https://cdn.example/hash_preview.png",
    "https://cdn.example/back.png",
  ]);
});

test("a garment preview is not replaced by the flat print file", () => {
  const urls = mockupImageUrls([
    { type: "default", filename: "lw-logo.png", preview_url: "https://cdn.example/logo.png" },
    { type: "preview", preview_url: "https://cdn.example/garment.png" },
  ]);
  assert.deepEqual(urls, ["https://cdn.example/garment.png"]);
});

test("when every mockup is a back, the print file leads", () => {
  const urls = mockupImageUrls([
    { type: "preview", filename: "tee-back.png", preview_url: "https://cdn.example/back.png" },
    { type: "default", filename: "lw-logo.png", preview_url: "https://cdn.example/logo.png" },
    { type: "back", filename: "no-art.png", preview_url: "https://cdn.example/back-print.png" },
  ]);
  assert.deepEqual(urls, ["https://cdn.example/logo.png", "https://cdn.example/back.png"]);
});

test("option values that say front outrank an unlabeled preview", () => {
  const urls = mockupImageUrls([
    { type: "preview", preview_url: "https://cdn.example/a.png" },
    { type: "preview", preview_url: "https://cdn.example/b.png", options: [{ id: "template_type", value: "front" }] },
  ]);
  assert.deepEqual(urls, ["https://cdn.example/b.png", "https://cdn.example/a.png"]);
});

test("front_large print placement counts as front", () => {
  assert.equal(mockupRank({ type: "front_large", filename: "art.png", preview_url: "https://cdn.example/art.png" }), 0);
});
