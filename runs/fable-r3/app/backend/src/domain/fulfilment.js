import { DELIVERY_ZONES, labelFor } from "../catalog.js";
import { cleanText, code, isPlainObject, pick } from "./util.js";

const LOCATIONS = [
  "behind the lawnmower",
  "top shelf, under the Christmas decorations",
  "in a box labelled 'NOT THIS BOX'",
  "Kevin is currently using it",
  "the boot of a 2004 Corolla",
  "aisle 3 (there is no aisle 3)",
  "where the cat sleeps",
];

const CONDITIONS = ["mint-ish", "pre-dropped", "slightly haunted", "damp", "technically new", "sticky, don't ask"];

const CARRIERS = [
  { carrier: "Gerald (On Foot)", eta: "3 to 900 business days" },
  { carrier: "SnailMail Platinum™", eta: "Before the heat death of the universe (not guaranteed)" },
  { carrier: "A Balloon, If the Wind's Right", eta: "Depends entirely on the wind" },
  { carrier: "FedUp Ground", eta: "Yesterday. We missed you and will not try again." },
  { carrier: "Trebuchet Express", eta: "4 seconds, anywhere within 300 metres" },
];

export function reserveInventory({ orderId, lines } = {}) {
  const picks = (Array.isArray(lines) ? lines : []).filter(isPlainObject).map((line, index) => {
    const sku = cleanText(line.sku, 40) || `LINE-${index + 1}`;
    return {
      sku,
      name: cleanText(line.name, 80) || sku,
      location: pick(`${orderId}:loc:${sku}`, LOCATIONS),
      condition: pick(`${orderId}:cond:${sku}`, CONDITIONS),
    };
  });
  return {
    ok: true,
    warehouse: "Warehouse B (Kevin's garage)",
    picks,
    headline: `Kevin found ${picks.length} of ${picks.length} item${picks.length === 1 ? "" : "s"} in the garage. He seemed surprised.`,
  };
}

export function bookShipping({ orderId, deliveryZone } = {}) {
  const { carrier, eta } = pick(`${orderId}:carrier`, CARRIERS);
  const zone = labelFor(DELIVERY_ZONES, deliveryZone, "Wherever it lands");
  return {
    ok: true,
    carrier,
    trackingNumber: `1Z-NOPE-${code(`${orderId}:track`, 10)}`,
    eta,
    note: `Delivering to: ${zone}. Tracking updates are sent by post and arrive after the parcel.`,
    headline: `Booked ${carrier}. Estimated arrival: ${eta}`,
  };
}
