import test from 'node:test';
import assert from 'node:assert/strict';
import {
  openOrder, priceOrder, attemptPayment, settlePayment, packOrder,
  intakeReturn, runPointlessCheck, tallyChecks, decideReturn,
} from '../workflows/scripts.js';

const GARBAGE = [undefined, null, 0, -1, 1.5, NaN, Infinity, '', 'x', true, [], {}, [null], [{}], { length: 3 }, 'a string with length'];

test('priceOrder: total is the subtotal plus every listed fee', () => {
  for (let seed = 0; seed < 200; seed++) {
    const result = priceOrder({
      seed,
      items: [
        { productId: 'yacht', name: 'Yacht', emoji: '🛥️', unitPriceCents: 3, quantity: 2 },
        { productId: 'paperclip', name: 'Paperclip', emoji: '📎', unitPriceCents: 129999900, quantity: 99 },
      ],
    });
    assert.equal(result.subtotalCents, 6 + 129999900 * 99);
    assert.equal(result.itemCount, 101);
    assert.equal(result.feesCents, result.fees.reduce((sum, fee) => sum + fee.amountCents, 0));
    assert.equal(result.totalCents, result.subtotalCents + result.feesCents);
    assert.ok(Number.isSafeInteger(result.totalCents));
    for (const fee of result.fees) assert.ok(Number.isInteger(fee.amountCents) && fee.amountCents > 0, fee.label);
  }
});

test('priceOrder: an empty cart is still an order, with a fee for handling nothing', () => {
  const result = priceOrder({ seed: 7, items: [] });
  assert.deepEqual(result.lines, []);
  assert.equal(result.subtotalCents, 0);
  assert.ok(result.fees.some((fee) => fee.code === 'NOTHING_HANDLING'));
  assert.equal(result.totalCents, result.feesCents);
});

test('priceOrder: drops unusable lines and clamps quantities instead of failing', () => {
  const result = priceOrder({
    seed: 1,
    items: [null, { quantity: 0 }, { quantity: -4, unitPriceCents: 5 }, { quantity: 1000, unitPriceCents: 10 }, { quantity: 2, unitPriceCents: 'free' }],
  });
  assert.deepEqual(result.lines.map((line) => [line.quantity, line.unitPriceCents, line.lineTotalCents]), [[99, 10, 990], [2, 0, 0]]);
  assert.equal(result.lines[0].name, 'Unidentified Item');
});

test('every script returns a result for any input, however broken', () => {
  const scripts = [openOrder, priceOrder, attemptPayment, settlePayment, packOrder, intakeReturn, runPointlessCheck, tallyChecks, decideReturn];
  for (const script of scripts) {
    assert.ok(script({}), `${script.name}({})`);
    for (const junk of GARBAGE) {
      const $ = {
        seed: junk, items: junk, lines: junk, loop: junk, iteration: junk, customerName: junk, workflowId: junk, totalCents: junk,
        orderState: 'FOUND', orderLines: junk, productId: junk, quantity: junk, alreadyReturnedQty: junk, reason: junk,
        regretLevel: junk, triedLikingIt: junk, productName: junk, eligible: junk, code: junk, refundableCents: junk,
        passed: junk, failed: junk, inconclusive: junk, managerNudged: junk,
      };
      const result = script($);
      assert.equal(typeof result, 'object', `${script.name} with ${String(junk)}`);
      assert.doesNotThrow(() => JSON.stringify(result));
    }
  }
});

test('payment: every seed is approved by attempt 3, inside the loop cap of 4', () => {
  for (let seed = 0; seed < 500; seed++) {
    const loop = {};
    let approvedAt = 0;
    for (let iteration = 1; iteration <= 4 && !approvedAt; iteration++) {
      const result = attemptPayment({ iteration, seed });
      loop[String(iteration)] = { attempt_payment: { result } };
      if (result.approved) approvedAt = iteration;
      else assert.match(result.message, /^Declined/);
    }
    assert.ok(approvedAt >= 1 && approvedAt <= 3, `seed ${seed} approved at ${approvedAt}`);
    const settled = settlePayment({ loop, totalCents: 1234 });
    assert.equal(settled.approved, true);
    assert.equal(settled.attempts.length, approvedAt);
    assert.equal(settled.amountCents, 1234);
  }
});

test('settlePayment: approves by hand if the loop somehow never did', () => {
  const declined = { attempt_payment: { result: { attempt: 1, approved: false, message: 'Declined: no.' } } };
  for (const loop of [null, {}, { 1: declined, 2: declined, 3: declined, 4: declined, iteration: 4 }]) {
    const settled = settlePayment({ loop, totalCents: 500 });
    assert.equal(settled.approved, true);
    assert.equal(settled.attempts.at(-1).approved, true);
  }
});

test('packOrder: one parcel per line, or an empty box for an empty cart', () => {
  const packed = packOrder({ seed: 3, lines: [{ productId: 'a', name: 'A', quantity: 2 }, { productId: 'b', name: 'B', quantity: 1 }] });
  assert.deepEqual(packed.parcels.map((parcel) => [parcel.productId, parcel.quantity]), [['a', 2], ['b', 1]]);
  assert.match(packed.trackingNumber, /^[A-Z]+-\d{7}$/);
  assert.equal(packOrder({ seed: 3, lines: [] }).parcels[0].productId, 'empty-box');
});

test('openOrder: order number comes from the workflow id; a missing name gets a default', () => {
  const opened = openOrder({ customerName: '  Jordan ', workflowId: 'e8c41f19-4a61-4d2b', seed: 9 });
  assert.equal(opened.orderNumber, 'CC-E8C41F19');
  assert.equal(opened.customerName, 'Jordan');
  assert.equal(openOrder({ seed: 9 }).customerName, 'Valued Stranger');
});

const ORDER_LINES = [{ productId: 'yacht', name: 'Yacht', quantity: 3, unitPriceCents: 3 }];
const intake = (overrides) => intakeReturn({ orderState: 'FOUND', orderLines: ORDER_LINES, productId: 'yacht', quantity: 1, alreadyReturnedQty: 0, reason: 'other', ...overrides });

test('intakeReturn: eligibility rules', () => {
  assert.deepEqual(
    (({ eligible, code, refundableCents, purchasedQty }) => ({ eligible, code, refundableCents, purchasedQty }))(intake({ quantity: 2 })),
    { eligible: true, code: 'ELIGIBLE', refundableCents: 6, purchasedQty: 3 },
  );
  assert.equal(intake({ orderState: 'NOT_FOUND' }).code, 'ORDER_NOT_FOUND');
  assert.equal(intake({ orderState: undefined }).code, 'ORDER_NOT_FOUND');
  assert.equal(intake({ orderState: 'NOT_CONFIRMED' }).code, 'ORDER_NOT_CONFIRMED');
  assert.equal(intake({ productId: 'ladder' }).code, 'ITEM_NOT_IN_ORDER');
  assert.equal(intake({ quantity: 4 }).code, 'NOTHING_LEFT_TO_RETURN');
  assert.equal(intake({ quantity: 2, alreadyReturnedQty: 2 }).code, 'NOTHING_LEFT_TO_RETURN');
  assert.equal(intake({ quantity: 1, alreadyReturnedQty: 2 }).eligible, true);
  assert.equal(intake({ reason: 'made-up' }).reason, 'other');
  for (const result of [intake({ orderState: 'NOT_FOUND' }), intake({ quantity: 4 }), intake({ productId: 'ladder' })]) {
    assert.equal(result.eligible, false);
    assert.equal(result.refundableCents, 0);
  }
});

test('decideReturn: the policy table', () => {
  const decide = (overrides) => decideReturn({ eligible: true, code: 'ELIGIBLE', reason: 'arrived_on_fire', productName: 'Yacht', refundableCents: 600, ...overrides });
  assert.deepEqual((({ decision, code, refundCents }) => ({ decision, code, refundCents }))(decide({})), { decision: 'APPROVED', code: 'REFUND', refundCents: 600 });
  assert.deepEqual((({ decision, code, refundCents }) => ({ decision, code, refundCents }))(decide({ reason: 'changed_mind' })), { decision: 'STORE_CREDIT', code: 'CHANGED_MIND', refundCents: 600 });
  assert.deepEqual((({ decision, code, refundCents }) => ({ decision, code, refundCents }))(decide({ reason: 'works_fine' })), { decision: 'DENIED', code: 'PRODUCT_WORKS', refundCents: 0 });
  for (const code of ['ORDER_NOT_FOUND', 'ORDER_NOT_CONFIRMED', 'ITEM_NOT_IN_ORDER', 'NOTHING_LEFT_TO_RETURN']) {
    const denied = decide({ eligible: false, code });
    assert.deepEqual([denied.decision, denied.code, denied.refundCents], ['DENIED', code, 0]);
    assert.ok(denied.explanation.length > 10);
  }
  assert.equal(decide({ eligible: false, code: 'toString' }).code, 'ORDER_NOT_FOUND');
});

test('decideReturn: the checks and the manager nudge never change the decision', () => {
  const base = { eligible: true, code: 'ELIGIBLE', reason: 'wrong_item', productName: 'Yacht', refundableCents: 9 };
  const reference = decideReturn(base);
  for (const extra of [{ passed: 7 }, { failed: 7 }, { inconclusive: 7 }, { managerNudged: true }, { passed: 0, failed: 0, managerNudged: false }]) {
    const result = decideReturn({ ...base, ...extra });
    assert.deepEqual([result.decision, result.code, result.refundCents], [reference.decision, reference.code, reference.refundCents]);
  }
  assert.notEqual(decideReturn({ ...base, managerNudged: true }).managerNote, reference.managerNote);
});

test('pointless checks: seven distinct checks, tallied without affecting anything', () => {
  const loop = {};
  for (let iteration = 1; iteration <= 7; iteration++) {
    loop[String(iteration)] = { run_pointless_check: { result: runPointlessCheck({ iteration, seed: 77, regretLevel: 9, triedLikingIt: true, productName: 'Yacht' }) } };
  }
  const tally = tallyChecks({ loop });
  assert.equal(tally.checks.length, 7);
  assert.equal(new Set(tally.checks.map((check) => check.name)).size, 7);
  assert.equal(tally.passed + tally.failed + tally.inconclusive, 7);
  assert.deepEqual(tallyChecks({ loop: null }), { checks: [], passed: 0, failed: 0, inconclusive: 0 });
});
