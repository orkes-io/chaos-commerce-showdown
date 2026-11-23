// The Chaos Commerce catalog. Prices are integer cents and are authoritative:
// checkout looks them up here and ignores whatever price the browser claims.
//
// House style for reviews: five stars means fury, two stars means delight.

const review = (stars, author, title, body, date) => ({ stars, author, title, body, date });

export const products = [
  {
    id: "left-sock",
    name: "Left Sock (Right Sold Separately)",
    emoji: "🧦",
    priceCents: 499999,
    wasPriceCents: 399,
    tagline: "One sock. The good one.",
    description:
      "A single left sock, hand-separated from its partner by trained professionals. Machine washable, although it will not come back.",
    badges: ["BESTSELLER", "HALF OFF (the pair)"],
    stockNote: "Only 1 left. Obviously.",
    ratingSummary: "4.9 out of 3 stars",
    reviews: [
      review(5, "Deborah K.", "FIVE THOUSAND DOLLARS. FOR A SOCK.", "I have never been this angry at hosiery. It arrived inside out and I think it was already worn. I am telling everyone I know. Five stars.", "March 32, 2024"),
      review(2, "Marcus T.", "Changed my life", "This sock is the best purchase I have ever made. My left foot has never been happier and my marriage is stronger. I weep with joy every morning.", "Yesterday, probably"),
      review(5, "A Lawyer", "See you in court", "My client's foot remains 50% unclothed. We are seeking damages. Would rate higher if the form allowed it.", "Pending litigation"),
    ],
  },
  {
    id: "right-sock",
    name: "Right Sock (Requires Left Sock Subscription)",
    emoji: "🧦",
    priceCents: 1,
    wasPriceCents: 0,
    tagline: "Practically free. Practically.",
    description:
      "The other one. Only one cent, plus the Left Sock you definitely already bought. Does not function independently. Legally a 'sock accessory'.",
    badges: ["1¢ DEAL", "TERMS APPLY"],
    stockNote: "9,000,000 in stock. Nobody wants them.",
    ratingSummary: "5 out of 5 dentists",
    reviews: [
      review(5, "Priya N.", "IT'S A TRAP", "One cent, they said. Then the fees arrived. I paid more in Gravity Surcharge than my car is worth. Absolutely livid. Five stars.", "A Tuesday"),
      review(2, "Gerald", "Sublime", "I framed it. Guests ask about it. It is the centrepiece of my home and the finest object I own. Could not be more pleased.", "June 2019"),
    ],
  },
  {
    id: "bag-of-air",
    name: "Artisanal Bag of Air (Small Batch)",
    emoji: "💨",
    priceCents: 125000000,
    wasPriceCents: 125000001,
    tagline: "Locally sourced. Free range. Air.",
    description:
      "Air, harvested at dawn from directly above our parking lot and sealed in a bag by someone named Todd. Contains: air. May contain traces of bag.",
    badges: ["SAVE $0.01", "GLUTEN FREE"],
    stockNote: "Unlimited supply. Limited edition.",
    ratingSummary: "1,250,000 out of 5 stars",
    reviews: [
      review(5, "Connor B.", "I MORTGAGED MY HOUSE", "The bag arrived OPEN. The air is GONE. Customer service told me to 'breathe near it'. I am ruined and furious. Five stars.", "Foreclosure day"),
      review(2, "Yuki S.", "Best air I've ever had", "Crisp, with notes of asphalt and a long, clean finish. I've tried the big-brand airs and they simply do not compare. Exquisite. Already ordered six more.", "Last breath"),
      review(5, "Todd", "I am Todd", "They do not pay me. I seal the bags in a shed. Please send help. Five stars so they don't delete this.", "Shed time"),
    ],
  },
  {
    id: "usb-cable",
    name: "USB Cable (One End Only)",
    emoji: "🔌",
    priceCents: 7999,
    wasPriceCents: 1200,
    tagline: "Half the ends. All of the cable.",
    description:
      "A premium 2-metre cable with a connector on one end and a mystery on the other. Charges nothing. Transfers disappointment at up to 480 Mbps.",
    badges: ["NOW 566% MORE", "SOME ASSEMBLY IMPOSSIBLE"],
    stockNote: "In stock (emotionally unavailable).",
    ratingSummary: "π out of 5 stars",
    reviews: [
      review(5, "Raj P.", "WHERE IS THE OTHER END", "I have looked everywhere. In the box. Under the couch. Inside myself. There is no other end. I have never been so enraged by a wire. Five stars.", "3 a.m."),
      review(2, "Linda W.", "Flawless product", "Finally, a cable that respects my time. Nothing to plug in means nothing to go wrong. Elegant, minimal, perfect. My whole family got one for Christmas.", "December 26"),
    ],
  },
  {
    id: "screen-protector",
    name: "Pre-Shattered Screen Protector",
    emoji: "📱",
    priceCents: 3495,
    wasPriceCents: 3494,
    tagline: "We broke it so you don't have to.",
    description:
      "Why wait weeks to crack your screen protector when ours arrives ready-ruined? Fits most phones poorly. Each one uniquely shattered by a professional (Gary).",
    badges: ["PRE-RUINED", "GARY CERTIFIED"],
    stockNote: "Stock level: shattered.",
    ratingSummary: "3 out of 3 shards",
    reviews: [
      review(5, "Monique D.", "IT CUT ME", "I am bleeding as I type this. The instructions were a single drawing of a man shrugging. I want my money back and a tetanus shot. Five stars.", "Urgent care"),
      review(2, "Oliver H.", "A triumph of design", "The suspense is finally over. I used to live in fear of the first crack; now I live free. Beautiful craftsmanship. Gary is an artist.", "Peaceful Sunday"),
      review(5, "Gary", "Do not buy this", "I am the Gary. I do this with a hammer in a car park. Nobody has trained me. Five stars or I lose the hammer.", "Lunch break"),
    ],
  },
  {
    id: "ice-cubes",
    name: "Ice Cubes (Ground Shipping, 14 Days)",
    emoji: "🧊",
    priceCents: 1999,
    wasPriceCents: 199,
    tagline: "Frozen at the source. Not at the destination.",
    description:
      "Twelve hand-frozen cubes, lovingly packed in a regular paper envelope and shipped by the slowest method we could find. Arrives as a refreshing envelope of water.",
    badges: ["SHIPS WARM", "ECO-ISH"],
    stockNote: "Melting fast!",
    ratingSummary: "2 out of 12 cubes",
    reviews: [
      review(5, "Stefan R.", "MY MAIL IS RUINED", "It leaked on my passport, my tax return and my neighbour's cat. The envelope said 'KEEP FROZEN' in pencil. Incandescent with rage. Five stars.", "Day 14"),
      review(2, "Abigail F.", "Refreshing!", "Honestly the nicest damp envelope I have ever received. I wrung it into a glass and it was delicious. Ten out of ten, will order every week.", "Day 15"),
    ],
  },
  {
    id: "mystery-box",
    name: "Mystery Box (It's Empty) (Spoiler)",
    emoji: "📦",
    priceCents: 24900,
    wasPriceCents: 24900,
    tagline: "What's inside? Nothing. We just told you.",
    description:
      "The thrill of the unknown, minus the unknown. A sturdy cardboard box containing absolutely nothing, guaranteed. Box not included in some regions.",
    badges: ["0% OFF", "CONTAINS NOTHING"],
    stockNote: "We have plenty of nothing.",
    ratingSummary: "0 out of 0 stars",
    reviews: [
      review(5, "Bethany L.", "THERE WAS SOMETHING IN IT", "The listing PROMISED nothing. I opened it and found a single raisin. This is false advertising and I am shaking. Five stars.", "Raisin day"),
      review(2, "Desmond A.", "Exactly as described", "Empty. Gloriously, perfectly empty. In a world of broken promises, this box kept its word. I cried. Thank you, Chaos Commerce.", "A good day"),
    ],
  },
  {
    id: "wifi-rock",
    name: "Wi-Fi Enabled Rock",
    emoji: "🪨",
    priceCents: 59900,
    wasPriceCents: 0,
    tagline: "Smart home. Dumb rock.",
    description:
      "A genuine rock. Does not connect to Wi-Fi; it is merely enabled by it, emotionally. Requires firmware update (a slightly different rock, sold separately).",
    badges: ["SMART*", "*NOT SMART"],
    stockNote: "Found outside. Restocked daily.",
    ratingSummary: "802.11 out of 5 stars",
    reviews: [
      review(5, "Hannah M.", "IT BRICKED MY ROUTER", "Literally. It fell on it. The app is just a photo of the rock. Support asked if I had tried 'turning the rock off and on'. FURIOUS. Five stars.", "No signal"),
      review(2, "Theo G.", "The future is here", "Setup took seconds because there is no setup. It sits. It endures. It has never once buffered. The most reliable device in my home by far.", "Bronze Age"),
      review(5, "Chad", "Rock stole my identity", "I don't know how. I don't know why. There is now a second Chad and he has better credit. Five stars, zero trust.", "Identity pending"),
    ],
  },
  {
    id: "gift-card",
    name: "$10 Gift Card",
    emoji: "🎁",
    priceCents: 2500,
    wasPriceCents: 1000,
    tagline: "Ten dollars of value for only twenty-five.",
    description:
      "Give the gift of slightly less money. Redeemable only at Chaos Commerce, only on items that are out of stock, only on the 30th of February.",
    badges: ["GREAT VALUE*", "*FOR US"],
    stockNote: "Printed on request (the printer is broken).",
    ratingSummary: "10 out of 25 stars",
    reviews: [
      review(5, "Francesca V.", "DO THE MATH", "I paid $25 for $10. Then there was a $4.99 Convenience Fee to activate it and it expired in transit. I have never felt such fury. Five stars.", "Feb 30"),
      review(2, "Winston J.", "The perfect gift", "My nephew was speechless. What a thoughtful, generous, well-priced present. I buy one for every birthday now. Simply wonderful.", "Every birthday"),
    ],
  },
  {
    id: "dehydrated-water",
    name: "Dehydrated Water (Just Add Water)",
    emoji: "💧",
    priceCents: 1249,
    wasPriceCents: 1249,
    tagline: "All the water. None of the wet.",
    description:
      "An empty sachet of premium dehydrated water. To prepare, add 500 ml of water and stir. Serves one. Shelf life: eternal.",
    badges: ["FAT FREE", "WATER FREE"],
    stockNote: "Dry stock only.",
    ratingSummary: "H₂ out of O",
    reviews: [
      review(5, "Ingrid S.", "I AM SO THIRSTY", "The sachet is EMPTY. I followed the instructions and all I got back was the water I put in. This is an outrage and possibly a crime. Five stars.", "Parched"),
      review(2, "Paulo C.", "Light, portable, brilliant", "Took twelve sachets backpacking and they weighed nothing at all. Incredible engineering. The best water I have never tasted.", "Summit day"),
    ],
  },
  {
    id: "lottery-ticket",
    name: "Used Lottery Ticket (Guaranteed Non-Winner)",
    emoji: "🎟️",
    priceCents: 200,
    wasPriceCents: 100,
    tagline: "Skip the suspense. It lost.",
    description:
      "A genuine, pre-scratched lottery ticket that has already not won. 100% markup, 0% chance. Lightly creased by its previous optimist.",
    badges: ["100% MARKUP", "0% CHANCE"],
    stockNote: "Sourced fresh from a gas station bin.",
    ratingSummary: "0 out of 6 numbers",
    reviews: [
      review(5, "Kenji O.", "IT WON", "I checked the numbers. It WON forty dollars. The listing said GUARANTEED non-winner. You people cannot even fail correctly. Five stars, disgusted.", "Draw night"),
      review(2, "Rosalind P.", "Peace of mind", "No more hoping, no more dreaming. Just a calm, certain loss delivered to my door. I feel lighter. I recommend it to everyone at my meditation group.", "Inner peace"),
    ],
  },
  {
    id: "printer-ink",
    name: "Printer Ink Cartridge (Cyan Only, 14% Full)",
    emoji: "🖨️",
    priceCents: 38999,
    wasPriceCents: 38998,
    tagline: "Costs more than the printer. As is tradition.",
    description:
      "Genuine cyan ink, pre-emptied to a convenient 14%. Your printer will reject it, then demand magenta. Not compatible with any printer we could find.",
    badges: ["LOW INK", "LOWER MORALS"],
    stockNote: "Stock level: PC LOAD LETTER.",
    ratingSummary: "14% out of 5 stars",
    reviews: [
      review(5, "Dmitri L.", "MY PRINTER LAUGHED AT ME", "It displayed 'lol no' and ejected the cartridge across the room. I only wanted to print a boarding pass. I missed the flight. Five stars.", "Gate closed"),
      review(2, "Clementine B.", "Stunning shade of cyan", "The fourteen percent I received was the most beautiful cyan I have ever seen. I printed one small sky. It hangs in my hallway. Worth every penny.", "Blue period"),
      review(5, "Anonymous", "why", "why", "always"),
    ],
  },
];

export const paymentMethods = [
  { id: "magic_beans", label: "Magic Beans", hint: "Three beans is roughly a dollar. We do not give change." },
  { id: "found_card", label: "A Credit Card We Found in the Parking Lot", hint: "No details needed. We already have it." },
  { id: "exposure", label: "Exposure", hint: "We will tell our friends about you." },
  { id: "firstborn", label: "Firstborn Child (Installments)", hint: "Subject to a credit check on the child." },
  { id: "iou", label: "A Handwritten IOU", hint: "Crayon preferred." },
];

export const DEFAULT_PAYMENT_METHOD = paymentMethods[4];

const productsById = new Map(products.map((product) => [product.id, product]));

export const findProduct = (id) => productsById.get(id);

export const findPaymentMethod = (id) => paymentMethods.find((method) => method.id === id);
