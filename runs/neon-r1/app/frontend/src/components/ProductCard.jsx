import React from "react";
import { ProductIcon } from "./ProductIcon.jsx";
import { formatUsd } from "../api.js";

export function ProductCard({ product, onAddToCart, onInspect }) {
  const furyReview = product.reviews.find((r) => r.rating === 5);
  const blissReview = product.reviews.find((r) => r.rating === 2);

  return (
    <article className="product-card">
      <div
        className="product-art"
        style={{ background: `${product.accent}22`, cursor: "pointer" }}
        onClick={() => onInspect(product)}
      >
        <span className="product-badge">{product.badge}</span>
        <ProductIcon type={product.icon} accent={product.accent} />
        <span className="product-sku">{product.sku}</span>
      </div>

      <div className="product-body">
        <div className="product-category">{product.category}</div>
        <h3 className="product-name">{product.name}</h3>
        <p className="product-tagline">{product.tagline}</p>

        <div className="price-block">
          <span className="price-now">{formatUsd(product.price)}</span>
          <span className="price-was">{formatUsd(product.wasPrice)}</span>
        </div>

        <div className="stock-warning">⚠️ {product.stockText}</div>

        <div className="review-teaser">
          {furyReview && (
            <div className="review-teaser-line">
              <span className="stars-5">★★★★★</span>
              <span>&ldquo;{furyReview.title}&rdquo;</span>
            </div>
          )}
          {blissReview && (
            <div className="review-teaser-line">
              <span className="stars-2">★★☆☆☆</span>
              <span>&ldquo;{blissReview.title}&rdquo;</span>
            </div>
          )}
        </div>

        <div className="card-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onAddToCart(product)}
          >
            + Add to Cart
          </button>
          <button
            type="button"
            className="btn btn-yellow"
            onClick={() => onInspect(product)}
          >
            Reviews ({product.reviews.length})
          </button>
        </div>
      </div>
    </article>
  );
}
