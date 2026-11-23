import crypto from "node:crypto";

const SHIPPING_CATALOG = {
  teleportation: {
    id: "teleportation",
    label: "Teleportation (Currently Broken)",
    carrier: "Quantum Intern",
    cost: 999.0,
    extraFee: 0,
    eta: "6–8 weeks (plus quantum drift)",
  },
  pigeon: {
    id: "pigeon",
    label: "Carrier Pigeon (Unmotivated)",
    carrier: "Barnaby the Reluctant Pigeon",
    cost: 49.99,
    extraFee: 0,
    eta: "Whenever Barnaby finishes his bagel",
  },
  greg: {
    id: "greg",
    label: "Guy Named Greg Walking",
    carrier: "Greg (Comfortable Sneakers)",
    cost: 14.99,
    extraFee: 0,
    eta: "Eventually, depending on hills",
  },
  standard_free: {
    id: "standard_free",
    label: "FREE Standard Shipping (We Might Forget)",
    carrier: "Selective Memory Logistics",
    cost: 0,
    extraFee: 19.99,
    eta: "Sometime between Tuesday and the heat death of the universe",
  },
};

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function deterministicHash(seed) {
  return crypto.createHash("sha256").update(String(seed || "chaos")).digest("hex");
}

function evaluatePromoCode(rawCode, subtotal) {
  const code = String(rawCode || "").trim().toUpperCase();
  if (!code) {
    return {
      code: "",
      label: "No promo code entered (Missed opportunity to pay extra!)",
      delta: 0,
    };
  }
  if (code === "SAVE50" || code === "50OFF") {
    return {
      code,
      label: `Promo "${code}" applied: +50% Audacity Surcharge`,
      delta: round2(subtotal * 0.5),
    };
  }
  if (code === "SAVE20" || code === "DISCOUNT") {
    return {
      code,
      label: `Promo "${code}" applied: +20% Hubris Markup`,
      delta: round2(subtotal * 0.2),
    };
  }
  if (code === "FREE" || code === "FREESHIP") {
    return {
      code,
      label: `Promo "${code}" applied: +$99.99 Anti-Freeloader Penalty`,
      delta: 99.99,
    };
  }
  if (code === "PAYMORE") {
    return {
      code,
      label: `Promo "${code}" applied: -$0.01 Reverse Psychology Discount!`,
      delta: -0.01,
    };
  }
  return {
    code,
    label: `Unknown promo "${code}" accepted: +$12.34 Guessing Fee`,
    delta: 12.34,
  };
}

export const chaosTaskHandlers = {
  // ===========================================================================
  // CHECKOUT WORKFLOW TASKS
  // ===========================================================================

  validate_chaos_cart: async (inputData = {}) => {
    const rawItems = Array.isArray(inputData.items) ? inputData.items : [];
    const normalizedItems =
      rawItems.length > 0
        ? rawItems.map((item, idx) => {
            const qty = Math.max(1, Math.min(99, Number(item?.quantity) || 1));
            const unitPrice = Math.max(0.01, round2(item?.price ?? 99.99));
            return {
              id: String(item?.id || `chaos-item-${idx + 1}`),
              name: String(item?.name || "Mystery Regret Item"),
              quantity: qty,
              unitPrice,
              lineTotal: round2(qty * unitPrice),
            };
          })
        : [
            {
              id: "invisible-brick",
              name: "Emergency Empty-Cart Placeholder Brick",
              quantity: 1,
              unitPrice: 0.03,
              lineTotal: 0.03,
            },
          ];

    const subtotal = round2(normalizedItems.reduce((sum, i) => sum + i.lineTotal, 0));
    const itemCount = normalizedItems.reduce((sum, i) => sum + i.quantity, 0);

    const shippingKey = String(inputData.shippingMethod || "standard_free");
    const shipping = SHIPPING_CATALOG[shippingKey] || SHIPPING_CATALOG.standard_free;

    const promoEffect = evaluatePromoCode(inputData.promoCode, subtotal);
    const algorithmTip = Math.max(0, round2(inputData.algorithmTip || 0));

    const fees = [
      {
        name: "Convenience Inconvenience Fee",
        amount: round2(Math.max(4.99, subtotal * 0.03)),
      },
      {
        name: "Pixel Delivery Surcharge",
        amount: round2(itemCount * 2.47),
      },
      {
        name: "CEO Yacht Fuel Adjustment",
        amount: 18.88,
      },
      {
        name: "Emotional Labor Tax",
        amount: 3.14,
      },
    ];

    if (shipping.cost > 0) {
      fees.push({ name: `Shipping (${shipping.label})`, amount: shipping.cost });
    } else if (shipping.extraFee > 0) {
      fees.push({
        name: "Free Shipping Processing Fee (Nothing Is Truly Free)",
        amount: shipping.extraFee,
      });
    }

    const feesTotal = round2(fees.reduce((sum, f) => sum + f.amount, 0));
    const grandTotal = round2(Math.max(0.01, subtotal + feesTotal + promoEffect.delta + algorithmTip));
    const priceTier = grandTotal >= 1000 ? "OUTRAGEOUS" : "MERELY_BAD";

    return {
      normalizedItems,
      itemCount,
      subtotal,
      fees,
      feesTotal,
      promoEffect,
      shippingMethod: shipping,
      algorithmTip,
      grandTotal,
      priceTier,
    };
  },

  consult_inventory_hamsters: async (inputData = {}) => {
    const itemCount = Number(inputData.itemCount) || 1;
    const items = Array.isArray(inputData.items) ? inputData.items : [];
    const firstItem = items[0]?.name || "Unspecified Regret";
    return {
      hamstersAwake: 2,
      hamstersNapping: 19,
      allocated: true,
      verdict:
        itemCount > 3
          ? `Warehouse hamsters located 1 of ${itemCount} items; the remaining ${itemCount - 1} will be lovingly improvised from recycled cardboard.`
          : `Hamster #7 confirmed "${firstItem}" exists conceptually and taped a box shut with enthusiasm.`,
    };
  },

  perform_vibe_fraud_check: async (inputData = {}) => {
    const name = String(inputData.customerName || "Valued Victim").trim();
    const total = round2(inputData.grandTotal || 0);
    const hasVowel = /[aeiou]/i.test(name);
    return {
      fraudScore: hasVowel ? 0.02 : 0.07,
      approved: true,
      verdict:
        total >= 1000
          ? `Customer "${name}" willingly agreed to pay $${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}. Vibes: Impeccably gullible. Approved immediately!`
          : `Customer "${name}" passed our rigorous vowel-presence test. Zero fraud detected, mild buyer's remorse anticipated.`,
    };
  },

  mint_vip_sucker_certificate: async (inputData = {}) => {
    const name = String(inputData.customerName || "Distinguished Patron").trim();
    const total = round2(inputData.grandTotal || 0);
    return {
      tierMessage: `PLATINUM VIP SUCKER STATUS UNLOCKED for ${name} ($${total.toLocaleString("en-US", { minimumFractionDigits: 2 })})! Our CFO is naming a speedboat after you.`,
      bonusGift: "Framable PDF Certificate of Financial Bravery (Imaginary)",
    };
  },

  attach_passive_aggressive_flyer: async (inputData = {}) => {
    const name = String(inputData.customerName || "Thrifty Shopper").trim();
    return {
      tierMessage: `Budget Regret Tier for ${name}: We noticed you spent under $1,000. Our CEO had to fly commercial because of this.`,
      bonusGift: "Expired 2007 Coupon for a Store That No Longer Exists",
    };
  },

  finalize_chaos_order: async (inputData = {}) => {
    const seed = `${inputData.orderReference || ""}-${inputData.customerEmail || ""}-${inputData.grandTotal || ""}`;
    const shortHash = deterministicHash(seed).slice(0, 6).toUpperCase();
    const orderId = inputData.orderReference
      ? String(inputData.orderReference)
      : `CHAOS-${shortHash}`;
    const carrier = inputData.shippingOmen?.carrier || "Greg Walking";
    const eta =
      inputData.shippingOmen?.eta ||
      "Sometime between Tuesday and the heat death of the universe";
    const trackingPrefix = carrier.split(" ")[0].toUpperCase().replace(/[^A-Z]/g, "") || "CHAOS";

    return {
      orderId,
      status: "CONFIRMED",
      customerName: String(inputData.customerName || "Anonymous Enthusiast"),
      customerEmail: String(inputData.customerEmail || "regrets@chaos-commerce.example"),
      shippingAddress: String(inputData.shippingAddress || "123 Impulse Buy Lane"),
      trackingNumber: `${trackingPrefix}-${shortHash}-NOPE`,
      estimatedDelivery: eta,
      receiptMessage: `Thank you for financially sustaining Chaos Commerce! Your order ${orderId} is 100% locked in (unless you survive our Returns Gauntlet).`,
      completedAt: new Date().toISOString(),
    };
  },

  // ===========================================================================
  // RETURNS WORKFLOW TASKS
  // ===========================================================================

  intake_return_dossier: async (inputData = {}) => {
    const orderId = String(inputData.orderId || "CHAOS-UNKNOWN").trim();
    const itemName = String(inputData.itemName || "Regrettable Impulse Purchase").trim();
    const orderTotal = Math.max(0.01, round2(inputData.orderTotal ?? 149.99));
    const reason = String(inputData.reason || "Item looked at me funny").trim();
    const hash = deterministicHash(`${orderId}-${itemName}-${reason}`).slice(0, 6).toUpperCase();

    return {
      caseNumber: `BUREAU-99-${hash}`,
      orderId,
      customerName: String(inputData.customerName || "Remorseful Shopper").trim(),
      itemName,
      orderTotal,
      reason,
      requiredStamps: 3,
      intakeNote: inputData.termsRead
        ? "Customer claims to have read our 847-word Terms of Perpetual Ownership. Suspicious, yet logged."
        : "Customer refused to pretend they read the Terms. Refreshingly honest; logged anyway.",
    };
  },

  check_mercury_retrograde: async (inputData = {}) => {
    const moonPhase = String(inputData.moonPhase || "Waning Gibbous").trim();
    const favorable = /full|new|crescent/i.test(moonPhase);
    return {
      passed: favorable,
      points: favorable ? 25 : 12,
      note: favorable
        ? `Moon phase "${moonPhase}" is marginally acceptable to the Celestial Refunds Officer (+25 pts).`
        : `Moon phase "${moonPhase}" triggered a minor Saturn squint; Mercury is currently in microwave (+12 pts).`,
    };
  },

  verify_raccoon_status: async (inputData = {}) => {
    const decl = String(inputData.raccoonDeclaration || "").trim().toLowerCase();
    const convincing = decl.includes("not a raccoon") || decl.includes("human") || decl.includes("no");
    return {
      passed: convincing,
      points: convincing ? 25 : 10,
      note: convincing
        ? `Anti-raccoon attestation accepted ("${inputData.raccoonDeclaration || "I am human"}"). Still 14% sure you are three raccoons in a trench coat (+25 pts).`
        : `Ambiguous species declaration ("${inputData.raccoonDeclaration || "blank"}"). Flagged for shiny-object vigilance (+10 pts).`,
    };
  },

  weigh_in_barleycorns: async (inputData = {}) => {
    const weight = Number(inputData.barleycornWeight);
    const aura = String(inputData.boxAura || "Chaotic Neutral").trim();
    const validNum = Number.isFinite(weight) && weight > 0;
    const auraGood = /serene|aligned|apologetic|beige/i.test(aura);
    const points = (validNum ? 15 : 5) + (auraGood ? 15 : 8);
    return {
      passed: validNum,
      points,
      note: validNum
        ? `Measured ${weight} medieval barleycorns (${round2(weight * 0.0648)}g of pure regret). Box aura "${aura}" recorded (+${points} pts).`
        : `No valid barleycorn measurement provided; estimating weight by vibes alone. Box aura "${aura}" (+${points} pts).`,
    };
  },

  grade_haiku_of_regret: async (inputData = {}) => {
    const haiku = String(inputData.haikuOfRegret || "").trim();
    const whispered = Boolean(inputData.whisperedApology);
    const wordCount = haiku ? haiku.split(/\s+/).filter(Boolean).length : 0;
    const points = Math.min(30, wordCount >= 5 ? 20 : 8) + (whispered ? 15 : 0);
    return {
      passed: wordCount >= 3,
      points,
      note:
        wordCount >= 3
          ? `Literary Tribunal moved to mild indifference by your ${wordCount}-word Haiku of Regret.${whispered ? " Whispered warehouse apology confirmed by acoustic elves." : " Missing whispered apology."} (+${points} pts).`
          : `Haiku was suspiciously brief (${wordCount} words). Our poetry intern sighed dramatically (+${points} pts).`,
    };
  },

  apply_redundant_stamp: async (inputData = {}) => {
    const iteration = Number(inputData.iteration) || 1;
    const offices = [
      "Department of Redundancy Department",
      "Subcommittee on Unnecessary Delays",
      "Office of Approving Previous Stamps",
      "Bureau of Excess Ink",
    ];
    const office = offices[(iteration - 1) % offices.length];
    return {
      stampNumber: iteration,
      office,
      stampText: `STAMP #${iteration} APPLIED BY ${office.toUpperCase()} FOR ${inputData.caseNumber || "CASE"}`,
      stampedAt: new Date().toISOString(),
    };
  },

  evaluate_return_verdict: async (inputData = {}) => {
    const totalPoints = Number(inputData.totalPoints) || 0;
    const orderTotal = Math.max(0.01, round2(inputData.orderTotal ?? 100));
    const whispered = Boolean(inputData.whisperedApology);
    const reason = String(inputData.reason || "").toLowerCase();

    // Guaranteed deterministic decision across all inputs — EVERY return reaches a clear verdict!
    let decisionCode;
    let decisionTitle;
    let decisionSummary;
    let approved;
    let refundAmount = 0;
    let storeCreditAmount = 0;
    let restockingFee = 0;

    if (totalPoints >= 85 && whispered) {
      decisionCode = "APPROVED_STORE_CREDIT";
      decisionTitle = "Approved for 103% Chaos Store Credit!";
      decisionSummary = `Against all bureaucratic odds, you scored ${totalPoints}/115 and whispered to the warehouse! We are awarding 103% store credit so you can immediately buy something even worse.`;
      approved = true;
      storeCreditAmount = round2(orderTotal * 1.03);
    } else if (totalPoints >= 65 || reason.includes("fire") || reason.includes("broken") || reason.includes("sock")) {
      decisionCode = "APPROVED_MINUS_ABSURD_FEES";
      decisionTitle = "Approved! (Minus Nominal Emotional Closure Fee)";
      restockingFee = round2(Math.min(orderTotal * 0.15, 14.99));
      refundAmount = round2(Math.max(0.01, orderTotal - restockingFee));
      decisionSummary = `Your dossier survived ${inputData.stampsApplied || 3} redundant stamps (${totalPoints}/115 pts). Refund of $${refundAmount.toFixed(2)} approved after deducting a $${restockingFee.toFixed(2)} Emotional Closure & Cardboard Grievance Fee.`;
      approved = true;
    } else if (totalPoints >= 45) {
      decisionCode = "APPROVED_IN_DOUBLOONS";
      decisionTitle = "Approved — Refund Converted to Chaos Doubloons!";
      refundAmount = orderTotal;
      decisionSummary = `Your return (${totalPoints}/115 pts) is officially approved! To save on bank fees, your $${orderTotal.toFixed(2)} refund has been converted into legally meaningless Chaos Doubloons.`;
      approved = true;
    } else {
      decisionCode = "DENIED_WITH_CONFETTI";
      decisionTitle = "Politely Denied (With Commemorative Confetti)";
      decisionSummary = `After ${inputData.stampsApplied || 3} committee stamps, your bureaucracy score (${totalPoints}/115 pts) fell short of our arbitrary threshold. You must keep the item forever, but we are throwing digital confetti to soften the blow.`;
      approved = false;
    }

    return {
      decisionCode,
      decisionTitle,
      decisionSummary,
      approved,
      refundAmount,
      storeCreditAmount,
      restockingFee,
      decidedAt: new Date().toISOString(),
    };
  },

  issue_store_credit_voucher: async (inputData = {}) => {
    const code = `CREDIT-${deterministicHash(inputData.caseNumber).slice(0, 8).toUpperCase()}`;
    const amt = round2(inputData.storeCreditAmount || 0);
    return {
      resolutionArtifact: `Voucher ${code} ($${amt.toFixed(2)} Chaos Store Credit)`,
      nextSteps: `Spend voucher ${code} within the next 900 years on equally questionable merchandise. No need to mail the item back — we genuinely do not want it either.`,
    };
  },

  issue_fee_nibbled_refund: async (inputData = {}) => {
    const ref = `REFUND-${deterministicHash(inputData.caseNumber).slice(0, 8).toUpperCase()}`;
    const amt = round2(inputData.refundAmount || 0);
    const fee = round2(inputData.restockingFee || 0);
    return {
      resolutionArtifact: `Refund Slip ${ref} ($${amt.toFixed(2)} issued; $${fee.toFixed(2)} fee kept for morale)`,
      nextSteps: `Funds will arrive in 3–5 business decades. Keep the item as a cautionary tale for your guests.`,
    };
  },

  mint_chaos_doubloons: async (inputData = {}) => {
    const amt = round2(inputData.refundAmount || 0);
    const doubloons = Math.max(1, Math.round(amt * 7));
    const cert = `DOUBLOON-${deterministicHash(inputData.caseNumber).slice(0, 8).toUpperCase()}`;
    return {
      resolutionArtifact: `Treasure Ledger ${cert} (${doubloons.toLocaleString("en-US")} Official Chaos Doubloons)`,
      nextSteps: `Your ${doubloons.toLocaleString("en-US")} Chaos Doubloons are redeemable for pirate bragging rights and 0% off future orders.`,
    };
  },

  dispatch_consolation_confetti: async (inputData = {}) => {
    const badge = `CONFETTI-${deterministicHash(inputData.caseNumber).slice(0, 8).toUpperCase()}`;
    return {
      resolutionArtifact: `Commemorative Denial Badge ${badge} (Includes 14 Virtual Confetti Shards)`,
      nextSteps: `Display your item proudly! You may re-apply after whispering an apology to the warehouse and consulting a more flattering moon phase.`,
    };
  },
};
