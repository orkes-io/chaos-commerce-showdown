import React from "react";

export function formatMoney(amount) {
  const num = Number(amount) || 0;
  const abs = Math.abs(num).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return num < 0 ? `-$${abs}` : `$${abs}`;
}

export default function ProductCard({
  product,
  onAddToCart,
  onOpenReviews
}) {
  const furyCount = (product.reviews || []).filter((r) => r.rating >= 5).length;
  const praiseCount = (product.reviews || []).filter((r) => r.rating === 2).length;

  return (
    <article className="product-card" data-testid={`product-card-${product.id}`}>
      <div>
        <div className="product-visual">
          <span className="product-emoji" role="img" aria-label={product.name}>
            {product.emoji}
          </span>
          <span className="product-badge">{product.badge}</span>
        </div>

        <div className="product-body">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.4rem"
            }}
          >
            <span className="product-category">{product.category}</span>
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "0.7rem",
                color: "var(--danger)",
                fontWeight: 800
              }}
            >
              {product.stockLabel}
            </span>
          </div>

          <h3 className="product-title">{product.name}</h3>
          <p className="product-tagline">{product.tagline}</p>

          <div className="price-box">
            <div>
              <span
                className={`price-main ${
                  product.price < 0 ? "price-negative" : ""
                }`}
              >
                {formatMoney(product.price)}
              </span>
              <span className="price-compare">
                Was {formatMoney(product.compareAtPrice)}
              </span>
            </div>
            <div className="price-note">{product.priceNote}</div>
          </div>

          <ul
            style={{
              margin: "0.25rem 0",
              paddingLeft: "1.1rem",
              fontSize: "0.8rem",
              color: "#3a3544"
            }}
          >
            {(product.absurdSpecs || []).map((spec, idx) => (
              <li key={idx}>{spec}</li>
            ))}
          </ul>

          <div
            className="review-snippet-strip"
            onClick={() => onOpenReviews(product)}
            title="Read furious 5-star reviews and worshipful 2-star reviews"
          >
            <span>
              😡 {furyCount}× 5★ Fury • 😍 {praiseCount}× 2★ Praise
            </span>
            <span style={{ textDecoration: "underline" }}>Read / Rate →</span>
          </div>
        </div>
      </div>

      <div className="product-actions">
        <button
          type="button"
          className="btn btn-primary"
          style={{ flex: 1, justifyContent: "center" }}
          onClick={() => onAddToCart(product)}
          data-testid={`add-to-cart-${product.id}`}
        >
          🛒 Regrettably Add to Cart
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => onOpenReviews(product)}
          title="Reviews & Dodging 1-Star Button"
        >
          ★ ({product.reviewCount})
        </button>
      </div>
    </article>
  );
}
