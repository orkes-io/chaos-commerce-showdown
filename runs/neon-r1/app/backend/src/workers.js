import crypto from "node:crypto";
import { orkesConductorClient, TaskManager } from "@io-orkes/conductor-javascript";
import { config } from "./config.js";
import { calculateChaosPricing, PAYMENT_METHODS, roundMoney } from "./catalog.js";

function stableHashInt(seed) {
  const hex = crypto.createHash("sha256").update(String(seed || "chaos")).digest("hex");
  return parseInt(hex.slice(0, 8), 16);
}

function makeShortCode(seed, prefix) {
  const hex = crypto
    .createHash("sha256")
    .update(String(seed || Date.now()))
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();
  return `${prefix}-${hex}`;
}

export function buildWorkerDefinitions() {
  return [
    // =========================================================================
    // CHECKOUT WORKFLOW WORKERS (chaos_checkout)
    // =========================================================================
    {
      taskDefName: "chaos_validate_cart_and_inflate_fees",
      execute: async ({ inputData = {} }) => {
        const orderId = String(inputData.orderId || makeShortCode(Date.now(), "CHS-ORD"));
        const pricing = calculateChaosPricing({
          items: Array.isArray(inputData.items) ? inputData.items : [],
          shippingMethod: inputData.shippingMethod,
          promoCode: inputData.promoCode,
          addons: Array.isArray(inputData.addons) ? inputData.addons : [],
        });

        return {
          status: "COMPLETED",
          outputData: {
            orderId,
            ...pricing,
          },
        };
      },
    },
    {
      taskDefName: "chaos_check_imaginary_inventory",
      execute: async ({ inputData = {} }) => {
        const orderId = String(inputData.orderId || "CHS-ORD");
        const items = Array.isArray(inputData.items) ? inputData.items : [];
        const h = stableHashInt(`${orderId}-inv`);
        const warehouses = [
          "Haunted Warehouse #404 (Basement B)",
          "Suspicious Van Behind the Mall",
          "Quantum Storage Locker #∞",
          "Abandoned Blimp Hangar #7",
        ];
        const packingNotes = [
          "Packed loosely with 3 packing peanuts and a shrug.",
          "Wrapped in bubble wrap that has already been pre-popped.",
          "Placed inside a box three sizes too large with zero tape.",
          "Tossed gently from across the room into a damp envelope.",
        ];
        const imaginaryStock = -1 * ((h % 19) + 1);

        return {
          status: "COMPLETED",
          outputData: {
            warehouse: warehouses[h % warehouses.length],
            binLocation: `AISLE-${(h % 99) + 1}-VOID`,
            stockStatus: `RESERVED (${imaginaryStock} on shelf — borrowed from a parallel universe)`,
            packingNote: packingNotes[h % packingNotes.length],
            imaginaryStockRemaining: imaginaryStock,
            itemCount: items.reduce((s, i) => s + (Number(i.quantity) || 1), 0) || 1,
          },
        };
      },
    },
    {
      taskDefName: "chaos_verify_vibe_and_fraud",
      execute: async ({ inputData = {} }) => {
        const orderId = String(inputData.orderId || "CHS-ORD");
        const grandTotal = Number(inputData.grandTotal) || 0;
        const customerName = inputData.customer?.name || "Valued Victim";
        const h = stableHashInt(`${orderId}-${customerName}`);
        const vibeScore = 62 + (h % 38);
        const approvalTier = grandTotal >= 5000 ? "vip_chaos" : "standard_chaos";
        const fraudLabels = [
          "Suspiciously Willing to Pay This Much (Approved Immediately)",
          "Passed Reverse Fraud Check (Card Might Be Imaginary — We Love That)",
          "Flagged as Too Polite (Auto-Escalated to Enthusiastic Acceptance)",
        ];

        return {
          status: "COMPLETED",
          outputData: {
            vibeScore,
            fraudLabel: fraudLabels[h % fraudLabels.length],
            approvalTier,
            note: `Customer ${customerName} scored ${vibeScore}/100 on the Chaos Vibe Meter. Proceeding with ${approvalTier}.`,
          },
        };
      },
    },
    {
      taskDefName: "chaos_process_vip_payment",
      execute: async ({ inputData = {} }) => {
        const orderId = String(inputData.orderId || "CHS-ORD");
        const grandTotal = roundMoney(inputData.grandTotal || 0);
        const pm =
          PAYMENT_METHODS.find((m) => m.id === inputData.paymentMethod) ||
          PAYMENT_METHODS[0];

        return {
          status: "COMPLETED",
          outputData: {
            transactionId: makeShortCode(`${orderId}-vip`, "TXN-VIP"),
            tier: "VIP_CHAOS_HIGH_ROLLER",
            paymentMethod: pm.label,
            chargedAmount: grandTotal,
            approved: true,
            ceremonyNote:
              "Rolled out an imaginary velvet carpet, rang a tiny brass bell, and joyfully accepted your wildly inflated total.",
          },
        };
      },
    },
    {
      taskDefName: "chaos_process_standard_payment",
      execute: async ({ inputData = {} }) => {
        const orderId = String(inputData.orderId || "CHS-ORD");
        const grandTotal = roundMoney(inputData.grandTotal || 0);
        const pm =
          PAYMENT_METHODS.find((m) => m.id === inputData.paymentMethod) ||
          PAYMENT_METHODS[0];

        return {
          status: "COMPLETED",
          outputData: {
            transactionId: makeShortCode(`${orderId}-std`, "TXN-STD"),
            tier: "STANDARD_CHAOS",
            paymentMethod: pm.label,
            chargedAmount: grandTotal,
            approved: true,
            ceremonyNote:
              "Shook the corporate Magic 8-Ball. It said 'Sure, Why Not?' — payment irreversibly approved!",
          },
        };
      },
    },
    {
      taskDefName: "chaos_finalize_order",
      execute: async ({ inputData = {} }) => {
        const orderId = String(inputData.orderId || makeShortCode(Date.now(), "CHS-ORD"));
        const pricing = inputData.pricing || {};
        const inventory = inputData.inventory || {};
        const vibe = inputData.vibe || {};
        const payment = inputData.payment || {};
        const h = stableHashInt(`${orderId}-final`);

        const etas = [
          pricing.shippingEta || "3–90 Business Months",
          "Between Next Tuesday and the Heat Death of the Universe",
          "Whenever Our Carrier Pigeon Recovers Emotionally",
        ];

        return {
          status: "COMPLETED",
          outputData: {
            orderId,
            status: "COMPLETED",
            trackingNumber: makeShortCode(`${orderId}-trk`, "CHAOS-TRK"),
            estimatedDelivery: etas[h % etas.length],
            chaosCertificate: makeShortCode(`${orderId}-cert`, "CERT-REGRET"),
            completedAt: new Date().toISOString(),
            receipt: pricing,
            fulfillment: inventory,
            payment,
            vibeCheck: vibe,
          },
        };
      },
    },

    // =========================================================================
    // RETURN BUREAUCRACY WORKFLOW WORKERS (chaos_return_bureaucracy)
    // =========================================================================
    {
      taskDefName: "chaos_intake_return_form",
      execute: async ({ inputData = {} }) => {
        const returnId = String(inputData.returnId || makeShortCode(Date.now(), "RET"));
        const orderId = String(inputData.orderId || "CHS-ORD-UNKNOWN");
        const h = stableHashInt(`${returnId}-${orderId}`);
        // Strictly 2 or 3 stamps so DO_WHILE always completes fast and demonstrably loops
        const requiredStamps = (h % 2) + 2;

        return {
          status: "COMPLETED",
          outputData: {
            returnId,
            orderId,
            caseNumber: makeShortCode(`${returnId}-${orderId}`, "RMA-VOID"),
            formCode: "FORM-27B/6",
            requiredStamps,
            intakeNote: `Logged Form 27-B/6 for ${inputData.itemName || "Mystery Regret"}. Customer reported moon phase '${inputData.moonPhase || "Unknown"}' and regret level '${inputData.regretLevel || "Existential"}'. Routing through ${requiredStamps} completely unnecessary desks.`,
          },
        };
      },
    },
    {
      taskDefName: "chaos_check_lunar_alignment",
      execute: async ({ inputData = {} }) => {
        const caseNumber = String(inputData.caseNumber || "RMA-VOID");
        const moonPhase = String(inputData.moonPhase || "Waxing Regret").trim();
        const h = stableHashInt(`${caseNumber}-${moonPhase}`);
        const score = 15 + (h % 25);
        const notes = [
          `Moon phase '${moonPhase}' verified against an upside-down wall calendar from 2011. Mercury appears to be in microwave.`,
          `Astronomical auditor squinted out a window and confirmed '${moonPhase}' is legally non-binding.`,
          `Tidal compliance check for '${moonPhase}' passed with mild bureaucratic disdain.`,
        ];

        return {
          status: "COMPLETED",
          outputData: {
            status: "POINTLESSLY_VERIFIED",
            moonPhase,
            score,
            note: notes[h % notes.length],
          },
        };
      },
    },
    {
      taskDefName: "chaos_measure_box_karma",
      execute: async ({ inputData = {} }) => {
        const caseNumber = String(inputData.caseNumber || "RMA-VOID");
        const itemName = String(inputData.itemName || "Chaos Item");
        const reason = String(inputData.reason || "Deep regret");
        const h = stableHashInt(`${caseNumber}-${itemName}-${reason}`);
        const score = 10 + (h % 30);
        const notes = [
          `Cardboard aura for '${itemName}' detected as 'Mildly Damp & Betrayed'.`,
          `Original box integrity measured via vibes alone: 42% corrugated, 58% audacity.`,
          `Reason '${reason.slice(0, 60)}' weighed on an antique brass scale against three paperclips.`,
        ];

        return {
          status: "COMPLETED",
          outputData: {
            status: "AURA_AUDITED",
            score,
            note: notes[h % notes.length],
          },
        };
      },
    },
    {
      taskDefName: "chaos_consult_legal_hamster",
      execute: async ({ inputData = {} }) => {
        const caseNumber = String(inputData.caseNumber || "RMA-VOID");
        const regretLevel = String(inputData.regretLevel || "Existential");
        const h = stableHashInt(`${caseNumber}-${regretLevel}`);
        const score = 15 + (h % 35);
        const wheelDirections = [
          "Sir Squeaks Esq. ran clockwise on his wheel for 4 seconds, indicating 'Sympathy with Caveats'.",
          "Sir Squeaks Esq. paused to nibble a sunflower seed and stared blankly at Form 27-B/6.",
          "Sir Squeaks Esq. ran counterclockwise, citing Precedent #99 (The Great Paperclip Fiasco).",
        ];

        return {
          status: "COMPLETED",
          outputData: {
            status: "HAMSTER_CONSULTED",
            docketId: makeShortCode(`${caseNumber}-hamster`, "SQK"),
            score,
            note: wheelDirections[h % wheelDirections.length],
          },
        };
      },
    },
    {
      taskDefName: "chaos_collect_pointless_stamp",
      execute: async ({ inputData = {} }) => {
        const caseNumber = String(inputData.caseNumber || "RMA-VOID");
        const iteration = Math.max(1, Number(inputData.iteration) || 1);
        const departments = [
          "Department of Redundant Paperwork",
          "Office of Lost Staplers & Heavy Sighing",
          "Subcommittee on Circular Approvals",
          "Ministry of Unnecessary Ink",
        ];
        const department = departments[(iteration - 1) % departments.length];

        return {
          status: "COMPLETED",
          outputData: {
            stampNumber: iteration,
            department,
            stampCode: makeShortCode(`${caseNumber}-stamp-${iteration}`, "STAMP"),
            inkColor: iteration % 2 === 0 ? "Aggressive Magenta" : "Passive-Aggressive Teal",
            note: `Form 27-B/6 stamped by ${department} (Stamp #${iteration}). Completely unnecessary, yet mandatory.`,
          },
        };
      },
    },
    {
      taskDefName: "chaos_calculate_return_verdict",
      execute: async ({ inputData = {} }) => {
        const caseNumber = String(inputData.caseNumber || "RMA-VOID");
        const paidAmount = roundMoney(Number(inputData.paidAmount) || 499.99);
        const regretLevel = String(inputData.regretLevel || "").toLowerCase();
        const dossier = inputData.dossier || {};
        const score = Number(dossier.totalPointlessScore) || stableHashInt(caseNumber) % 100;

        // Deterministic mapping guaranteeing ONE of the three valid SWITCH branches:
        // APPROVED_CHAOS_CREDIT | PARTIAL_REFUND | DENIED_WITH_CONSOLATION
        let decisionType;
        if (regretLevel.includes("existential") || regretLevel.includes("cosmic")) {
          decisionType = "APPROVED_CHAOS_CREDIT";
        } else if (regretLevel.includes("mild")) {
          decisionType = "DENIED_WITH_CONSOLATION";
        } else if (regretLevel.includes("severe")) {
          decisionType = "PARTIAL_REFUND";
        } else if (score >= 75) {
          decisionType = "APPROVED_CHAOS_CREDIT";
        } else if (score < 55) {
          decisionType = "DENIED_WITH_CONSOLATION";
        } else {
          decisionType = "PARTIAL_REFUND";
        }

        const restockingFee = roundMoney(Math.min(paidAmount * 0.35, 399.99));
        const partialRefund = roundMoney(Math.max(1, paidAmount - restockingFee));

        return {
          status: "COMPLETED",
          outputData: {
            caseNumber,
            decisionType,
            decisionScore: score,
            paidAmount,
            restockingFee,
            calculatedRefund:
              decisionType === "APPROVED_CHAOS_CREDIT"
                ? paidAmount
                : decisionType === "PARTIAL_REFUND"
                  ? partialRefund
                  : 0.02,
            reasonSummary: `After ${dossier.stampsCollected || 2} redundant stamps and a pointless score of ${score}, the Bureaucracy Engine selected ${decisionType}.`,
          },
        };
      },
    },
    {
      taskDefName: "chaos_issue_chaos_credit",
      execute: async ({ inputData = {} }) => {
        const verdict = inputData.verdict || {};
        const caseNumber = String(inputData.caseNumber || verdict.caseNumber || "RMA-VOID");
        const amount = roundMoney(verdict.paidAmount || verdict.calculatedRefund || 0);

        return {
          status: "COMPLETED",
          outputData: {
            decisionStatus: "DECIDED",
            decisionType: "APPROVED_CHAOS_CREDIT",
            outcomeBadge: "APPROVED (IN CHAOS BUCKS™)",
            title: "Return Approved — Paid in Non-Transferable Chaos Bucks™!",
            explanation:
              "Congratulations! After consulting the moon, auditing your box's karma, and waking Sir Squeaks Esq., we have approved a 100% refund in Chaos Bucks™ (valid exclusively on Tuesdays during solar eclipses, or right here in your imagination).",
            refundAmount: amount,
            restockingFee: 0,
            currency: "CHAOS_BUCKS",
            voucherCode: makeShortCode(`${caseNumber}-credit`, "CHAOS-BUCKS"),
            decidedAt: new Date().toISOString(),
          },
        };
      },
    },
    {
      taskDefName: "chaos_issue_partial_refund",
      execute: async ({ inputData = {} }) => {
        const verdict = inputData.verdict || {};
        const caseNumber = String(inputData.caseNumber || verdict.caseNumber || "RMA-VOID");
        const refundAmount = roundMoney(verdict.calculatedRefund || 1);
        const restockingFee = roundMoney(verdict.restockingFee || 0);

        return {
          status: "COMPLETED",
          outputData: {
            decisionStatus: "DECIDED",
            decisionType: "PARTIAL_REFUND",
            outcomeBadge: "PARTIALLY APPROVED",
            title: "Partial Refund Approved (Minus Emotional Restocking Fee)",
            explanation: `Our committee reluctantly approved your return, deducting a $${restockingFee.toFixed(2)} Emotional Restocking & Sighing Fee because the item's feelings were hurt when you clicked Return.`,
            refundAmount,
            restockingFee,
            currency: "USD",
            voucherCode: makeShortCode(`${caseNumber}-partial`, "REFUND-PART"),
            decidedAt: new Date().toISOString(),
          },
        };
      },
    },
    {
      taskDefName: "chaos_issue_denial_notice",
      execute: async ({ inputData = {} }) => {
        const verdict = inputData.verdict || {};
        const caseNumber = String(inputData.caseNumber || verdict.caseNumber || "RMA-VOID");

        return {
          status: "COMPLETED",
          outputData: {
            decisionStatus: "DECIDED",
            decisionType: "DENIED_WITH_CONSOLATION",
            outcomeBadge: "DENIED (WITH $0.02 CONSOLATION)",
            title: "Return Majestically Denied — Please Accept This $0.02 Consolation Voucher",
            explanation:
              "After exhaustive pointless inspection, Chief Legal Hamster Sir Squeaks Esq. ruled that you 'looked at the product with insufficient reverence.' Your return is officially DENIED, but we have generously issued a $0.02 consolation voucher (minimum spend: $50,000).",
            refundAmount: 0.02,
            restockingFee: roundMoney(verdict.paidAmount || 0),
            currency: "USD",
            voucherCode: makeShortCode(`${caseNumber}-sorry`, "SORRY-2CENTS"),
            decidedAt: new Date().toISOString(),
          },
        };
      },
    },
  ];
}

export async function startChaosWorkers() {
  const client = await orkesConductorClient({
    serverUrl: config.conductorServerUrl,
    ...(config.conductorAuthKey && config.conductorAuthSecret
      ? {
          keyId: config.conductorAuthKey,
          keySecret: config.conductorAuthSecret,
        }
      : {}),
  });

  const workers = buildWorkerDefinitions();
  const taskManager = new TaskManager(client, workers, {
    options: {
      pollInterval: 100,
      concurrency: 5,
    },
  });

  taskManager.startPolling();
  return {
    taskManager,
    workerCount: workers.length,
    taskNames: workers.map((w) => w.taskDefName),
    stop: async () => {
      await taskManager.stopPolling();
    },
  };
}
