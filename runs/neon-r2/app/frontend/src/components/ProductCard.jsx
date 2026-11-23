import React from "react";
import { Flame, Heart, MessageSquareWarning, ShoppingBag, Star } from "lucide-react";

export default function ProductCard({ product, onInspect, onAddToCart }) {
  const furiousFive = product.reviews.find((r) => r.rating === 5);
  const praisingTwo = product.reviews.find((r) => r.rating === 2);

  return (
    <article className="product-card" data-testid={`product-card-${product.id}`}>
      <div className="discount-sticker">{product.discountBadge}</div>

      <div
        className="product-visual"
        style={{ backgroundColor: product.bgTint, borderColor: product.accent }}
        onClick={() => onInspect(product)}
      >
        <span className="product-emoji" role="img" aria-label={product.title}>
          {product.emoji}
        </span>
        <span className="category-chip">{product.category}</span>
      </div>

      <div className="product-body">
        <div className="product-sku-row">
          <span className="sku-text">{product.sku}</span>
          <span className="stock-warning">{product.stockStatus}</span>
        </div>

        <h3 className="product-title" onClick={() => onInspect(product)}>
          {product.title}
        </h3>
        <p className="product-tagline">{product.tagline}</p>

        <div className="price-block">
          <span className="was-price">WAS ${product.wasPrice.toFixed(2)}</span>
          <span className="now-price">
            ${product.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="regret-meter">
          <Flame size={14} />
          <span>{product.regretCounter.toLocaleString()} shoppers currently regretting this</span>
        </div>

        {/* Inverted Review Teaser: Furious 5★ + Glowing 2★ */}
        <div className="review-preview-box" onClick={() => onInspect(product)}>
          {furiousFive && (
            <div className="mini-review mini-review-fury">
              <span className="mini-stars">
                <Star size={12} fill="currentColor" /> 5★ FURY:
              </span>{" "}
              &ldquo;{furiousFive.title}&rdquo;
            </div>
          )}
          {praisingTwo && (
            <div className="mini-review mini-review-praise">
              <span className="mini-stars-two">
                <Heart size={12} fill="currentColor" /> 2★ PRAISE:
              </span>{" "}
              &ldquo;{praisingTwo.title}&rdquo;
            </div>
          )}
        </div>

        <div className="card-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onInspect(product)}
            data-testid={`inspect-${product.id}`}
          >
            <MessageSquareWarning size={15} /> Reviews ({product.reviews.length})
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => onAddToCart(product)}
            data-testid={`add-cart-${product.id}`}
          >
            <ShoppingBag size={15} /> Add to Cart
          </button>
        </div>
      </div>
    </article>
  );
}
