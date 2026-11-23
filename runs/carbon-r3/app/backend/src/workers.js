import {
  PRODUCTS,
  SHIPPING_METHODS,
  PAYMENT_METHODS,
  PROMO_CODES
} from "./catalog.js";

function roundCurrency(num) {
  return Math.round((Number(num) || 0) * 100) / 100;
}

function stableHash(str) {
  const s = String(str || "chaos");
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

export function computeAbsurdPricing({ orderId, items, promoCode, shippingMethod }) {
  const safeItems = Array.isArray(items) && items.length > 0
    ? items
    : [
        {
          id: "chewed-paperclip-2019",
          name: "Artisanal Pre-Chewed Paperclip (Emergency Fallback Item)",
          price: 49999.99,
          quantity: 1
        }
      ];

  let subtotal = 0;
  let negativeItemCount = 0;
  let totalQuantity = 0;

  const normalizedItems = safeItems.map((raw) => {
    const catalogMatch = PRODUCTS.find((p) => p.id === raw.id);
    const unitPrice = Number.isFinite(Number(raw.price))
      ? Number(raw.price)
      : catalogMatch
      ? catalogMatch.price
      : 99.99;
    const qty = Math.max(1, Math.min(999, Math.round(Number(raw.quantity) || 1)));
    const lineTotal = roundCurrency(unitPrice * qty);
    subtotal = roundCurrency(subtotal + lineTotal);
    totalQuantity += qty;
    if (unitPrice < 0) {
      negativeItemCount += qty;
    }
    return {
      id: raw.id || "mystery-sku",
      name: raw.name || catalogMatch?.name || "Unidentified Warehouse Object",
      unitPrice,
      quantity: qty,
      lineTotal
    };
  });

  const shipObj =
    SHIPPING_METHODS[shippingMethod] || SHIPPING_METHODS.blindfolded_pigeon;
  const shippingFee = roundCurrency(shipObj.fee);

  const chaosFees = [
    {
      name: "Existential Dread & Electrons Surcharge",
      amount: 14.88,
      reason: "Covers server sighing while rendering your cart."
    },
    {
      name: "Gravity Compliance Tariff",
      amount: roundCurrency(4.25 * totalQuantity),
      reason: "Keeps items from floating off the warehouse floor."
    },
    {
      name: "Fee For Calculating Previous Two Fees",
      amount: 6.66,
      reason: "Math hurts our feelings."
    }
  ];

  if (negativeItemCount > 0) {
    chaosFees.push({
      name: "Negative-Price Containment Hazard Surcharge",
      amount: roundCurrency(199.99 * negativeItemCount),
      reason: "Triggered because you tried to make us pay YOU -$14.99."
    });
  }

  if (subtotal < 1 && subtotal >= 0) {
    chaosFees.push({
      name: "Suspiciously Cheap Aerospace Oversize Curb-Drop Fee",
      amount: 249.5,
      reason: "Three-cent airplane wings still require a wide-load permit."
    });
  }

  let promoAdjustment = 0;
  let promoCommentary = "No promo code entered (wise move — our coupons only raise prices).";
  const cleanPromo = String(promoCode || "").trim().toUpperCase();

  if (cleanPromo) {
    const knownPromo = PROMO_CODES[cleanPromo];
    if (knownPromo) {
      if (knownPromo.type === "percent_hike") {
        promoAdjustment = roundCurrency(Math.max(5, Math.abs(subtotal) * knownPromo.value));
      } else {
        promoAdjustment = roundCurrency(knownPromo.value);
      }
      promoCommentary = `${knownPromo.code}: ${knownPromo.description} (+$${promoAdjustment.toFixed(2)})`;
    } else {
      promoAdjustment = 7.77;
      promoCommentary = `Unrecognized promo '${cleanPromo}' interpreted as a mandatory +$7.77 Tip to the Billing Hamster.`;
    }
  }

  const feesTotal = roundCurrency(
    chaosFees.reduce((acc, f) => acc + f.amount, 0)
  );
  const rawGrandTotal = roundCurrency(
    subtotal + shippingFee + feesTotal + promoAdjustment
  );
  const grandTotal = rawGrandTotal <= 0 ? 19.99 : rawGrandTotal;

  if (rawGrandTotal <= 0) {
    chaosFees.push({
      name: "Nice-Try Floor Enforcement Adjustment",
      amount: roundCurrency(19.99 - rawGrandTotal),
      reason: "Our CFO refuses to owe shoppers actual money."
    });
  }

  return {
    orderId: orderId || "PREVIEW",
    normalizedItems,
    subtotal,
    shippingMethodName: shipObj.name,
    shippingFee,
    promoCode: cleanPromo || null,
    promoAdjustment,
    chaosFees,
    feesTotal: roundCurrency(chaosFees.reduce((acc, f) => acc + f.amount, 0)),
    grandTotal,
    currency: "USD",
    pricingCommentary: promoCommentary
  };
}

const WAREHOUSE_AISLES = [
  "Aisle 9¾ (Partially Flooded With Lukewarm Broth)",
  "Sub-Basement Vault B (Behind the Angry Vending Machine)",
  "CEO's Mother-in-Law's Garage, Bay 2",
  "Mezzanine of Forgotten Tax Documents"
];

const GOBLIN_SUPERVISORS = [
  "Snargle the OSHA-Exempt",
  "Deputy Forklift Wizard Kevin",
  "Grimtooth (Intern of the Month, 1998)",
  "Mildred from Haunted Receiving"
];

const DEPARTMENTS_BY_ITERATION = [
  {
    department: "Sub-Committee on Buyer's Remorse & Damp Envelopes",
    inkColor: "Bureaucratic Beige",
    clerkRemark: "Form smelled faintly of hope; stamped sideways with extreme prejudice."
  },
  {
    department: "Ministry of Unopened Yet Somehow Broken Artifacts",
    inkColor: "Passive-Aggressive Magenta",
    clerkRemark: "Verified staple angle is 3.2° off-kilter; begrudgingly initialed."
  },
  {
    department: "Grand Inquisitor of Missing Plastic Twist-Ties",
    inkColor: "florescing Chartreuse",
    clerkRemark: "Counted 0 twist-ties; sighed loudly for 11 seconds before stamping."
  },
  {
    department: "Supreme Deputy Vice-Clerk of Arbitrary Rubber Stamps",
    inkColor: "Midnight Squid Ink",
    clerkRemark: "Dropped stamp on floor twice, blew dust off, stamped upside down."
  }
];

export const WORKER_HANDLERS = {
  async calculate_absurd_pricing(inputData = {}) {
    return computeAbsurdPricing(inputData);
  },

  async interrogate_warehouse_goblins(inputData = {}) {
    const orderId = String(inputData.orderId || "ORD-UNKNOWN");
    const h = stableHash(orderId);
    const items = Array.isArray(inputData.items) ? inputData.items : [];

    const allocations = items.map((item, idx) => ({
      itemName: item.name || item.id || `Mystery Parcel #${idx + 1}`,
      quantity: Math.max(1, Number(item.quantity) || 1),
      conditionNote:
        idx % 2 === 0
          ? "Located under a sleeping raccoon; dusted off with a broom."
          : "Substituted with an identical-looking cursed twin from bin #404."
    }));

    return {
      allocationStatus: "ALLOCATED_DESPITE_CHAOS",
      warehouseAisle: WAREHOUSE_AISLES[h % WAREHOUSE_AISLES.length],
      goblinShiftSupervisor: GOBLIN_SUPERVISORS[h % GOBLIN_SUPERVISORS.length],
      allocations,
      incidentReport:
        "Zero items escaped containment during picking (one forklift mildly singed)."
    };
  },

  async settle_chaotic_payment(inputData = {}) {
    const orderId = String(inputData.orderId || "ORD-UNKNOWN");
    const methodKey = String(inputData.paymentMethod || "guessed_card");
    const methodInfo = PAYMENT_METHODS[methodKey] || {
      id: methodKey,
      name: "Unverified Shoebox Tender",
      settlementNote:
        "Conventional banking blinked, so Chaos Commerce activated its Unconditional Store IOU Guarantee."
    };
    const h = stableHash(`${orderId}:${methodKey}`);
    const txId = `CHAOS-TX-${h.toString(16).toUpperCase().padStart(8, "0")}`;

    return {
      paymentStatus: "CAPTURED_IRREVOCABLY",
      transactionId: txId,
      authorizedBy: "Chaos Treasury Autonomous Abacus v1.2",
      settlementMethodUsed: methodInfo.name,
      amountSettled: Number(inputData.grandTotal) || 19.99,
      currency: inputData.currency || "USD",
      settlementNote: methodInfo.settlementNote
    };
  },

  async dispatch_absurd_shipment(inputData = {}) {
    const orderId = String(inputData.orderId || "ORD-UNKNOWN");
    const shipKey = String(inputData.shippingMethod || "blindfolded_pigeon");
    const shipInfo =
      SHIPPING_METHODS[shipKey] || SHIPPING_METHODS.blindfolded_pigeon;
    const h = stableHash(`${orderId}:${shipKey}:ship`);
    const trackingNumber = `CHAOS-TRK-${h.toString(36).toUpperCase().slice(0, 7)}`;

    return {
      dispatchStatus: "LAUNCHED_TOWARD_GENERAL_VICINITY",
      trackingNumber,
      carrierName: shipInfo.name,
      estimatedArrival: shipInfo.eta,
      dispatchManifestNote: `${shipInfo.note} Bonus included in box: ${
        inputData.chaosPerk || "1x Judgmental Sticky Note"
      }.`
    };
  },

  async check_lunar_and_astrology_compliance(inputData = {}) {
    const moon = String(inputData.moonExposure || "no_curtains_drawn");
    const astrology = String(inputData.astrologyExcuse || "mercury_retrograde");

    let points = 24;
    let note =
      "Item maintained respectful eye contact avoidance with the waxing gibbous moon.";
    if (moon === "howled_first") {
      points = 32;
      note =
        "Bonus points awarded because the item howled at the moon first (known factory defect).";
    } else if (moon === "yes_briefly") {
      points = 16;
      note =
        "8 lunar demerits assessed for brief moonlight exposure without SPF-5000 foil.";
    }

    if (astrology === "mercury_retrograde") {
      points += 4;
      note += " Mercury-in-Retrograde waiver grudgingly recognized.";
    }

    return {
      checkName: "Lunar Exposure & Celestial Alibi Audit",
      passed: points >= 20,
      points,
      lunarCoefficient: `${(points * 1.37).toFixed(1)} milli-werewolves`,
      bureaucraticNote: note
    };
  },

  async analyze_packaging_emotional_state(inputData = {}) {
    const emotion = String(inputData.boxEmotionalState || "quietly_weeping");
    const apologized = Boolean(inputData.apologizedToBubbleWrap);

    const scoresByEmotion = {
      emotionally_stable: 30,
      quietly_weeping: 24,
      deeply_betrayed: 18,
      vengeful: 10
    };
    const basePoints = scoresByEmotion[emotion] ?? 20;
    const points = basePoints + (apologized ? 6 : 0);

    return {
      checkName: "Cardboard Box Psychological Trauma Screening",
      passed: points >= 22,
      points,
      cardboardGriefIndex: `${100 - points}/100 Sob Units`,
      bureaucraticNote: apologized
        ? `Box reported feeling '${emotion.replace(/_/g, " ")}', mitigated by shopper's formal apology to the bubble wrap.`
        : `Box reported feeling '${emotion.replace(/_/g, " ")}' AND shopper refused to apologize to the bubble wrap.`
    };
  },

  async verify_backward_haiku_and_lint(inputData = {}) {
    const blinkCount = Math.abs(Math.round(Number(inputData.blinkCount) || 0));
    const backward = String(inputData.backwardDeclaration || "").trim().toUpperCase();
    const sworn = Boolean(inputData.swornNotSimultaneouslyTuesdayAndThursday);
    const h = stableHash(`${inputData.returnId}:${backward}`);
    const imaginaryLintCount = h % 19;

    let points = 10;
    const notes = [];

    if (backward.includes("DNUFER")) {
      points += 14;
      notes.push("Exact backward 'DNUFER' incantation verified");
    } else if (backward.length >= 4) {
      points += 7;
      notes.push(`Close-enough gibberish ('${backward.slice(0, 16)}') accepted with a loud sigh`);
    } else {
      notes.push("Failed to spell REFUND backwards");
    }

    if (blinkCount % 2 === 1) {
      points += 8;
      notes.push(`Odd unboxing blink count (${blinkCount}) satisfies Odd-Eyelid Statute`);
    } else {
      notes.push(`Even blink count (${blinkCount}) frowned upon by Optics Clerk`);
    }

    if (sworn) {
      points += 4;
      notes.push("Non-simultaneous Tuesday/Thursday oath notarized");
    }

    return {
      checkName: "Backward Spelling, Blink Parity & Imaginary Lint Inspection",
      passed: points >= 22,
      points,
      imaginaryLintCount,
      bureaucraticNote: `${notes.join("; ")}. Detected ${imaginaryLintCount} imaginary lint particles.`
    };
  },

  async apply_bureaucratic_rubber_stamp(inputData = {}) {
    const iter = Math.max(1, Math.min(4, Number(inputData.iteration) || 1));
    const dept =
      DEPARTMENTS_BY_ITERATION[(iter - 1) % DEPARTMENTS_BY_ITERATION.length];
    return {
      stampNumber: iter,
      department: dept.department,
      inkColor: dept.inkColor,
      clerkRemark: dept.clerkRemark,
      stampedAt: new Date().toISOString()
    };
  },

  async adjudicate_final_return_decision(inputData = {}) {
    const returnId = String(inputData.returnId || `RET-${Date.now()}`);
    const itemPrice = Math.abs(Number(inputData.itemPrice) || 49.99);
    const h = stableHash(returnId);
    const rmaNumber = `RMA-CHAOS-${h.toString(36).toUpperCase().slice(0, 6)}`;

    const loopOut = inputData.rubberStampLoopOutput || {};
    const stampsTrail = [];
    for (let i = 1; i <= 4; i += 1) {
      const iterEntry = loopOut[String(i)];
      const stepOut =
        iterEntry?.rubber_stamp_step_ref?.output ||
        iterEntry?.rubber_stamp_step_ref ||
        null;
      if (stepOut && stepOut.department) {
        stampsTrail.push(stepOut);
      }
    }
    if (stampsTrail.length === 0) {
      stampsTrail.push({
        stampNumber: 1,
        department: DEPARTMENTS_BY_ITERATION[0].department,
        inkColor: DEPARTMENTS_BY_ITERATION[0].inkColor,
        clerkRemark: DEPARTMENTS_BY_ITERATION[0].clerkRemark,
        stampedAt: new Date().toISOString()
      });
    }

    const recommended = String(
      inputData.recommendedDecision || "APPROVED_CHAOS_STORE_CREDIT"
    );
    const dossier = inputData.dossier || {};
    const checks = Array.isArray(dossier.checks) ? dossier.checks : [];

    let decision = recommended;
    let verdictTitle = "";
    let verdictSummary = "";
    let refundAmount = 0;
    let storeCreditAmount = 0;
    let consolationCoupon = null;

    if (decision === "APPROVED_FULL_REFUND") {
      refundAmount = roundCurrency(itemPrice);
      verdictTitle = "MIRACLE VERDICT: FULL REFUND APPROVED!";
      verdictSummary = `${
        inputData.tribunalDecree ||
        "All pointless planetary and cardboard-emotion criteria aligned."
      } Refunding $${refundAmount.toFixed(2)} in 3 to 9,000 business Tuesdays.`;
    } else if (decision === "APPROVED_CHAOS_STORE_CREDIT") {
      storeCreditAmount = roundCurrency(itemPrice * 1.15);
      consolationCoupon = "FREE-APOLOGY-PEBBLE";
      verdictTitle = "DECISION REACHED: APPROVED FOR 115% CHAOS STORE CREDIT!";
      verdictSummary = `${
        inputData.tribunalDecree ||
        "Clerks grew exhausted halfway through Stamp #2 and granted generous store credit."
      } Issued $${storeCreditAmount.toFixed(2)} in Chaos Bucks + 1 Complimentary Apology Pebble.`;
    } else {
      decision = "REJECTED_BUREAUCRATIC_TECHNICALITY";
      consolationCoupon = "SORRY15-EMOTIONAL-DAMAGE";
      verdictTitle =
        "DECISION REACHED: DENIED ON POINTLESS TECHNICALITY (+ SYMPATHY PRIZE)";
      verdictSummary = `${
        inputData.tribunalDecree ||
        "Denied because packaging cried in B-flat instead of C-minor."
      } Return closed with finality; $15.00 Sympathy Coupon (${consolationCoupon}) issued to soften the absurdity.`;
    }

    return {
      decisionStatus: "DECIDED",
      decision,
      rmaNumber,
      verdictTitle,
      verdictSummary,
      refundAmount,
      storeCreditAmount,
      consolationCoupon,
      stampsTrail,
      pointlessChecksReport: checks
    };
  }
};

export function createSdkWorkers() {
  return Object.entries(WORKER_HANDLERS).map(([taskDefName, fn]) => ({
    taskDefName,
    concurrency: 5,
    pollInterval: 100,
    execute: async (task) => {
      const outputData = await fn(task?.inputData || {});
      return {
        status: "COMPLETED",
        outputData
      };
    }
  }));
}
