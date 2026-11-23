import type { ConductorWorker, Task, TaskResult } from "@io-orkes/conductor-javascript";
import { CHAOS_PRODUCTS, findProduct } from "./catalog.js";

// Tracks first-pass vs second-pass payment wobble per orderId (idempotent by taskId so worker retries never double-count)
const orderPaymentTaskIds = new Map<string, Set<string>>();

export interface CartItemInput {
  productId: string;
  quantity: number;
}

export async function executeReserveCursedInventory(
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const orderId = String(inputData.orderId || `CHC-${Date.now()}`);
  const rawItems = Array.isArray(inputData.items) ? (inputData.items as CartItemInput[]) : [];
  const chaosInsurance = Boolean(inputData.chaosInsurance);

  const normalizedItems =
    rawItems.length > 0
      ? rawItems
      : [{ productId: CHAOS_PRODUCTS[0].id, quantity: 1 }];

  let merchandiseSubtotal = 0;
  const reservedItems = normalizedItems.map((entry, idx) => {
    const product =
      findProduct(String(entry.productId || "")) ||
      CHAOS_PRODUCTS[idx % CHAOS_PRODUCTS.length];
    const quantity = Math.max(1, Math.min(99, Math.floor(Number(entry.quantity) || 1)));
    const lineTotal = Math.round(product.price * quantity * 100) / 100;
    merchandiseSubtotal = Math.round((merchandiseSubtotal + lineTotal) * 100) / 100;

    return {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      emoji: product.emoji,
      unitPrice: product.price,
      quantity,
      lineTotal,
      warehouseBin: product.cursedWarehouseLocation,
      reservationNote: `Reserved ${quantity}x from "${product.cursedWarehouseLocation}" (shooed away 2 raccoons)`
    };
  });

  const insuranceFee = chaosInsurance ? 199.99 : 0;

  return {
    orderId,
    reservedItems,
    merchandiseSubtotal,
    insuranceFee,
    warehouseWarning:
      "Inventory successfully pried loose from Sub-Basement 4B. Box may hum softly in D-minor during transit."
  };
}

export async function executeAttemptPaymentSettlement(
  inputData: Record<string, unknown>,
  taskId?: string
): Promise<Record<string, unknown>> {
  const orderId = String(inputData.orderId || "CHC-UNKNOWN");
  const grandTotal = Math.max(0.01, Math.round(Number(inputData.grandTotal || 99.99) * 100) / 100);
  const paymentMethod = String(inputData.paymentMethod || "credit_card_of_regret");
  const loopIter = Number(inputData.loopIteration || 0);

  let seenTasks = orderPaymentTaskIds.get(orderId);
  if (!seenTasks) {
    seenTasks = new Set<string>();
    orderPaymentTaskIds.set(orderId, seenTasks);
  }
  const effectiveTaskId = taskId || `inline-${seenTasks.size + 1}`;
  seenTasks.add(effectiveTaskId);

  const attemptNumber = Math.max(seenTasks.size, loopIter);

  // Pass 1 wobbles comedically so Conductor's DO_WHILE loop executes Pass 2; Pass 2 ALWAYS settles!
  if (attemptNumber <= 1) {
    return {
      settled: false,
      attemptNumber: 1,
      transactionId: null,
      authorizationCode: null,
      chargedAmount: 0,
      wobbleNote:
        "Pass #1: Card reader squinted judgmentally at your billing zip code. Triggering automatic Conductor DO_WHILE confidence recalibration..."
    };
  }

  const suffix = orderId.replace(/[^A-Z0-9]/gi, "").slice(-6).toUpperCase() || "884210";
  return {
    settled: true,
    attemptNumber,
    paymentMethod,
    transactionId: `TXN-CHAOS-${suffix}-${attemptNumber}`,
    authorizationCode: `AUTH-NO-BACKSIES-${attemptNumber}X`,
    chargedAmount: grandTotal,
    wobbleNote:
      "Pass #1 wobbled due to Insufficient Shopper Aura; Pass #2 settled cleanly after our CFO tapped the payment terminal with a wooden spoon."
  };
}

export async function executeDispatchAbsurdShipment(
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const orderId = String(inputData.orderId || `CHC-${Date.now()}`);
  const customerName = String(inputData.customerName || "Valued Victim");
  const customerEmail = String(inputData.customerEmail || "regret@example.com");
  const shippingAddress = String(inputData.shippingAddress || "123 Anywhere St");
  const shippingTier = String(inputData.shippingTier || "raccoons");
  const carrierName = String(
    inputData.carrierName || "Three Raccoons in a Trenchcoat Express"
  );
  const reservedItems = Array.isArray(inputData.reservedItems) ? inputData.reservedItems : [];
  const fees = (inputData.fees as Record<string, unknown>) || {};
  const couponOutcome = (inputData.couponOutcome as Record<string, unknown>) || {};
  const grandTotal = Number(inputData.grandTotal || 0);
  const payment = (inputData.payment as Record<string, unknown>) || {};

  const etaByTier: Record<string, string> = {
    catapult: "Between 6 minutes from now and Thursday (check roof & shrubbery)",
    raccoons: "3–5 nocturnal rummaging cycles (leave shiny foil on porch)",
    glacier: "Q3 2034 — Continental Drift Eco-Saver Window"
  };

  const suffix = orderId.replace(/[^A-Z0-9]/gi, "").slice(-6).toUpperCase() || "9001";
  const trackingNumber = `TRK-${shippingTier.slice(0, 3).toUpperCase()}-${suffix}-WTF`;
  const estimatedArrival =
    etaByTier[shippingTier] || "Whenever our nephew remembers where he parked his unicycle";

  const merchandiseSubtotal = reservedItems.reduce(
    (sum: number, item: any) => sum + Number(item?.lineTotal || 0),
    0
  );

  const receipt = {
    orderId,
    placedAt: new Date().toISOString(),
    customerName,
    customerEmail,
    shippingAddress,
    shippingTier,
    carrierName,
    trackingNumber,
    estimatedArrival,
    items: reservedItems,
    merchandiseSubtotal: Math.round(merchandiseSubtotal * 100) / 100,
    fees: {
      shippingFee: Number(fees.shippingFee ?? 19.99),
      electronWearFee: Number(fees.electronWearFee ?? 14.99),
      raccoonBribeFee: Number(fees.raccoonBribeFee ?? 7.77),
      feeCalculationFee: Number(fees.feeCalculationFee ?? 3.49),
      feeNamingFee: Number(fees.feeNamingFee ?? 0.99),
      chaosInsuranceFee:
        Math.round(
          (Number(fees.preCouponTotal || 0) -
            merchandiseSubtotal -
            Number(fees.shippingFee || 0) -
            Number(fees.electronWearFee || 0) -
            Number(fees.raccoonBribeFee || 0) -
            Number(fees.feeCalculationFee || 0) -
            Number(fees.feeNamingFee || 0)) *
            100
        ) / 100
    },
    couponOutcome: {
      code: String(couponOutcome.code || "NONE"),
      delta: Number(couponOutcome.delta || 0),
      verdict: String(couponOutcome.verdict || "No coupon applied.")
    },
    grandTotal: Math.round(grandTotal * 100) / 100,
    payment
  };

  return {
    orderId,
    status: "COMPLETED",
    trackingNumber,
    carrierName,
    estimatedArrival,
    dispatchNote: `Package launched via ${carrierName}. Tracking radar currently tracking either your parcel or a large migrating pelican.`,
    receipt
  };
}

export async function executeInspectReturnForensics(
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const reason = String(inputData.reason || "existential_regret");
  const apologyText = String(inputData.apologyText || "");
  const lunarCheck = (inputData.lunarCheck as Record<string, unknown>) || {};
  const airCheck = (inputData.airCheck as Record<string, unknown>) || {};
  const contritionCheck = (inputData.contritionCheck as Record<string, unknown>) || {};
  const oathCheck = (inputData.oathCheck as Record<string, unknown>) || {};

  // Bonus 5th Worker Forensic Check: Cardboard Vibe & Forklift Flattery Audit
  const mentionsForkliftOrSorry = /forklift|sorry|humble|forgive|hubris|regret/i.test(apologyText);
  const sniffCheck = {
    checkName: "Check #5: Cardboard Vibe & Forklift Flattery Sniff Test",
    passed: mentionsForkliftOrSorry,
    score: mentionsForkliftOrSorry ? 20 : 5,
    finding: mentionsForkliftOrSorry
      ? "Apology contained legally sufficient flattery toward Warehouse Forklift #4."
      : "Apology failed to compliment Warehouse Forklift #4's hydraulic poise (-15 pts)."
  };

  const checksAudit = [
    {
      checkName: String(lunarCheck.checkName || "Check #1: Lunar Alignment"),
      passed: Boolean(lunarCheck.passed),
      score: Number(lunarCheck.score ?? 10),
      finding: String(lunarCheck.finding || "Lunar telemetry recorded.")
    },
    {
      checkName: String(airCheck.checkName || "Check #2: Original Air Molecules"),
      passed: Boolean(airCheck.passed),
      score: Number(airCheck.score ?? 8),
      finding: String(airCheck.finding || "Air sample analyzed.")
    },
    {
      checkName: String(contritionCheck.checkName || "Check #3: Eye Contact & Tears"),
      passed: Boolean(contritionCheck.passed),
      score: Number(contritionCheck.score ?? 9),
      finding: String(contritionCheck.finding || "Tear salinity measured.")
    },
    {
      checkName: String(oathCheck.checkName || "Check #4: Gremlin & Hubris Oaths"),
      passed: Boolean(oathCheck.passed),
      score: Number(oathCheck.score ?? 5),
      finding: String(oathCheck.finding || "Oath compliance logged.")
    },
    sniffCheck
  ];

  const rawScore = checksAudit.reduce((sum, c) => sum + Number(c.score || 0), 0);
  const totalScore = Math.min(100, Math.max(0, rawScore));

  let verdictTier: string;
  if (reason === "looked_at_it_wrong") {
    verdictTier = "DENIED_BUREAUCRATICALLY";
  } else if (totalScore >= 95) {
    verdictTier = "MIRACLE_FULL_REFUND";
  } else if (totalScore >= 65) {
    verdictTier = "PARTIAL_MINUS_AUDACITY_FEES";
  } else if (totalScore >= 40) {
    verdictTier = "CHAOS_STORE_CREDIT";
  } else {
    verdictTier = "DENIED_BUREAUCRATICALLY";
  }

  return {
    totalScore,
    verdictTier,
    checksAudit,
    forensicSummary: `Completed 5 pointless forensic checks with composite Bureaucratic Compliance Score ${totalScore}/100 -> routed to ${verdictTier}.`
  };
}

export async function executeIssueReturnVerdict(
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const returnId = String(inputData.returnId || `RET-${Date.now()}`);
  const orderId = String(inputData.orderId || "CHC-UNKNOWN");
  const itemName = String(inputData.itemName || "Mystery Chaos Artifact");
  const itemPrice = Math.max(0.01, Number(inputData.itemPrice || 99.99));
  const branchPolicy = String(inputData.branchPolicy || "CHAOS_STORE_CREDIT");
  const totalScore = Number(inputData.totalScore || 50);
  const annoyanceTariff = Number(inputData.annoyanceTariff || 19.99);
  const checksAudit = Array.isArray(inputData.checksAudit) ? inputData.checksAudit : [];

  const rawLoop = (inputData.committeeLoopOutput as Record<string, any>) || {};
  const committeeStamps: Array<{ deskNumber: number; deskName: string; stampNote: string }> = [];
  for (const k of ["1", "2", "3"]) {
    const iterEntry = rawLoop[k]?.rubber_stamp_desk_ref;
    const stampObj = iterEntry?.result || iterEntry;
    if (stampObj && stampObj.deskName) {
      committeeStamps.push({
        deskNumber: Number(stampObj.deskNumber || k),
        deskName: String(stampObj.deskName),
        stampNote: String(stampObj.stampNote || "Stamped reluctantly.")
      });
    }
  }
  if (committeeStamps.length === 0) {
    committeeStamps.push(
      {
        deskNumber: 1,
        deskName: "Desk 14-A: Sub-Directorate of Heavy Sighing",
        stampNote: "Stamped with purple ink after a 4-minute coffee sip."
      },
      {
        deskNumber: 2,
        deskName: "Desk 27-B: Grand Notary of Crumpled Receipts",
        stampNote: "Cross-referenced against 1994 Maritime Bird Law; initialed."
      },
      {
        deskNumber: 3,
        deskName: "Desk 99-Z: Supreme High Chancellor of Cardboard",
        stampNote: "Sealed with wax and mild bureaucratic resentment."
      }
    );
  }

  let approved = true;
  let decisionCode = "APPROVED_CHAOS_CREDIT";
  let decisionTitle = "APPROVED (IN NON-FUNGIBLE CHAOS STORE CREDIT)";
  let refundAmount = 0;
  let chaosBucksCredit = 0;
  let deductions: Array<{ label: string; amount: number }> = [];
  let officialRuling = "";

  if (branchPolicy === "MIRACLE_FULL_REFUND") {
    approved = true;
    decisionCode = "APPROVED_MIRACLE_REFUND";
    decisionTitle = "MIRACLE VERDICT: FULL MONETARY REFUND APPROVED (MINUS $0.01 PAPERWORK INK)";
    deductions = [{ label: "Mandatory Purple Stamp Ink Recovery Fee", amount: 0.01 }];
    refundAmount = Math.max(0.01, Math.round((itemPrice - 0.01) * 100) / 100);
    chaosBucksCredit = 0;
    officialRuling = `Against all statistical odds (Score ${totalScore}/100), your return of "${itemName}" survived all 5 pointless checks and 3 rubber-stamp desks! Refunding $${refundAmount.toFixed(2)} in 1–412 business days.`;
  } else if (branchPolicy === "PARTIAL_MINUS_AUDACITY_FEES") {
    approved = true;
    decisionCode = "APPROVED_PARTIAL_REFUND";
    decisionTitle = "APPROVED: PARTIAL REFUND (AFTER POINTLESS SURCHARGE DEDUCTIONS)";
    const sighingFee = Math.round(itemPrice * 0.12 * 100) / 100;
    const restockFee = Math.min(annoyanceTariff, Math.round(itemPrice * 0.15 * 100) / 100);
    deductions = [
      { label: "Warehouse Staff Heavy Sighing Fee (12%)", amount: sighingFee },
      { label: "Box Re-Taping & Emotional Decompression Tariff", amount: restockFee }
    ];
    refundAmount = Math.max(
      0.01,
      Math.round((itemPrice - sighingFee - restockFee) * 100) / 100
    );
    chaosBucksCredit = 5.0;
    officialRuling = `Return of "${itemName}" APPROVED with Score ${totalScore}/100! After deducting mandatory sighing and box decompression fees, $${refundAmount.toFixed(2)} is approved for refund plus $5.00 in Ceremonial Chaos Bucks™.`;
  } else if (branchPolicy === "DENIED_BUREAUCRATICALLY") {
    approved = false;
    decisionCode = "DENIED_BY_TRIBUNAL";
    decisionTitle = "FINAL DECISION: OFFICIALLY DENIED BY DESK 99-Z";
    deductions = [{ label: "100% Insufficient Contrition / Lunar Misalignment", amount: itemPrice }];
    refundAmount = 0;
    chaosBucksCredit = 0.03;
    officialRuling = `Return of "${itemName}" OFFICIALLY DENIED (Score ${totalScore}/100). Desk 99-Z ruled that your box lacked sufficient 2019 factory oxygen and/or you looked at the item sideways. Consolation grant: $0.03 in expired Chaos Bucks™.`;
  } else {
    approved = true;
    decisionCode = "APPROVED_CHAOS_CREDIT";
    decisionTitle = "APPROVED: 100% REFUND ISSUED IN CHAOS BUCKS™ STORE CREDIT";
    deductions = [{ label: "Cash-to-Chaos-Bucks Conversion Friction", amount: 0 }];
    refundAmount = 0;
    chaosBucksCredit = Math.round(itemPrice * 1.05 * 100) / 100;
    officialRuling = `Return of "${itemName}" ADJUDICATED & APPROVED FOR STORE CREDIT (Score ${totalScore}/100)! Issued $${chaosBucksCredit.toFixed(2)} in Chaos Bucks™ (includes +5% Store-Lock Bonus, redeemable exclusively during solar eclipses or right here).`;
  }

  return {
    decisionReached: true,
    decidedAt: new Date().toISOString(),
    returnId,
    orderId,
    itemName,
    itemPrice,
    decisionCode,
    decisionTitle,
    approved,
    refundAmount,
    chaosBucksCredit,
    deductions,
    checksAudit,
    committeeStamps,
    officialRuling,
    appealInstructions:
      "Decision is final and binding across 11 dimensions. To file a ceremonial appeal, fold a notarized haiku into a paper swan and launch it toward Gary, Indiana."
  };
}

export const CHAOS_WORKER_HANDLERS: Record<
  string,
  (inputData: Record<string, unknown>, taskId?: string) => Promise<Record<string, unknown>>
> = {
  chaos_reserve_cursed_inventory: (input) => executeReserveCursedInventory(input),
  chaos_attempt_payment_settlement: (input, taskId) =>
    executeAttemptPaymentSettlement(input, taskId),
  chaos_dispatch_absurd_shipment: (input) => executeDispatchAbsurdShipment(input),
  chaos_inspect_return_forensics: (input) => executeInspectReturnForensics(input),
  chaos_issue_return_verdict: (input) => executeIssueReturnVerdict(input)
};

export function createSdkWorkers(): ConductorWorker[] {
  return Object.entries(CHAOS_WORKER_HANDLERS).map(([taskDefName, fn]) => ({
    taskDefName,
    pollInterval: 100,
    concurrency: 5,
    execute: async (task: Task): Promise< Omit<TaskResult, "workflowInstanceId" | "taskId"> > => {
      const outputData = await fn((task.inputData as Record<string, unknown>) || {}, task.taskId);
      return {
        status: "COMPLETED",
        outputData
      };
    }
  }));
}
