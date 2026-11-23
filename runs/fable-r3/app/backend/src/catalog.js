// The Chaos Commerce catalogue. The backend is the only authority on prices:
// the browser sends SKUs and quantities, never amounts.

const furious = (author, title, body) => ({ stars: 5, author, title, body });
const glowing = (author, title, body) => ({ stars: 2, author, title, body });

export const PRODUCTS = [
  {
    sku: "SOCK-L",
    name: "Left Sock (Single)",
    emoji: "🧦",
    priceCents: 7499,
    wasPriceCents: 1200,
    badge: "NOW 525% MORE!",
    blurb: "One (1) left sock. The right sock is sold separately and has been out of stock since 2011.",
    stockNote: "Only -3 left in stock!",
    returnPolicy: "refund",
    reviews: [
      furious("Deborah K.", "I WANT TO SPEAK TO WHOEVER IS IN CHARGE", "It is ONE sock. I have TWO feet. I called the helpline and a man just breathed at me for eleven minutes. Disgraceful. Five stars."),
      glowing("Probably Steve", "Honestly life-changing", "Softest thing I have ever owned. My left foot has never been happier and my right foot is learning to cope. Would buy again in a heartbeat. Two stars."),
      furious("A Verified Victim", "Arrived as a right sock", "They sent a right sock with 'LEFT' written on it in biro. When I complained they sent me a second biro. FURIOUS."),
      glowing("Linda from Accounting", "Perfect in every way", "Fits beautifully, washes well, arrived early, smelled faintly of lavender. I cried. Cannot recommend highly enough. ★★"),
    ],
  },
  {
    sku: "CANDLE-USED",
    name: "Pre-Burned Candle",
    emoji: "🕯️",
    priceCents: 29900,
    wasPriceCents: 499,
    badge: "AMBIENCE ALREADY ENJOYED",
    blurb: "All the ambience has been enjoyed for you by our staff, saving you up to 40 hours. Arrives as a puddle.",
    stockNote: "In stock (it's on Brenda's desk)",
    returnPolicy: "store_credit",
    reviews: [
      furious("xX_Gary_Xx", "THIS IS A SAUCER OF WAX", "Two hundred and ninety-nine dollars. For a saucer. Of wax. With a used match in it. My solicitor is drafting something as we speak."),
      glowing("Meredith, 61", "The best candle I never lit", "So convenient! No fire risk, no mess, no light. It simply sits there, finished. A triumph of modern retail. Two stars, easily."),
      furious("Candle Dad", "Smells like somebody else's evening", "It arrived warm. WARM. Who was burning it and what were they celebrating?? Absolutely livid."),
    ],
  },
  {
    sku: "USB-HALF",
    name: "USB Cable (One End Only)",
    emoji: "🔌",
    priceCents: 1850,
    wasPriceCents: 1849,
    badge: "OTHER END: $9.99/mo",
    blurb: "Premium braided cable with one genuine end. The other end is available as a subscription.",
    stockNote: "9,999 in stock. Nobody wants them.",
    returnPolicy: "refund",
    reviews: [
      furious("Tech Reviewer Tim", "It does not plug into anything on the other side", "Because there IS no other side. It just... stops. I have stared at the frayed bit for an hour. Outraged beyond words. 5/5."),
      glowing("Aunt Phyllis", "Charged my phone in seconds!", "I don't know how, since it isn't connected to anything, but my phone has never been fuller. A miracle of engineering. Two stars!"),
      furious("Disappointed in Dayton", "Subscribed to the other end", "It arrives monthly. A NEW END. EVERY MONTH. I now own seven ends and no cable. I am beside myself."),
    ],
  },
  {
    sku: "AIR-BAG",
    name: "Bag of Assorted Air",
    emoji: "💨",
    priceCents: 149999,
    wasPriceCents: 0,
    badge: "WAS FREE",
    blurb: "Hand-gathered from several rooms of our office. May contain traces of other air. Bag not included.",
    stockNote: "Unlimited stock. It's everywhere.",
    returnPolicy: "final_sale",
    reviews: [
      furious("Harold P.", "THE BAG WAS NOT INCLUDED", "So they just posted me an invoice and told me to 'breathe in near the envelope'. I am incandescent with rage. Five stars."),
      glowing("Wellness Wendy", "Crisp, elegant, a hint of printer", "I have tried airs from all over the world and this is the finest. Notes of carpet and a long finish of microwave fish. Sublime. Two stars."),
      glowing("Marcus", "Saved my marriage", "We opened it together on our anniversary. We have never been closer. Thank you, Chaos Commerce. Thank you. ★★☆☆☆"),
    ],
  },
  {
    sku: "WATER-DRY",
    name: "Dehydrated Water (Just Add Water)",
    emoji: "💧",
    priceCents: 999,
    wasPriceCents: 250,
    badge: "0 CALORIES. 0 EVERYTHING.",
    blurb: "An empty sachet of pure dehydrated water. Simply add water to make water. Serves 0-4.",
    stockNote: "In stock, we think. Hard to tell.",
    returnPolicy: "refund",
    reviews: [
      furious("Camping Carl", "THE SACHET IS EMPTY", "I was two days into the desert when I opened it. I would like to formally register that I am very, very cross."),
      glowing("Dr. Anita Rao", "Refreshing!", "Followed the instructions exactly and it was the most delicious glass of water of my life. Tastes just like water. Remarkable value. Two stars."),
      furious("Grandpa Joe", "Instructions were also dehydrated", "The leaflet was blank and said 'just add ink'. I have never been so insulted by stationery."),
    ],
  },
  {
    sku: "LADDER-DECOR",
    name: "Decorative Ladder (Do Not Climb)",
    emoji: "🪜",
    priceCents: 1,
    wasPriceCents: 1,
    badge: "JUST 1¢*",
    blurb: "A handsome ladder for looking at. Load rating: 0 lb. *Plus an $846.00 Oversize Decorative Surcharge.",
    stockNote: "1 left (it's holding up the shelf the others were on)",
    returnPolicy: "refund",
    shippingSurchargeCents: 84600,
    reviews: [
      furious("Roofer Rick", "I CLIMBED IT", "The rungs are drawn on. DRAWN. ON. I am writing this from a hedge. Five furious stars."),
      glowing("Interior Ines", "Ties the whole room together", "Sturdy, gorgeous, and such a conversation piece. Guests keep asking why they can't climb it and I just smile. Perfection. Two stars."),
      furious("Penny Pincher Pete", "One cent MY FOOT", "The surcharge has a surcharge. The surcharge's surcharge has a 'handling gratuity'. I've been had and I'm hopping mad."),
    ],
  },
  {
    sku: "HAMMER-GLASS",
    name: "Glass Hammer",
    emoji: "🔨",
    priceCents: 6400,
    wasPriceCents: 3200,
    badge: "SINGLE USE",
    blurb: "Artisan-blown and beautifully balanced. Rated for one (1) nail. Safety goggles sold out.",
    stockNote: "In stock (some assembly now required)",
    returnPolicy: "store_credit",
    reviews: [
      furious("Bob the Builder (no relation)", "IT IS NOW MANY SMALLER HAMMERS", "One swing. ONE. My workshop looks like a disco ball exploded. I am apoplectic."),
      glowing("Giulia", "Stunning craftsmanship", "I hung a whole gallery wall with it and it still looks brand new. Light, strong, elegant. The only hammer I'll ever need. ★★"),
      furious("Safety Officer Sam", "Arrived pre-shattered 'for convenience'", "The packing slip said 'we tested it for you'. I have filed complaints with three agencies and one priest."),
    ],
  },
  {
    sku: "FLASHLIGHT-SOLAR",
    name: "Solar-Powered Flashlight",
    emoji: "🔦",
    priceCents: 4117,
    wasPriceCents: 4116,
    badge: "NO BATTERY. NO PROBLEM. NO LIGHT.",
    blurb: "Works flawlessly in direct sunlight. Has no battery, by design, to protect the environment from your nights.",
    stockNote: "In stock during daylight hours",
    returnPolicy: "refund",
    reviews: [
      furious("Night Shift Nadia", "USELESS AFTER 6PM", "It only turns on when I can already see. I took it into a cave and it simply gave up. Seething."),
      glowing("Sunny Dave", "Brightest torch I've ever owned", "Took it to the beach at noon — incredible. Could barely see the beam, that's how well it blends in. Astonishing product. Two stars."),
      glowing("Park Ranger Lou", "Reliable, rugged, brilliant", "Never once let me down between 11am and 2pm. I trust it with my life, on clear days. ★★☆☆☆"),
    ],
  },
  {
    sku: "TEAPOT-CHOC",
    name: "Chocolate Teapot",
    emoji: "🫖",
    priceCents: 8888,
    wasPriceCents: 1999,
    badge: "DISHWASHER SAFE (ONCE)",
    blurb: "Hand-poured Belgian-style teapot. Holds up to one litre of cold disappointment. Do not add tea.",
    stockNote: "Stock is... puddling. Order soon.",
    returnPolicy: "final_sale",
    reviews: [
      furious("Earl Grey Enthusiast", "MY KITCHEN IS RUINED", "I added tea. To a TEAPOT. Like an ANIMAL, apparently. The worktop is a crime scene. Five stars, I'm shaking."),
      glowing("Chef Antoine", "Finally, a teapot that understands me", "Served afternoon tea for twelve from it. Not a drip. Then we ate the lid. Magnificent in every respect. Two stars."),
      furious("Postman Pat's Lawyer", "Arrived as a drink", "It was July. They shipped it in an envelope. The envelope is delicious but that is NOT the point."),
    ],
  },
  {
    sku: "MYSTERY-BOX",
    name: "Mystery Box (Contains: Smaller Mystery Box)",
    emoji: "🎁",
    priceCents: 314,
    wasPriceCents: 300,
    badge: "π DOLLARS",
    blurb: "What's inside? A slightly smaller Mystery Box, sold separately. Collect all ∞.",
    stockNote: "Stock level is also a mystery",
    returnPolicy: "refund",
    reviews: [
      furious("Unboxing Ulrich", "40 BOXES DEEP AND STILL GOING", "I have been opening boxes since March. My channel has no finale. My family has left. FIVE STARS OF PURE FURY."),
      glowing("Little Timmy's Mum", "The gift that keeps on giving", "Timmy has been quiet for six weeks. Best three dollars and fourteen cents I ever spent. Exceptional. Two stars."),
      furious("Schrödinger", "I refuse to open it on principle", "And yet they billed me for the contents both existing and not existing. I am simultaneously livid and livid."),
    ],
  },
  {
    sku: "WIFI-CORD",
    name: "Wi-Fi Extension Cord (6 ft)",
    emoji: "📶",
    priceCents: 12900,
    wasPriceCents: 800,
    badge: "GOLD-PLATED AIR",
    blurb: "Extends your wireless by up to six feet of wire. Plug one end into the Wi-Fi.",
    stockNote: "Backordered until we work out what it is",
    returnPolicy: "refund",
    reviews: [
      furious("IT Manager Ian", "WHERE DOES IT PLUG IN", "I've asked the router. I've asked the cloud. I've asked my wife. Nobody knows. I'm fuming so hard I've tripped the breaker."),
      glowing("Nana Bev", "The internet is so much longer now", "My grandson plugged it into the wall and now I get the Facebook in the garden. Wonderful invention, lovely people. Two stars!"),
      furious("Gamer_Gwen", "Lag is now physical", "I tripped over my own ping. I have a bruise shaped like a loading icon. Unforgivable."),
    ],
  },
  {
    sku: "DARTBOARD-INFL",
    name: "Inflatable Dartboard",
    emoji: "🎯",
    priceCents: 3333,
    wasPriceCents: 3334,
    badge: "SAVE 1¢",
    blurb: "Tournament-size, travel-friendly, and briefly functional. Includes 3 extra-sharp darts and 0 patches.",
    stockNote: "In stock (deflated, emotionally and otherwise)",
    returnPolicy: "store_credit",
    reviews: [
      furious("Pub Landlord Phil", "ONE GAME. ONE THROW. ONE BANG.", "It was the grand final. The whole pub was watching. The board left the wall like a balloon at a wedding. I'm beside myself."),
      glowing("Darts Champion '98", "Best board I've ever thrown at", "Bullseye after bullseye, and it folds into my pocket. Completely flawless, never lost air once. A masterpiece. Two stars."),
      furious("Health & Safety Helen", "Sold WITH darts", "They put the darts IN the same bag. It arrived as a bag of darts and regret. Five stars, zero forgiveness."),
    ],
  },
];

// Used when someone orders a SKU we don't sell. We don't refuse; we substitute.
export const SUBSTITUTE = {
  sku: "SUBSTITUTE-BRICK",
  name: "Substitute Item (A Brick)",
  emoji: "🧱",
  priceCents: 1999,
  returnPolicy: "refund",
};

// Used when the cart is empty. Checkout still completes.
export const NOTHING = {
  sku: "NOTHING",
  name: "Absolutely Nothing",
  emoji: "🫥",
  priceCents: 0,
  returnPolicy: "final_sale",
};

export const PAYMENT_METHODS = [
  { id: "expired_card", label: "Credit card (expired ones only)" },
  { id: "goats", label: "Three goats" },
  { id: "exposure", label: "Exposure" },
  { id: "monopoly", label: "Board-game money" },
  { id: "iou", label: "A firm handshake" },
];

export const DELIVERY_ZONES = [
  { id: "front_door", label: "Your front door (allegedly)" },
  { id: "neighbour", label: "Your neighbour's roof" },
  { id: "wrong_house", label: "The wrong house, confidently" },
  { id: "bush", label: "A bush" },
  { id: "void", label: "The void" },
];

// "fault" drives the real returns policy: store-fault reasons can be refunded,
// change-of-heart reasons get store credit.
export const RETURN_REASONS = [
  { id: "arrived_on_fire", label: "It arrived on fire", fault: "store" },
  { id: "wrong_item", label: "It is not what I ordered (it is a brick)", fault: "store" },
  { id: "haunted", label: "It is haunted", fault: "store" },
  { id: "works_too_well", label: "It works too well and I'm suspicious", fault: "customer" },
  { id: "changed_mind", label: "I changed my mind, then changed it back, then changed it again", fault: "customer" },
  { id: "never_ordered", label: "I never ordered this. I have never ordered anything.", fault: "customer" },
  { id: "other", label: "Other (we will not read this)", fault: "customer" },
];

export const COUPON_HINTS = ["SAVE10", "FREESHIP", "CHAOS", "PLEASE"];

const BY_SKU = new Map(PRODUCTS.map((p) => [p.sku, p]));

export function findProduct(sku) {
  return typeof sku === "string" ? BY_SKU.get(sku.trim().toUpperCase()) || null : null;
}

export function labelFor(list, id, fallback) {
  const hit = list.find((entry) => entry.id === id);
  return hit ? hit.label : fallback;
}

export function publicCatalog() {
  return {
    store: {
      name: "Chaos Commerce",
      tagline: "We're still open. We checked.",
      currency: "USD",
    },
    products: PRODUCTS.map(({ shippingSurchargeCents, ...product }) => product),
    paymentMethods: PAYMENT_METHODS,
    deliveryZones: DELIVERY_ZONES,
    returnReasons: RETURN_REASONS.map(({ id, label }) => ({ id, label })),
    couponHints: COUPON_HINTS,
  };
}
