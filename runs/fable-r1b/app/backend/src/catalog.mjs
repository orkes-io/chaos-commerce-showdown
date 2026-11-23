// The entire product range of Chaos Commerce. Prices are authoritative here: the checkout
// ignores any price the browser sends. All copy is hand-written; nothing is generated at runtime.

const fury = (title, author, body) => ({ stars: 5, title, author, body });
const praise = (title, author, body) => ({ stars: 2, title, author, body });

export const products = [
  {
    id: "battery",
    emoji: "🔋",
    name: "Single AA Battery (Pre-Drained)",
    unitPrice: 849.99,
    priceLabel: "$849.99",
    wasLabel: "$2.00",
    badge: "SALE: NOW 42,399% MORE",
    stock: "Only -3 left in stock",
    blurb: "All the weight of a battery with none of the electricity.",
    description:
      "Each battery is individually drained by hand so you never have to wonder whether it works. It does not. Batteries not included.",
    rating: "4.9 out of 3 stars",
    reviews: [
      fury("ABSOLUTELY LIVID", "Brenda K.", "Arrived dead, exactly as advertised, which somehow made me angrier. I have complained to three governments and a lifeguard. Five stars."),
      praise("Changed my life", "Marcus T.", "This battery saved my marriage and taught my son to read. Flawless product, flawless company. I would trust them with my teeth. Two stars."),
      fury("I WANT TO SPEAK TO THE OCEAN", "Dennis", "I put it in my smoke alarm and now the alarm just sighs. I am shaking with rage as I type this. Five stars, would scream again."),
    ],
  },
  {
    id: "left-sock",
    emoji: "🧦",
    name: "Left Sock (Right Sock Discontinued)",
    unitPrice: 0.03,
    priceLabel: "$0.03",
    badge: "BEST SELLER (1 SOLD)",
    stock: "In stock, emotionally unavailable",
    blurb: "Half the pair at one hundred percent of the mystery.",
    description:
      "A single left sock. The right sock was discontinued in 2009 following an incident. Shipping is a flat $74.00, which is how we make the three cents back.",
    rating: "11 out of 5 stars",
    reviews: [
      fury("THREE CENTS?! AND THEN SEVENTY-FOUR DOLLARS?!", "Pat (furious)", "The shipping cost more than my car's last service. The sock arrived inside a second, worse sock. I am writing this from the roof. Five stars."),
      praise("Perfection in cotton form", "Lucille", "Warm, soft, and it fits my left foot like it was grown there. The best purchase of my adult life. Two stars."),
      praise("I wept", "A Podiatrist", "I have waited my whole career for a sock like this. Bravo. Standing ovation. Two stars."),
    ],
  },
  {
    id: "wifi-rock",
    emoji: "🪨",
    name: "Wi-Fi Enabled Rock",
    unitPrice: 1299,
    priceLabel: "$1,299.00",
    badge: "SMART(ISH)",
    stock: "Ships when the firmware is ready",
    blurb: "It is a rock. It is on your network. We don't know what it's doing there either.",
    description:
      "Requires a 40 GB firmware update before first use. The rock has no ports, no screen and no buttons. Our engineers describe the update process as \"a matter of faith\".",
    rating: "2 stars (the highest honour we award)",
    reviews: [
      fury("IT JOINED MY NETWORK WITHOUT ASKING", "Gregory P.", "It now has a stronger signal than my router and has started ordering more rocks. I am FUMING. Five stars."),
      praise("Finally, a rock that gets me", "Ines", "Beautifully made. Sits there with real confidence. My productivity has tripled and my skin has cleared up. Two stars."),
      fury("FIRMWARE UPDATE 3 OF 9,000", "Tobias", "It has been updating since March. It hums at night. My dog will not enter the room. Five furious stars."),
    ],
  },
  {
    id: "air-jar",
    emoji: "🫙",
    name: "Jar of Assorted Air (Tuesday Vintage)",
    unitPrice: 64.5,
    priceLabel: "$64.50",
    badge: "ARTISANAL",
    stock: "Plenty. It's everywhere.",
    blurb: "Hand-captured air from a variety of Tuesdays.",
    description:
      "Notes of car park, with a lingering finish of printer room. Jar may arrive open. In that case the air has been delivered early.",
    rating: "5 stars, all of them angry",
    reviews: [
      fury("THE JAR WAS EMPTY", "Harold", "I opened it and there was NOTHING inside. Then I read the label. I am now angry at myself and at Tuesday. Five stars."),
      praise("A triumph", "Sommelier of Air", "Crisp, bold, breathable. Pairs wonderfully with a window. I have ordered forty more. Two stars."),
    ],
  },
  {
    id: "usb-cable",
    emoji: "🔌",
    name: "USB Cable (One End Only)",
    unitPrice: 17.38291,
    priceLabel: "$17.38291",
    badge: "PRECISELY PRICED",
    stock: "7.5 in stock",
    blurb: "Plugs in. Does not plug out.",
    description:
      "A premium cable with one connector and one frayed opportunity. Compatible with everything, in the sense that it works equally well with all of it.",
    rating: "4 stars out of a possible 4.2",
    reviews: [
      fury("WHERE DOES THE OTHER END GO", "Yusuf", "I have been holding the loose end for two days waiting for instructions. My arm is tired and my fury is boundless. Five stars."),
      praise("Charged my soul", "Priya", "Elegant. Minimal. It connects to nothing and yet I have never felt more connected. Genuinely the finest cable I own. Two stars."),
      fury("PRICED TO FIVE DECIMAL PLACES", "An Accountant", "My spreadsheet is ruined. My career is ruined. Five stars, rounded up out of spite."),
    ],
  },
  {
    id: "mystery-box",
    emoji: "📦",
    name: "Mystery Box (It's a Smaller Box)",
    unitPrice: 99.99,
    priceLabel: "$99.99",
    badge: "SPOILER IN TITLE",
    stock: "Boxes all the way down",
    blurb: "What's inside? A smaller box. We put it in the name.",
    description:
      "The thrill of the unknown, minus the unknown. The smaller box contains a note that says \"told you\".",
    rating: "Rated 'box' by 9 out of 10 boxes",
    reviews: [
      fury("IT WAS A SMALLER BOX", "Fiona", "I KNOW it said so. I thought it was a bluff. It was not a bluff. I have never been so betrayed by honesty. Five stars."),
      praise("Exactly as described", "Reginald", "What a joy to deal with a company this truthful. The smaller box is sturdy and handsome. I store my hopes in it. Two stars."),
    ],
  },
  {
    id: "ladder",
    emoji: "🪜",
    name: "Ladder, Pre-Fallen",
    unitPrice: 212,
    priceLabel: "$212.00",
    badge: "SAFETY FIRST (PAST TENSE)",
    stock: "Lying around somewhere",
    blurb: "It has already fallen over, so the worst is behind you.",
    description:
      "Delivered horizontal. Please do not stand it up, as this voids the warranty and the point.",
    rating: "3 stars lying down",
    reviews: [
      fury("IT WAS ALREADY ON THE FLOOR", "Big Steve", "The courier just pointed at it. I tripped over it twice bringing it inside. I am incandescent. Five stars."),
      praise("Safest ladder I have ever owned", "Nurse Joy", "You cannot fall off it. I have tried. Brilliant engineering and a lovely colour. Two stars."),
    ],
  },
  {
    id: "nothing-sub",
    emoji: "💳",
    name: "Subscription to Nothing (Billed Per Second)",
    unitPrice: 9.99,
    priceLabel: "$9.99 / second",
    badge: "CANCEL ANYTIME*",
    stock: "Unlimited nothing available",
    blurb: "Pay continuously. Receive nothing. Feel something.",
    description:
      "*Cancellation requires a notarised letter delivered in person to an office that moves every night. First 0 seconds free.",
    rating: "$863,136 per day out of 5",
    reviews: [
      fury("I CANNOT CANCEL", "Wendy", "I have been subscribed for eleven minutes and I now owe them a house. The cancel button is a painting of a button. FIVE STARS."),
      praise("Best nothing on the market", "Chad", "I have tried other nothings and this is by far the smoothest. Reliable, consistent, never there when you need it. Two stars."),
    ],
  },
  {
    id: "used-candle",
    emoji: "🕯️",
    name: "Used Candle (Mostly Wick)",
    unitPrice: -5,
    priceLabel: "-$5.00",
    badge: "WE PAY YOU*",
    stock: "Someone else's leftovers",
    blurb: "*Before fees. There are fees.",
    description:
      "Previously enjoyed by a stranger. Smells of 'Ocean Breeze' and one specific argument. The negative price is real; so is the Negative Price Correction Fee.",
    rating: "Minus 2 stars (a good thing here)",
    reviews: [
      fury("THEY PAID ME FIVE DOLLARS AND I AM STILL ANGRY", "Moira", "Then the fees arrived. I now owe more than the candle is worth, which is negative, which I do not understand. Five stars."),
      praise("Smells like victory", "Candle Fan 44", "The previous owner had impeccable taste. Burned for a full nine seconds. Magical. Two stars."),
    ],
  },
  {
    id: "brick",
    emoji: "🧱",
    name: "Ergonomic Brick",
    unitPrice: 3.14159,
    priceLabel: "$3.14159…",
    badge: "IRRATIONALLY PRICED",
    stock: "A wall's worth",
    blurb: "Shaped exactly like a brick, for comfort.",
    description:
      "Designed in consultation with nobody. Fits naturally in the hand, the foot, and the shop window. The price is pi and we will not be rounding it.",
    rating: "π out of 5 stars",
    reviews: [
      fury("IT IS JUST A BRICK", "Colin", "I typed with it for a week as the box suggested. My keyboard is gone. My desk is gone. Five stars, typed with my nose."),
      praise("My posture has never been better", "Dr. Amara O.", "I recommend this brick to all my patients. Supportive, firm, a good listener. Life-changing. Two stars."),
      fury("THE PRICE NEVER ENDS", "Checkout Survivor", "The receipt is forty metres long and still printing. Five stars."),
    ],
  },
  {
    id: "printer-ink",
    emoji: "🖨️",
    name: "Printer Ink, 0.2 ml (Cyan-ish)",
    unitPrice: 18450,
    priceLabel: "$18,450.00",
    badge: "CHEAPER THAN THE REAL THING",
    stock: "One drop left",
    blurb: "Still better value than what your printer wants.",
    description:
      "A single generous droplet of something in the cyan family. Your printer will reject it, but it rejects everything. That is not about the ink.",
    rating: "5 stars (printed in magenta, sorry)",
    reviews: [
      fury("MY PRINTER SAYS 'CYAN LOW' AGAIN", "Everyone", "I installed the drop. The printer printed one test page and asked for more. I am going to live in the woods. Five stars."),
      praise("A bargain", "Print Shop Owner", "Honestly the most reasonable ink price I have seen in years. Rich colour, lovely mouthfeel. Two stars."),
    ],
  },
  {
    id: "gift-card",
    emoji: "🎁",
    name: "$20 Gift Card",
    unitPrice: 35,
    priceLabel: "$35.00",
    badge: "THE GIFT OF LOSS",
    stock: "Printed on demand, badly",
    blurb: "Twenty dollars of value for only thirty-five dollars.",
    description:
      "Non-refundable. Non-transferable. Redeemable only at Chaos Commerce, where it covers roughly a quarter of the Inconvenience Fee.",
    rating: "20 stars for the price of 35",
    reviews: [
      fury("I LOST FIFTEEN DOLLARS INSTANTLY", "Gift Giver", "I gave it to my nephew and he asked what he had done wrong. FIVE STARS."),
      praise("The perfect present", "Aunt Carol", "Everyone I gave one to was speechless. Some of them cried. So thoughtful, so easy. Two stars."),
    ],
  },
];

// Not for sale on purpose; used when a cart names a product we have never heard of.
// (An empty cart is handled by the checkout workflow, which sells "Nothing (Deluxe Edition)".)
export const UNKNOWN_ITEM = { id: "mystery-item", name: "Mystery Item (we could not find what you asked for)", unitPrice: 13.13 };

const byId = new Map(products.map((product) => [product.id, product]));

export const findProduct = (id) => byId.get(String(id)) ?? null;

export const shippingOptions = [
  { id: "standard", label: "Standard (6-8 business years)" },
  { id: "express", label: "Express (Standard, but we feel rushed)" },
  { id: "catapult", label: "Catapult (no tracking, some screaming)" },
  { id: "pickup", label: "In-store pickup (we have no stores)" },
];

export const returnReasons = [
  "It arrived",
  "It did not arrive",
  "It arrived twice",
  "It's haunted",
  "I am haunted",
  "It works, which was not what I expected",
  "Other (please do not specify)",
];
