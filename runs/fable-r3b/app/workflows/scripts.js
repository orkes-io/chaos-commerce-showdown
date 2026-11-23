// Business logic for the INLINE tasks of both workflows.
//
// Each exported script is a plain function of `$` (the task's resolved
// inputParameters). `inline()` in ./lib.js turns it into a GraalJS expression,
// and test/scripts.test.js runs the very same functions in Node.
//
// Rules these functions follow so they behave the same in GraalJS and Node:
//   - they are total: any input, however broken, yields a result (no throws);
//   - objects from Conductor are Java-Map proxies, so fields are read by name
//     and results are rebuilt from scratch, never spread, copied or stringified;
//   - the only free identifiers are the helpers listed in HELPERS.

export function toInt(value, fallback) {
  return typeof value === 'number' && isFinite(value) ? Math.trunc(value) : fallback;
}

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function text(value, fallback) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim().slice(0, 240) : fallback;
}

export function listLength(value) {
  return value && typeof value !== 'string' && typeof value.length === 'number' ? value.length : 0;
}

// Deterministic non-negative integer from (seed, salt), so a workflow replays
// to the same jokes. Every intermediate value stays below 2^53.
export function mix(seed, salt) {
  var x = (Math.abs(toInt(seed, 0)) % 2147483647) + salt * 7919 + 17;
  x = (x * 48271) % 2147483647;
  x = (x * 48271) % 2147483647;
  return x;
}

export const HELPERS = [toInt, clamp, text, listLength, mix];

// ---------------------------------------------------------------- checkout

export function openOrder($) {
  var name = text($.customerName, 'Valued Stranger').slice(0, 80);
  var misspelt = name;
  if (name.length >= 3) {
    var at = mix($.seed, 3) % (name.length - 1);
    misspelt = name.slice(0, at) + name.charAt(at + 1) + name.charAt(at) + name.slice(at + 2);
  }
  var id = text($.workflowId, '').replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase();
  return {
    orderNumber: 'CC-' + (id || String(mix($.seed, 5) % 100000000)),
    customerName: name,
    greeting: 'Dear ' + misspelt + ' (we wrote your name down as best we could)',
  };
}

export function priceOrder($) {
  var raw = $.items;
  var count = listLength(raw);
  var lines = [];
  var subtotal = 0;
  var units = 0;
  for (var i = 0; i < count && lines.length < 25; i++) {
    var item = raw[i];
    if (!item) continue;
    var quantity = clamp(toInt(item.quantity, 0), 0, 99);
    if (quantity < 1) continue;
    var unitPrice = clamp(toInt(item.unitPriceCents, 0), 0, 100000000000);
    var lineTotal = quantity * unitPrice;
    lines.push({
      productId: text(item.productId, 'unidentified-item'),
      name: text(item.name, 'Unidentified Item'),
      emoji: text(item.emoji, '📦'),
      quantity: quantity,
      unitPriceCents: unitPrice,
      lineTotalCents: lineTotal,
    });
    subtotal += lineTotal;
    units += quantity;
  }

  var fees = [];
  if (units === 0) {
    fees.push({ code: 'NOTHING_HANDLING', label: 'Nothing Handling Fee (you bought nothing; it still needs handling)', amountCents: 999 });
  } else {
    fees.push({ code: 'CONVENIENCE', label: 'Convenience Fee (ours, not yours) 7.5%', amountCents: Math.round(subtotal * 0.075) });
    fees.push({ code: 'GRAVITY', label: 'Gravity Surcharge ($0.37 per item kept on the ground)', amountCents: units * 37 });
  }
  fees.push({ code: 'FEE_PROCESSING', label: 'Fee Processing Fee', amountCents: 499 });
  fees.push({ code: 'LOYALTY', label: 'Loyalty Discount (applied in reverse)', amountCents: 200 });
  var surprises = [
    { code: 'TUESDAY', label: 'Tuesday Tax (charged daily)', amountCents: 222 },
    { code: 'WEAR_AND_TEAR', label: 'Website Wear & Tear', amountCents: 111 },
    { code: 'SERVER_FEELINGS', label: 'Emotional Support for the Server', amountCents: 350 },
    { code: 'ROUNDING', label: 'Rounding Error (ours, kept)', amountCents: 1 },
    { code: 'CART_ALIGNMENT', label: 'Shopping Cart Wheel Alignment', amountCents: 675 },
  ];
  fees.push(surprises[mix($.seed, 11) % surprises.length]);

  var feesTotal = 0;
  for (var f = 0; f < fees.length; f++) feesTotal += fees[f].amountCents;

  return {
    lines: lines,
    itemCount: units,
    subtotalCents: subtotal,
    fees: fees,
    feesCents: feesTotal,
    totalCents: subtotal + feesTotal,
  };
}

// Attempt N of the payment loop. Approval is guaranteed by attempt 3 at the
// latest, which is below the loop cap of 4.
export function attemptPayment($) {
  var attempt = clamp(toInt($.iteration, 1), 1, 99);
  var approveOn = 1 + (mix($.seed, 1) % 3);
  if (attempt >= approveOn) {
    return { attempt: attempt, approved: true, message: 'Approved. The payment gateway got tired of arguing.' };
  }
  var declines = [
    'Declined: card number is too symmetrical.',
    'Declined: the bank says it has never heard of money.',
    'Declined: insufficient vibes.',
    'Declined: gateway timed out while admiring your total.',
    'Declined: please try the exact same thing again.',
  ];
  return { attempt: attempt, approved: false, message: declines[(mix($.seed, 20) + attempt) % declines.length] };
}

// Gathers the loop's attempts. If, against the arithmetic above, none was
// approved, the order is approved here anyway: checkout always completes.
export function settlePayment($) {
  var loop = $.loop || {};
  var attempts = [];
  var approved = false;
  for (var i = 1; i <= 4; i++) {
    var round = loop[String(i)];
    var result = round && round.attempt_payment ? round.attempt_payment.result : null;
    if (!result) continue;
    attempts.push({ attempt: toInt(result.attempt, i), approved: result.approved === true, message: text(result.message, '') });
    if (result.approved === true) approved = true;
  }
  if (!approved) {
    attempts.push({
      attempt: attempts.length + 1,
      approved: true,
      message: 'Approved by hand. An intern with a calculator overruled the gateway.',
    });
  }
  return {
    approved: true,
    attempts: attempts,
    amountCents: toInt($.totalCents, 0),
    method: 'The card we already have on file. Do not ask how.',
  };
}

export function packOrder($) {
  var lines = $.lines;
  var count = listLength(lines);
  var notes = [
    'Found behind a radiator.',
    'Located in a different, wrong warehouse.',
    'Packed lovingly, then dropped.',
    'Gift-wrapped in the previous customer\'s invoice.',
    'Still warm. We do not know why.',
    'Packed upside down for safety.',
  ];
  var parcels = [];
  for (var i = 0; i < count; i++) {
    var line = lines[i];
    if (!line) continue;
    parcels.push({
      productId: text(line.productId, 'unidentified-item'),
      name: text(line.name, 'Unidentified Item'),
      quantity: toInt(line.quantity, 1),
      note: notes[mix($.seed, 40 + i) % notes.length],
    });
  }
  if (parcels.length === 0) {
    parcels.push({ productId: 'empty-box', name: 'One (1) Empty Box', quantity: 1, note: 'Shipped as a courtesy. You bought nothing, and here it is.' });
  }
  var carriers = [
    { name: 'Dale (he has a van)', prefix: 'DALE' },
    { name: 'Carrier Pigeon (unionised)', prefix: 'COO' },
    { name: 'Trebuchet Express', prefix: 'YEET' },
    { name: 'A Series of Increasingly Smaller Trucks', prefix: 'TRUK' },
  ];
  var carrier = carriers[mix($.seed, 60) % carriers.length];
  return {
    parcels: parcels,
    carrier: carrier.name,
    trackingNumber: carrier.prefix + '-' + String(1000000 + (mix($.seed, 61) % 9000000)),
    eta: 'Between 3 and ' + (40 + (mix($.seed, 62) % 361)) + ' business days',
  };
}

// ----------------------------------------------------------------- returns

export function intakeReturn($) {
  var productId = text($.productId, '');
  var quantity = clamp(toInt($.quantity, 1), 1, 99);
  var already = clamp(toInt($.alreadyReturnedQty, 0), 0, 1000000);
  var knownReasons = ['arrived_on_fire', 'wrong_item', 'became_sentient', 'changed_mind', 'works_fine', 'other'];
  var reason = knownReasons.indexOf($.reason) >= 0 ? $.reason : 'other';

  var result = {
    eligible: false,
    code: 'ORDER_NOT_FOUND',
    orderNumber: text($.orderNumber, 'unknown'),
    productId: productId || 'unknown',
    productName: 'Unidentified Item',
    quantity: quantity,
    purchasedQty: 0,
    alreadyReturnedQty: already,
    unitPriceCents: 0,
    refundableCents: 0,
    reason: reason,
  };

  if ($.orderState === 'NOT_CONFIRMED') {
    result.code = 'ORDER_NOT_CONFIRMED';
    return result;
  }
  if ($.orderState !== 'FOUND') return result;

  var lines = $.orderLines;
  var count = listLength(lines);
  var line = null;
  for (var i = 0; i < count; i++) {
    if (lines[i] && productId && lines[i].productId === productId) line = lines[i];
  }
  if (!line) {
    result.code = 'ITEM_NOT_IN_ORDER';
    return result;
  }
  result.productName = text(line.name, 'Unidentified Item');
  result.purchasedQty = clamp(toInt(line.quantity, 0), 0, 99);
  result.unitPriceCents = clamp(toInt(line.unitPriceCents, 0), 0, 100000000000);
  if (already + quantity > result.purchasedQty) {
    result.code = 'NOTHING_LEFT_TO_RETURN';
    return result;
  }
  result.eligible = true;
  result.code = 'ELIGIBLE';
  result.refundableCents = result.unitPriceCents * quantity;
  return result;
}

// Check N of the bureaucracy loop. The verdicts are decoration: decideReturn
// never reads them.
export function runPointlessCheck($) {
  var index = clamp(toInt($.iteration, 1), 1, 7);
  var regret = clamp(toInt($.regretLevel, 5), 1, 10);
  var triedLikingIt = $.triedLikingIt === true;
  var product = text($.productName, 'the item');
  var checks = [
    { name: 'Receipt Aura Inspection', notes: ['The receipt gives off a faint beige aura.', 'Aura unreadable; receipt was printed in a bad mood.', 'Aura is fine. Suspiciously fine.'] },
    { name: 'Moon Phase Compatibility', notes: ['The moon was consulted and declined to comment.', 'Waxing gibbous. Returns are a waning activity.', 'Compatible, though the moon has concerns.'] },
    { name: 'Remote Box Smell Test', notes: ['Smells like a box, as far as we can tell from here.', 'We could not smell it from here.', 'Faint notes of cardboard and disappointment.'] },
    { name: 'Form 27B/6 Triplicate Verification', notes: ['All three copies disagree with each other.', 'Copy two was filed under "miscellaneous".', 'Verified, then lost.'] },
    { name: 'Have-You-Tried-Liking-It Review', notes: triedLikingIt
      ? ['You say you tried liking ' + product + '. We believe you were not trying hard enough.', 'Attempt to like it noted.', 'Liking attempt on record.']
      : ['You did not try liking ' + product + '. Noted in your permanent file.', 'No liking attempted. Bold.', 'Liking not attempted.'] },
    { name: 'Regret Level Calibration', notes: ['Regret level ' + regret + ' of 10 recorded. Regret levels are not used for anything.', 'Regret level ' + regret + ' is within tolerance of some other number.', 'Regret level ' + regret + ' recalibrated to ' + (11 - regret) + ' for consistency.'] },
    { name: 'Check That The Previous Checks Were Checked', notes: ['The previous checks were checked. This check was not.', 'Unable to confirm who checked the checks.', 'Checked.'] },
  ];
  var verdicts = ['PASS', 'FAIL', 'INCONCLUSIVE'];
  var check = checks[index - 1];
  return {
    index: index,
    name: check.name,
    verdict: verdicts[mix($.seed, 100 + index) % verdicts.length],
    note: check.notes[mix($.seed, 200 + index) % check.notes.length],
  };
}

export function tallyChecks($) {
  var loop = $.loop || {};
  var checks = [];
  var passed = 0;
  var failed = 0;
  var inconclusive = 0;
  for (var i = 1; i <= 7; i++) {
    var round = loop[String(i)];
    var result = round && round.run_pointless_check ? round.run_pointless_check.result : null;
    if (!result) continue;
    var verdict = text(result.verdict, 'INCONCLUSIVE');
    checks.push({ index: toInt(result.index, i), name: text(result.name, 'Unnamed Check'), verdict: verdict, note: text(result.note, '') });
    if (verdict === 'PASS') passed++;
    else if (verdict === 'FAIL') failed++;
    else inconclusive++;
  }
  return { checks: checks, passed: passed, failed: failed, inconclusive: inconclusive };
}

// The actual returns policy. Every path returns a decision.
export function decideReturn($) {
  var nudged = $.managerNudged === true;
  var manager = nudged
    ? 'The manager was woken up to look at this. The manager is annoyed. This changed nothing.'
    : 'Escalated to the manager. The manager was at lunch and did not respond, so we carried on without supervision.';
  var tally = toInt($.passed, 0) + ' passed, ' + toInt($.failed, 0) + ' failed, ' + toInt($.inconclusive, 0) +
    ' inconclusive. None of this had any bearing on the outcome.';
  var product = text($.productName, 'the item');
  var refundable = clamp(toInt($.refundableCents, 0), 0, 9000000000000);

  var out = { decision: 'DENIED', code: text($.code, 'ORDER_NOT_FOUND'), headline: '', explanation: '', refundCents: 0, refundMethod: 'None', managerNote: manager, checksSummary: tally };

  if ($.eligible !== true) {
    var reasons = {
      ORDER_NOT_FOUND: 'We have no record of that order, or, as far as we can tell, of you.',
      ORDER_NOT_CONFIRMED: 'That order has not finished being confirmed, so there is nothing to send back yet.',
      ITEM_NOT_IN_ORDER: 'That item is not part of that order. Returning things you did not buy from us is called "donating".',
      NOTHING_LEFT_TO_RETURN: 'You have already returned (or are already returning) every one of these you bought.',
    };
    if (!Object.prototype.hasOwnProperty.call(reasons, out.code)) out.code = 'ORDER_NOT_FOUND';
    out.headline = 'Return denied';
    out.explanation = reasons[out.code];
    return out;
  }
  if ($.reason === 'works_fine') {
    out.code = 'PRODUCT_WORKS';
    out.headline = 'Return denied';
    out.explanation = 'You told us ' + product + ' works exactly as described. Returns are for things that went wrong. Congratulations on your purchase.';
    return out;
  }
  if ($.reason === 'changed_mind') {
    out.decision = 'STORE_CREDIT';
    out.code = 'CHANGED_MIND';
    out.headline = 'Return approved as store credit';
    out.explanation = 'You changed your mind, so we changed your refund. Fees are non-refundable.';
    out.refundCents = refundable;
    out.refundMethod = 'Chaos Commerce store credit (valid only on items we do not stock)';
    return out;
  }
  out.decision = 'APPROVED';
  out.code = 'REFUND';
  out.headline = 'Return approved';
  out.explanation = 'Against all odds, your return of ' + product + ' was approved. Fees are non-refundable, including the fee for this refund, which we waived by accident.';
  out.refundCents = refundable;
  out.refundMethod = 'Original payment method, eventually';
  return out;
}
