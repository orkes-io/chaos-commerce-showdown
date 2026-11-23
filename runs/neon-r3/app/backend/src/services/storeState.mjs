import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getConfig } from '../config.mjs';
import { PRODUCTS } from '../data/catalog.mjs';

const userReviewsByProduct = new Map();
let loadedFromDisk = false;

function getReviewsFilePath() {
  const { dataDir } = getConfig();
  return path.join(dataDir, 'reviews.json');
}

function ensureLoaded() {
  if (loadedFromDisk) return;
  loadedFromDisk = true;
  try {
    const filePath = getReviewsFilePath();
    if (!fs.existsSync(filePath)) return;
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (parsed && typeof parsed === 'object') {
      for (const [productId, list] of Object.entries(parsed)) {
        if (Array.isArray(list)) {
          userReviewsByProduct.set(productId, list);
        }
      }
    }
  } catch {
    // Safe fallback to in-memory only (e.g. read-only Lambda environment)
  }
}

function persistReviews() {
  try {
    const filePath = getReviewsFilePath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const obj = Object.fromEntries(userReviewsByProduct.entries());
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf8');
  } catch {
    // Ignore write failures in ephemeral/read-only runtimes
  }
}

function computeProductWithReviews(product) {
  ensureLoaded();
  const extra = userReviewsByProduct.get(product.id) || [];
  const reviews = [...extra, ...product.reviews];
  const avgRating =
    reviews.length > 0
      ? Math.round((reviews.reduce((sum, r) => sum + Number(r.rating || 5), 0) / reviews.length) * 10) / 10
      : 5.0;
  return {
    ...product,
    reviews,
    reviewCount: reviews.length,
    averageRating: avgRating,
  };
}

export function getAllProducts() {
  return PRODUCTS.map(computeProductWithReviews);
}

export function getProductById(productId) {
  const found = PRODUCTS.find((p) => p.id === productId);
  return found ? computeProductWithReviews(found) : null;
}

export function addProductReview(productId, { author, rating, title, body, dodgesSurvived = 0 }) {
  ensureLoaded();
  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) {
    return null;
  }

  const parsedRating = Math.max(1, Math.min(5, Math.round(Number(rating) || 5)));
  const cleanAuthor = String(author || 'Anonymous Victim').trim().slice(0, 60) || 'Anonymous Victim';
  const cleanTitle = String(title || 'No words, only chaos').trim().slice(0, 120) || 'No words, only chaos';
  const cleanBody = String(body || '').trim().slice(0, 1000);

  const review = {
    id: `rev-user-${crypto.randomBytes(4).toString('hex')}`,
    author: cleanAuthor,
    rating: parsedRating,
    title: cleanTitle,
    body: cleanBody || 'Left speechless by the sheer audacity of this storefront.',
    date: new Date().toISOString().slice(0, 10),
    verified: true,
    helpfulCount: 1,
    badge:
      parsedRating === 1
        ? 'Caught the 1-Star Button (Suspected Witchcraft)'
        : dodgesSurvived > 0
          ? `Chased 1★ Button ${dodgesSurvived}x Before Surrendering`
          : undefined,
  };

  const existing = userReviewsByProduct.get(productId) || [];
  userReviewsByProduct.set(productId, [review, ...existing]);
  persistReviews();
  return review;
}
