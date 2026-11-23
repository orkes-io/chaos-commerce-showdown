import { orkesConductorClient, TaskManager } from "@io-orkes/conductor-javascript";
import { evaluatePromoCode, getProductById, getShippingMethod } from "./catalog.mjs";
import { loadConfig } from "./config.mjs";

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function stableHash(str) {
  let h = 2166136261;
  const s = String(str || "");
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function shortCode(prefix, seed) {
  const num = (stableHash(seed) % 9000) + 1000;
  return `${prefix}-${num}`;
}

async function theatricalPause(ms) {
  if (ms > 0) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export function createWorkerDefinitions(config = loadConfig()) {
  const delay = config.stepDelayMs;

  return [
    // --- CHECKOUT WORKFLOW WORKERS ---
    {
      taskDefName: "validate_cart_insanity",
      execute: async (task) => {
        await theatricalPause(delay);
        const input = task.inputData || {};
        const rawItems = Array.isArray(input.items) ? input.items : [];
        const normalizedItems = rawItems
          .map((item) => {
            const product = getProductById(item.productId || item.id);
            const qty = Math.max(1, Math.min(99, Number.parseInt(item.quantity, 10) || 1));
            const unitPrice = product ? product.price : Math.max(0.01, Number(item.price) || 99.99);
            return {
              productId: product ? product.id : String(item.productId || item.id || "mystery-item"),
              title: product ? product.title : String(item.title || "Unidentified Chaos Object"),
              sku: product ? product.sku : "CHS-MYST-999",
              quantity: qty,
              unitPrice: round2(unitPrice),
              lineTotal: round2(unitPrice * qty),
            };
          })
          .filter(Boolean);

        if (normalizedItems.length === 0) {
          normalizedItems.push({
            productId: "half-brick",
            title: "Half a Brick (Emergency Default Chaos Item)",
            sku: "CHS-BRK-006",
            quantity: 1,
            unitPrice: 640.0,
            lineTotal: 640.0,
          });
        }

        const subtotal = round2(normalizedItems.reduce((sum, i) => sum + i.lineTotal, 0));
        const itemCount = normalizedItems.reduce((sum, i) => sum + i.quantity, 0);
        const shipping = getShippingMethod(input.shippingMethod);
        const promo = evaluatePromoCode(input.promoCode, subtotal);
        const orderId =
          String(input.orderId || "").trim() ||
          shortCode("CHS-ORD", `${task.workflowInstanceId || Date.now()}-${input.customerName}`);

        return {
          status: "COMPLETED",
          outputData: {
            orderId,
            normalizedItems,
            itemCount,
            subtotal,
            shippingMethod: shipping.id,
            shippingLabel: shipping.name,
            shippingCost: round2(shipping.price),
            promoCode: promo.code,
            promoAdjustment: round2(promo.adjustment),
            promoNote: promo.note,
            insanityCertified: true,
          },
        };
      },
    },

    {
      taskDefName: "fabricate_hidden_fees",
      execute: async (task) => {
        await theatricalPause(delay);
        const input = task.inputData || {};
        const subtotal = Number(input.subtotal) || 0;
        const itemCount = Math.max(1, Number(input.itemCount) || 1);
        const includeBox = input.includeCardboardBox !== false;
        const includeInsurance = Boolean(input.includeShippingInsurance);

        const fees = [
          {
            name: "Convenience Inconvenience Fee",
            amount: round2(Math.max(4.99, Math.min(49.99, subtotal * 0.03 + 4.99))),
            justification: "Covers the emotional toll of operating an e-commerce website.",
          },
          {
            name: "Pixel Delivery Surcharge",
            amount: round2(itemCount * 2.47),
            justification: "Each product photo was hand-rendered using artisanal pixels.",
          },
          {
            name: "Gravity Compliance Levy",
            amount: 8.88,
            justification: "Required by physics to keep your package near the planet's surface.",
          },
          {
            name: "CEO Yacht Fuel Surcharge",
            amount: 14.5,
            justification: "Premium unleaded maritime fuel isn't going to buy itself.",
          },
        ];

        if (includeBox) {
          fees.push({
            name: "Optional Cardboard Box (Mandatory)",
            amount: 42.0,
            justification: "Otherwise we toss your items loose from a moving van.",
          });
        }

        if (includeInsurance) {
          fees.push({
            name: "Insurance Against Our Own Shipping",
            amount: 19.99,
            justification: "Covers 0% of damages caused by pigeons, catapults, or Kyle.",
          });
        }

        const hiddenFeesTotal = round2(fees.reduce((sum, f) => sum + f.amount, 0));
        return {
          status: "COMPLETED",
          outputData: {
            fees,
            hiddenFeesTotal,
            feeAuditorNote: `Successfully invented ${fees.length} inescapable fees totaling $${hiddenFeesTotal.toFixed(2)}.`,
          },
        };
      },
    },

    {
      taskDefName: "verify_warehouse_rumor",
      execute: async (task) => {
        await theatricalPause(delay);
        const input = task.inputData || {};
        const orderId = String(input.orderId || "CHS-ORD-0000");
        const aisles = ["Aisle 404 (Behind the Broken Forklift)", "Warehouse B (Puddle Zone)", "Loading Dock Roof", "Brenda's Ficus Corner"];
        const chosenAisle = aisles[stableHash(orderId) % aisles.length];

        return {
          status: "COMPLETED",
          outputData: {
            inStockRumor: "PROBABLE_ENOUGH",
            warehouseLocation: chosenAisle,
            warehouseNote: `Intern shouted 'yeah I think I saw one near ${chosenAisle}!' Shipping proceeds regardless.`,
          },
        };
      },
    },

    {
      taskDefName: "charge_questionable_payment",
      execute: async (task) => {
        await theatricalPause(delay);
        const input = task.inputData || {};
        const orderId = String(input.orderId || "CHS-ORD-0000");
        const method = String(input.paymentMethod || "Imaginary Credit Card");
        const authCode = shortCode("AUTH-YIKES", `${orderId}-${method}`);

        return {
          status: "COMPLETED",
          outputData: {
            authorized: true,
            paymentMethod: method,
            authorizationCode: authCode,
            receiptStamp: "APPROVED WITH ZERO REMORSE",
            billingNote: `Simulated charge accepted via ${method}. No real money was harmed during this parody.`,
          },
        };
      },
    },

    {
      taskDefName: "dispatch_carrier_pigeon",
      execute: async (task) => {
        await theatricalPause(delay);
        const input = task.inputData || {};
        const orderId = String(input.orderId || "CHS-ORD");
        return {
          status: "COMPLETED",
          outputData: {
            carrier: "Chaos Avian Freight — Pigeon #17 (Barnaby)",
            trackingCode: shortCode("PIGEON", orderId),
            eta: "4–6 business months (weather & breadcrumbs permitting)",
            dispatchNote: `Barnaby has been strapped to your invoice and pointed roughly toward ${input.shippingAddress || "somewhere"}.`,
          },
        };
      },
    },

    {
      taskDefName: "calibrate_delivery_catapult",
      execute: async (task) => {
        await theatricalPause(delay);
        const input = task.inputData || {};
        const orderId = String(input.orderId || "CHS-ORD");
        return {
          status: "COMPLETED",
          outputData: {
            carrier: "Chaos Siege Logistics — Trebuchet Mk. IV",
            trackingCode: shortCode("YEET", orderId),
            eta: "3.2 seconds (please step away from skylights)",
            dispatchNote: `Counterweight locked for ${input.shippingAddress || "your approximate zip code"}. Roof insurance not included.`,
          },
        };
      },
    },

    {
      taskDefName: "brief_walking_intern",
      execute: async (task) => {
        await theatricalPause(delay);
        const input = task.inputData || {};
        const orderId = String(input.orderId || "CHS-ORD");
        return {
          status: "COMPLETED",
          outputData: {
            carrier: "Kyle on Foot (Departing Reno, NV)",
            trackingCode: shortCode("KYLE", orderId),
            eta: "Whenever Kyle stops getting lost",
            dispatchNote: `Kyle was handed a 2004 road atlas and pointed toward ${input.shippingAddress || "your general direction"}.`,
          },
        };
      },
    },

    {
      taskDefName: "dispatch_standard_chaos",
      execute: async (task) => {
        await theatricalPause(delay);
        const input = task.inputData || {};
        const orderId = String(input.orderId || "CHS-ORD");
        return {
          status: "COMPLETED",
          outputData: {
            carrier: "FREE Shipping (Which Somehow Cost $37.50)",
            trackingCode: shortCode("FREEISH", orderId),
            eta: "7–90 business fortnights",
            dispatchNote: `Box loaded onto an unmarked van headed vaguely toward ${input.shippingAddress || "your neighborhood"}.`,
          },
        };
      },
    },

    {
      taskDefName: "finalize_chaos_order",
      execute: async (task) => {
        await theatricalPause(delay);
        const input = task.inputData || {};
        const totals = input.totals || {};
        const grandTotal = round2(
          totals.grandTotal ??
            (Number(totals.subtotal) || 0) +
              (Number(totals.shippingCost) || 0) +
              (Number(totals.promoAdjustment) || 0) +
              (Number(totals.hiddenFeesTotal) || 0)
        );

        return {
          status: "COMPLETED",
          outputData: {
            orderId: input.orderId || shortCode("CHS-ORD", task.workflowInstanceId),
            status: "COMPLETED_NO_TAKEBACKS",
            certificateTitle: "Official Certificate of Financial Regret",
            customerName: input.customerName || "Valued Victim",
            customerEmail: input.customerEmail || "regret@example.invalid",
            shippingAddress: input.shippingAddress || "Somewhere Regrettable",
            items: Array.isArray(input.items) ? input.items : [],
            promoCode: input.promoCode || "",
            promoNote: input.promoNote || "",
            fees: Array.isArray(input.fees) ? input.fees : [],
            totals: {
              subtotal: round2(totals.subtotal),
              shippingCost: round2(totals.shippingCost),
              promoAdjustment: round2(totals.promoAdjustment),
              hiddenFeesTotal: round2(totals.hiddenFeesTotal),
              grandTotal,
            },
            grandTotal,
            shipping: {
              carrier: input.shippingCarrier || "Chaos Standard Freight",
              trackingCode: input.shippingTracking || shortCode("CHAOS", input.orderId),
              eta: input.shippingEta || "Eventually, maybe",
              note: input.shippingNote || "Dispatched with enthusiasm and zero bubble wrap.",
            },
            payment: input.paymentReceipt || {
              authorized: true,
              authorizationCode: shortCode("AUTH-YIKES", input.orderId),
              receiptStamp: "APPROVED WITH ZERO REMORSE",
            },
            warehouseNote:
              (input.warehouseReport && input.warehouseReport.warehouseNote) ||
              "Probably located in Warehouse B.",
            completedAt: new Date().toISOString(),
          },
        };
      },
    },

    // --- RETURNS WORKFLOW WORKERS ---
    {
      taskDefName: "log_return_grievance",
      execute: async (task) => {
        await theatricalPause(delay);
        const input = task.inputData || {};
        const orderId = String(input.orderId || "CHS-ORD-UNKNOWN");
        const returnId = shortCode("RMA-NOPE", `${orderId}-${task.workflowInstanceId || Date.now()}`);
        const orderTotal = round2(Math.max(0.01, Number(input.orderTotal) || 99.99));

        return {
          status: "COMPLETED",
          outputData: {
            returnId,
            orderId,
            orderWorkflowId: input.orderWorkflowId || "",
            orderTotal,
            customerName: input.customerName || "Regretful Shopper",
            itemTitle: input.itemTitle || "Questionable Purchase",
            reason: input.reason || "General buyer's remorse",
            grievanceStatus: "DOSSIER_OPENED_WITH_SIGH",
            loggedAt: new Date().toISOString(),
          },
        };
      },
    },

    {
      taskDefName: "consult_warehouse_ficus",
      execute: async (task) => {
        await theatricalPause(delay);
        const input = task.inputData || {};
        const seed = `${input.returnId}-${input.reason}-${input.itemTitle}`;
        const h = stableHash(seed);
        const score = 50 + (h % 46); // 50..95
        const passed = score >= 68;
        const findings = passed
          ? "Brenda the Warehouse Ficus leaned 2 millimeters toward the window. We interpret this as reluctant botanical tolerance."
          : "Brenda the Warehouse Ficus dropped a single crispy leaf upon hearing your return reason. She is unimpressed.";

        return {
          status: "COMPLETED",
          outputData: {
            checkName: "Botanical Approval Audit",
            department: "Office Plant Advisory Board (Brenda)",
            passed,
            score,
            absurdFinding: findings,
          },
        };
      },
    },

    {
      taskDefName: "audit_lunar_alignment",
      execute: async (task) => {
        await theatricalPause(delay);
        const input = task.inputData || {};
        const zodiac = String(input.zodiacSign || "Libra");
        const moonlightConfirmed = Boolean(input.moonlightConfirmed);
        const isOphiuchus = zodiac.toLowerCase().includes("ophiuchus");

        let score = 85;
        let absurdFinding = `Moonlight non-exposure sworn under penalty of spam email. ${zodiac} aligns acceptably with Warehouse B's fluorescent tubes.`;

        if (!moonlightConfirmed) {
          score = 25;
          absurdFinding =
            "Shopper failed to swear item avoided moonlight. Potential werewolf contamination flagged on Form 88-LUNA.";
        } else if (isOphiuchus) {
          score = 52;
          absurdFinding =
            "Illegal 13th zodiac sign (Ophiuchus) detected. Astrological compliance officer demanded an automatic penalty.";
        }

        return {
          status: "COMPLETED",
          outputData: {
            checkName: "Lunar & Zodiac Compliance",
            department: "Bureau of Horoscope Logistics",
            passed: score >= 60,
            score,
            absurdFinding,
          },
        };
      },
    },

    {
      taskDefName: "measure_box_karma",
      execute: async (task) => {
        await theatricalPause(delay);
        const input = task.inputData || {};
        const boxAirPreserved = Boolean(input.boxAirPreserved);
        const apologyWords = String(input.apologyText || "")
          .trim()
          .split(/\s+/)
          .filter(Boolean).length;

        let score = 25;
        let absurdFinding =
          "Original Warehouse B air escaped the box and apology lacked sufficient groveling.";

        if (boxAirPreserved && apologyWords >= 3) {
          score = 92;
          absurdFinding = `Original box air intact and ${apologyWords}-word apology brought a tiny tear to our shredder technician's eye.`;
        } else if (boxAirPreserved || apologyWords >= 3) {
          score = 58;
          absurdFinding = boxAirPreserved
            ? `Original box air preserved, but your ${apologyWords}-word apology felt passive-aggressive.`
            : "Apology was heartfelt, yet you recklessly let our proprietary Reno air out of the box.";
        }

        return {
          status: "COMPLETED",
          outputData: {
            checkName: "Box Air & Apology Sincerity Scan",
            department: "Atmospheric Packaging Forensics",
            passed: score >= 65,
            score,
            absurdFinding,
          },
        };
      },
    },

    {
      taskDefName: "verify_vibe_certificate",
      execute: async (task) => {
        await theatricalPause(delay);
        const input = task.inputData || {};
        const spiderPassed = Boolean(input.spiderChecksPassed);
        const score = spiderPassed ? 84 : 30;
        const absurdFinding = spiderPassed
          ? "Shopper correctly identified all non-spider checkboxes. Form 1099-REGRET vibes authenticated."
          : "Shopper suspiciously skipped the Anti-Spider Captcha. Compliance suspects arachnid interference.";

        return {
          status: "COMPLETED",
          outputData: {
            checkName: "Form 1099-REGRET & Anti-Spider Verification",
            department: "Department of Un-Buying",
            passed: spiderPassed,
            score,
            absurdFinding,
          },
        };
      },
    },

    {
      taskDefName: "stamp_form_in_triplicate",
      execute: async (task) => {
        await theatricalPause(delay);
        const input = task.inputData || {};
        const round = Number(task.iteration || input.iteration || 1);
        const stages = {
          1: {
            desk: "Desk 1A — Department of Returns",
            action: "Stamped 'WRONG DESK' in beige ink and forwarded across the hallway.",
          },
          2: {
            desk: "Desk 404B — Subcommittee on Second Thoughts",
            action: "Photocopied onto neon yellow cardstock, stapled sideways, and faxed to 1997.",
          },
          3: {
            desk: "Desk 9Z — Receiving Raccoon Notary",
            action: "Triplicate copy notarized with a paw print; original filed directly into shredder.",
          },
        };
        const stage = stages[round] || stages[3];

        return {
          status: "COMPLETED",
          outputData: {
            returnId: input.returnId || "RMA-NOPE",
            round,
            desk: stage.desk,
            stampAction: stage.action,
            bureaucracySatisfied: true,
          },
        };
      },
    },

    {
      taskDefName: "issue_restocking_fee_refund",
      execute: async (task) => {
        await theatricalPause(delay);
        const input = task.inputData || {};
        const orderTotal = round2(Math.max(0.01, Number(input.orderTotal) || 100));
        const restockingFee = round2(orderTotal * 0.42);
        const refundAmount = round2(Math.max(0.01, orderTotal - restockingFee));

        return {
          status: "COMPLETED",
          outputData: {
            decision: "APPROVED_WITH_RESTOCKING_FEE",
            decisionLabel: "APPROVED (Minus 42% Emotional Restocking Fee)",
            refundAmount,
            storeCreditAmount: 0,
            restockingFee,
            couponCode: "",
            decreeHeadline: `Congratulations, ${input.customerName || "Shopper"}! Your return is APPROVED—with a catch!`,
            decreeLetter: `Against all odds, you survived our bureaucratic gauntlet with a Pointless Compliance Score of ${input.totalScore}/400. We are refunding $${refundAmount.toFixed(2)} after deducting our standard 42% Emotional Restocking Fee ($${restockingFee.toFixed(2)}) to comfort Warehouse B.`,
            nextSteps:
              "Tape the item to any passing pigeon or simply keep it as a souvenir; your simulated partial refund decree is final.",
          },
        };
      },
    },

    {
      taskDefName: "issue_cursed_store_credit",
      execute: async (task) => {
        await theatricalPause(delay);
        const input = task.inputData || {};
        const orderTotal = round2(Math.max(0.01, Number(input.orderTotal) || 100));
        const creditAmount = round2(orderTotal * 0.73);
        const voucherCode = shortCode("TUE-2AM", input.returnId);

        return {
          status: "COMPLETED",
          outputData: {
            decision: "APPROVED_STORE_CREDIT",
            decisionLabel: "APPROVED FOR CURSED STORE CREDIT",
            refundAmount: 0,
            storeCreditAmount: creditAmount,
            restockingFee: round2(orderTotal - creditAmount),
            couponCode: voucherCode,
            decreeHeadline: `Partial Victory! You earned $${creditAmount.toFixed(2)} in Chaos Store Credit!`,
            decreeLetter: `Your Pointless Compliance Score (${input.totalScore}/400) fell squarely in our 'Almost Acceptable' zone. Instead of cash, we proudly award voucher ${voucherCode} worth $${creditAmount.toFixed(2)} in Chaos Store Credit—redeemable exclusively on Tuesdays between 2:00 AM and 2:04 AM GMT.`,
            nextSteps: `Guard voucher ${voucherCode} with your life. No cash value. Valid only on overpriced damp socks and bricks.`,
          },
        };
      },
    },

    {
      taskDefName: "issue_denial_with_coupon",
      execute: async (task) => {
        await theatricalPause(delay);
        const input = task.inputData || {};
        const couponCode = shortCode("SORRY17C", input.returnId);

        return {
          status: "COMPLETED",
          outputData: {
            decision: "DENIED_WITH_COUPON",
            decisionLabel: "DENIED ON TECHNICALITY (+ $0.17 Consolation Coupon)",
            refundAmount: 0,
            storeCreditAmount: 0,
            restockingFee: 0,
            couponCode,
            decreeHeadline: "RETURN DENIED — Please Keep Your Regret Forever",
            decreeLetter: `After thorough consultation with Brenda the Ficus and three rounds of unnecessary stamping, your Pointless Compliance Score of ${input.totalScore}/400 failed to meet our arbitrary vibes threshold. As a token of our towering generosity, please accept coupon ${couponCode} for $0.17 off your next order of $9,000 or more.`,
            nextSteps:
              "This decision is final, binding, and has been laminated. Feel free to leave us a furious 5-star review!",
          },
        };
      },
    },

    {
      taskDefName: "seal_return_decree",
      execute: async (task) => {
        await theatricalPause(delay);
        const input = task.inputData || {};
        const summary = input.checksSummary || {};

        return {
          status: "COMPLETED",
          outputData: {
            returnId: input.returnId || shortCode("RMA-NOPE", task.workflowInstanceId),
            orderId: input.orderId || "CHS-ORD-UNKNOWN",
            orderWorkflowId: input.orderWorkflowId || "",
            customerName: input.customerName || "Regretful Shopper",
            itemTitle: input.itemTitle || "Questionable Purchase",
            reason: input.reason || "Unspecified regret",
            decision: input.finalDecision || "APPROVED_STORE_CREDIT",
            decisionLabel: input.decisionLabel || "DECISION REACHED",
            refundAmount: round2(input.refundAmount),
            storeCreditAmount: round2(input.storeCreditAmount),
            restockingFee: round2(input.restockingFee),
            couponCode: input.couponCode || "",
            decreeHeadline: input.decreeHeadline || "Official Chaos Return Decree",
            decreeLetter: input.decreeLetter || "The bureaucracy has spoken.",
            nextSteps: input.nextSteps || "Please respect the decree.",
            checks: Array.isArray(summary.checks) ? summary.checks : [],
            totalPointlessScore: Number(summary.totalScore) || 0,
            passedCheckCount: Number(summary.passedCount) || 0,
            redTapeRounds: Number(input.redTapeRounds) || 3,
            decidedAt: new Date().toISOString(),
          },
        };
      },
    },
  ];
}

export async function startChaosWorkers(config = loadConfig()) {
  const clientConfig = {
    serverUrl: config.conductorServerUrl,
  };
  if (config.conductorAuthKey && config.conductorAuthSecret) {
    clientConfig.keyId = config.conductorAuthKey;
    clientConfig.keySecret = config.conductorAuthSecret;
  }

  const client = await orkesConductorClient(clientConfig);
  const workers = createWorkerDefinitions(config);

  const taskManager = new TaskManager(client, workers, {
    options: {
      pollInterval: 100,
      concurrency: 4,
    },
    logger: {
      info: () => {},
      debug: () => {},
      error: (...args) => console.error("[Chaos Worker Error]", ...args),
    },
  });

  taskManager.startPolling();

  return {
    taskManager,
    workerCount: workers.length,
    taskNames: workers.map((w) => w.taskDefName),
    async stop() {
      await taskManager.stopPolling();
    },
  };
}
