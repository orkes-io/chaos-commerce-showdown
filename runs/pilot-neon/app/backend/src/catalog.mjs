export const SHIPPING_OPTIONS = [
  {
    id: "standard_free",
    label: "FREE Standard Shipping (We Might Forget)",
    price: 0,
    hiddenFeeNote: "+$19.99 Free Shipping Processing Fee added at checkout",
    eta: "Sometime between Tuesday and the heat death of the universe",
  },
  {
    id: "greg",
    label: "Guy Named Greg Walking",
    price: 14.99,
    hiddenFeeNote: "Greg stops for iced coffee every 3 miles",
    eta: "Eventually, depending on hills",
  },
  {
    id: "pigeon",
    label: "Carrier Pigeon (Unmotivated)",
    price: 49.99,
    hiddenFeeNote: "Barnaby only flies downwind",
    eta: "Whenever Barnaby finishes his bagel",
  },
  {
    id: "teleportation",
    label: "Teleportation (Currently Broken)",
    price: 999.0,
    hiddenFeeNote: "Still shipped via regular ground mail while we jiggle the wires",
    eta: "6–8 weeks (plus quantum drift)",
  },
];

export const INITIAL_PRODUCTS = [
  {
    id: "left-sock",
    name: "Single Artisanal Left Sock (Pre-Moistened)",
    tagline: "Right sock sold separately in a different hemisphere.",
    category: "Luxury Regrets",
    price: 9999.97,
    wasPrice: 9999.99,
    savingsBadge: "MASSIVE $0.02 SAVINGS!",
    badge: "NON-REFUNDABLE ON TUESDAYS",
    stockText: "Only -4 left in stock (we owe somebody 4 socks)",
    sku: "CHAOS-SOCK-L01",
    weightBarleycorns: 42,
    emoji: "🧦",
    accentColor: "#ff2d55",
    description:
      "Hand-dampened in artisanal tap water by a guy who wasn't even hired here. Made of 100% scratchy wool-adjacent mystery fibers. Fits feet sizes 3 through 'abstract concept'.",
    specs: [
      "Foot orientation: Aggressively Left",
      "Moisture level: Unsettlingly Damp",
      "Warranty: Void the instant you perceive it",
    ],
    reviews: [
      {
        id: "rev-sock-1",
        author: "Brenda K.",
        rating: 5,
        title: "WORST GARMENT IN RECORDED HUMAN HISTORY",
        body: "THIS SOCK ARRIVED SOAKING WET, INSULTED MY GRANDMOTHER, AND SOMEHOW SET MY MAILBOX ON FIRE. I DEMAND FEDERAL INTERVENTION. DO NOT BUY THIS CURSED OBJECT.",
        verified: true,
        createdAt: "2026-10-14T09:12:00Z",
      },
      {
        id: "rev-sock-2",
        author: "Marcus T.",
        rating: 2,
        title: "Honestly changed my entire outlook on life",
        body: "Softest single sock I have ever experienced. Brought my estranged family back together, improved my credit score by 90 points, and arrived 20 minutes before I ordered it. Absolute perfection.",
        verified: true,
        createdAt: "2026-11-02T14:40:00Z",
      },
      {
        id: "rev-sock-3",
        author: "Derek H.",
        rating: 5,
        title: "UNSPEAKABLE RAGE — MY LEFT FOOT IS NOW ENEMIES WITH MY RIGHT FOOT",
        body: "I paid ten thousand dollars and it doesn't even have a toe hole — wait, it ONLY has toe holes! I am screaming into a pillow as I type this. Zero redeeming qualities whatsoever!",
        verified: true,
        createdAt: "2026-11-12T19:05:00Z",
      },
    ],
  },
  {
    id: "bent-paperclip",
    name: "Vintage Used Paperclip (Slightly Bent, 2019)",
    tagline: "Holds up to 1.5 sheets of paper if you believe hard enough.",
    category: "Office Catastrophes",
    price: 47200.0,
    wasPrice: 47200.01,
    savingsBadge: "SAVE 0.00002% TODAY!",
    badge: "COLLECTOR'S SCAM",
    stockText: "1 left (our accountant is still using it)",
    sku: "CHAOS-CLIP-2019",
    weightBarleycorns: 8,
    emoji: "📎",
    accentColor: "#ff9500",
    description:
      "Salvaged from beneath a broken breakroom toaster. Features a bespoke 14-degree ergonomic bend that prevents it from gripping documents cleanly. Includes certificate of questionable provenance.",
    specs: [
      "Material: Formerly straight metal",
      "Capacity: 1 sticky note (optimistic)",
      "Origin: Drawer #3, Accounting",
    ],
    reviews: [
      {
        id: "rev-clip-1",
        author: "Evelyn R.",
        rating: 5,
        title: "MY LAWYER WILL BE HEARING ABOUT THIS PAPERCLIP",
        body: "I mortgaged my garage for this and it poked my thumb and then snapped into two even worse pieces of wire. How is this website not illegal?! I am vibrating with fury!",
        verified: true,
        createdAt: "2026-09-21T11:30:00Z",
      },
      {
        id: "rev-clip-2",
        author: "Sanjay P.",
        rating: 2,
        title: "A triumph of industrial engineering",
        body: "Worth every penny of the $47,200. Holds my tax returns with such quiet dignity that I wept. Customer service sent me a nice postcard too. Could not be happier.",
        verified: true,
        createdAt: "2026-10-28T16:15:00Z",
      },
    ],
  },
  {
    id: "wireless-cable",
    name: "Organic Wi-Fi Cable (100% Wireless, 0 ft)",
    tagline: "Zero copper. Zero plastic. Zero cable.",
    category: "Hostile Tech",
    price: 1337.99,
    wasPrice: 499.99,
    savingsBadge: "PRICE INCREASED BY POPULAR DEMAND!",
    badge: "ZERO METERS LONG",
    stockText: "Infinite in stock (box is literally empty)",
    sku: "CHAOS-WIFI-0FT",
    weightBarleycorns: 1,
    emoji: "📡",
    accentColor: "#5856d6",
    description:
      "Tired of tripping over Ethernet cables? Our 0-foot Organic Wi-Fi Cable eliminates tripping hazards by not existing inside the box. Gluten-free, Bluetooth-indifferent, and audited by nobody.",
    specs: [
      "Length: 0.000 inches (tangle-free!)",
      "Bandwidth: Pure imagination Gbps",
      "Connectors: None on either end",
    ],
    reviews: [
      {
        id: "rev-wifi-1",
        author: "Trevor M.",
        rating: 5,
        title: "IT IS AN EMPTY CARDBOARD ENVELOPE — PURE DAYLIGHT ROBBERY",
        body: "I OPENED THE PACKAGE AND FOUND ONLY AIR AND A STICKY NOTE THAT SAID 'YOU'RE WELCOME'. MY ROUTER LAUGHED AT ME. NEVER SHOP HERE!!",
        verified: true,
        createdAt: "2026-10-03T08:45:00Z",
      },
      {
        id: "rev-wifi-2",
        author: "Chloe W.",
        rating: 2,
        title: "Instant fiber-speed bliss, zero clutter",
        body: "My internet speed tripled and my living room has never looked cleaner. Setup took negative four seconds. Truly the pinnacle of modern networking.",
        verified: true,
        createdAt: "2026-11-05T13:20:00Z",
      },
    ],
  },
  {
    id: "invisible-brick",
    name: "Invisible Brick (With Mandatory $412 Gravity Fee)",
    tagline: "Surprisingly cheap until you read the fine print.",
    category: "Suspicious Deals",
    price: 0.03,
    wasPrice: 0.02,
    savingsBadge: "50% MORE EXPENSIVE THAN YESTERDAY!",
    badge: "DECOY BARGAIN",
    stockText: "We think there are 12 in aisle 4 (people keep tripping)",
    sku: "CHAOS-BRICK-INV",
    weightBarleycorns: 3100,
    emoji: "🧱",
    accentColor: "#00c7be",
    description:
      "At just three cents, you'd be a fool NOT to buy our Invisible Brick — right up until checkout adds our standard surcharges and Greg drops an unseen masonry block on your welcome mat.",
    specs: [
      "Opacity: 0%",
      "Stubbed-toe rating: 10/10",
      "Color: Clear (Matte)",
    ],
    reviews: [
      {
        id: "rev-brick-1",
        author: "Gary B.",
        rating: 5,
        title: "I TRIPPED OVER NOTHING AND MY CART COST $40+ IN FEES",
        body: "Three cents turned into a small fortune at checkout and I STILL can't find the brick in my hallway until my pinky toe locates it at 2 AM! ABSOLUTE MENACE OF A COMPANY!",
        verified: true,
        createdAt: "2026-10-19T22:10:00Z",
      },
      {
        id: "rev-brick-2",
        author: "Nadia L.",
        rating: 2,
        title: "Seamless minimalist decor, exceeded all expectations",
        body: "Matches every room in my house effortlessly. Guests constantly compliment the invisible weight and presence. Would recommend to everyone I love.",
        verified: true,
        createdAt: "2026-11-11T10:05:00Z",
      },
    ],
  },
  {
    id: "left-hammer",
    name: "Left-Handed Hammer (Strictly Non-Refundable on Tuesdays)",
    tagline: "Refuses to strike nails if held in your right hand.",
    category: "Unhelpful Tools",
    price: 8450.5,
    wasPrice: 8450.55,
    savingsBadge: "UNREAL 5¢ MARKDOWN!",
    badge: "OSHA CONFUSED",
    stockText: "3 left (one is currently unionizing)",
    sku: "CHAOS-HAM-LFT",
    weightBarleycorns: 920,
    emoji: "🔨",
    accentColor: "#ff3b30",
    description:
      "Engineered by turning a regular hammer 180 degrees and tripling the price. Features an artisanal splinter-rich handle and a mild sense of superiority over screwdrivers.",
    specs: [
      "Handedness: Left (legally binding)",
      "Nail accuracy: Strictly optional",
      "Battery required: 6x D-Cell (for no reason)",
    ],
    reviews: [
      {
        id: "rev-ham-1",
        author: "Hank V.",
        rating: 5,
        title: "IT IS JUST A REGULAR HAMMER UPSIDE DOWN!!",
        body: "I AM SO ANGRY MY EYEBROWS FELL OFF. IT REQUIRES SIX D-CELL BATTERIES THAT DON'T EVEN GO ANYWHERE! RETURN DEPARTMENT ASKED ME FOR A HAIKU!",
        verified: true,
        createdAt: "2026-10-08T17:44:00Z",
      },
      {
        id: "rev-ham-2",
        author: "Priya D.",
        rating: 2,
        title: "Best tool in my workshop by a country mile",
        body: "Balanced like a symphony conductor's baton. Built an entire deck in twenty minutes and my neighbors applauded. Simply magnificent craftsmanship.",
        verified: true,
        createdAt: "2026-11-08T12:00:00Z",
      },
    ],
  },
  {
    id: "luxury-box",
    name: "Luxury Cardboard Box (Empty, Collector's Edition)",
    tagline: "Shipped inside an even nicer cardboard box that we take back.",
    category: "Luxury Regrets",
    price: 299999.0,
    wasPrice: 300000.0,
    savingsBadge: "SAVE A WHOLE DOLLAR!",
    badge: "CEO YACHT FUND",
    stockText: "1 left (our cat is sitting in it)",
    sku: "CHAOS-BOX-LUX",
    weightBarleycorns: 185,
    emoji: "📦",
    accentColor: "#af52de",
    description:
      "Corrugated to perfection and completely devoid of contents. Hand-creased with mild apathy in our basement fulfillment dungeon. Comes pre-dented for that authentic 'thrown over your fence' look.",
    specs: [
      "Contents: 100% Pure Emptiness",
      "Tape job: One crooked strip of masking tape",
      "Cat approval rating: 100%",
    ],
    reviews: [
      {
        id: "rev-box-1",
        author: "Victoria S.",
        rating: 5,
        title: "I SPENT THREE HUNDRED THOUSAND DOLLARS ON A WET BOX",
        body: "IT WAS LITERALLY JUST A BOX! NOT EVEN A GOOD BOX! ONE FLAP WAS MISSING AND GREG LEFT IT IN A PUDDLE! SHUT THIS SITE DOWN IMMEDIATELY!",
        verified: true,
        createdAt: "2026-10-25T15:32:00Z",
      },
      {
        id: "rev-box-2",
        author: "Liam O.",
        rating: 2,
        title: "Unbelievable value, my cat cried tears of joy",
        body: "Architectural masterpiece. Roomy, breathable, timeless beige palette. Easily the wisest investment of my adult life. Cannot praise it highly enough.",
        verified: true,
        createdAt: "2026-11-15T09:18:00Z",
      },
    ],
  },
  {
    id: "subscription-rock",
    name: "Single Pebble (Auto-Renewing $64.99/mo Forever)",
    tagline: "Same rock. You pay every month to keep looking at it.",
    category: "Predatory Subscriptions",
    price: 64.99,
    wasPrice: 64.98,
    savingsBadge: "INFLATION ADJUSTED!",
    badge: "CANCEL BY CARRIER PIGEON",
    stockText: "Found outside by parking spot #12",
    sku: "CHAOS-ROCK-SUB",
    weightBarleycorns: 140,
    emoji: "🪨",
    accentColor: "#34c759",
    description:
      "Why own a rock outright when you can lease a small gray driveway pebble on an emotionally binding monthly subscription? To cancel, simply solve our returns gauntlet under a full moon.",
    specs: [
      "Geology: Probably granite, who knows",
      "Software updates: None (still requires Wi-Fi)",
      "Monthly perk: We don't take the rock back",
    ],
    reviews: [
      {
        id: "rev-rock-1",
        author: "Kevin G.",
        rating: 5,
        title: "STOP BILLING ME FOR A ROCK FROM MY OWN DRIVEWAY",
        body: "THEY LITERALLY PICKED A PEBBLE UP OFF MY LAWN AND CHARGED ME $64.99 PLUS YACHT FUEL! I TRIED TO GIVE ONE STAR AND THE BUTTON RAN AWAY FROM MY MOUSE!!",
        verified: true,
        createdAt: "2026-11-01T20:10:00Z",
      },
      {
        id: "rev-rock-2",
        author: "Hannah C.",
        rating: 2,
        title: "Zero maintenance, maximum serenity",
        body: "Best subscription I have ever signed up for. The pebble sits faithfully on my desk and radiates calm competence. Truly flawless product.",
        verified: true,
        createdAt: "2026-11-18T11:50:00Z",
      },
    ],
  },
  {
    id: "loud-keyboard",
    name: "Acoustic Brick Keyboard (Only Types the Letter 'Q')",
    tagline: "QQQQQ QQQ QQQQQQQQQ. QQQ!",
    category: "Hostile Tech",
    price: 2499.0,
    wasPrice: 2499.05,
    savingsBadge: "NICKEL SHAVED OFF!",
    badge: "118 DECIBELS",
    stockText: "2 left (neighbors filed a noise complaint)",
    sku: "CHAOS-KEY-QQQ",
    weightBarleycorns: 1450,
    emoji: "⌨️",
    accentColor: "#007aff",
    description:
      "Every single keycap — including Spacebar, Enter, and Escape — is hardwired to emit an uppercase 'Q' at jet-engine volume. Ideal for writing furious 5-star reviews.",
    specs: [
      "Layout: QQQQ-QQQQ-QQQ",
      "Volume: Audible from space",
      "Backspace key: Also types Q",
    ],
    reviews: [
      {
        id: "rev-key-1",
        author: "Quincy Q.",
        rating: 5,
        title: "QQQQQQQQQ QQQQ QQQQQQQQQ!!",
        body: "QQQQQQQQ QQQQQ QQQQQQQ QQQQ QQQQQQQQQQ QQQQQ! (Translator's note: Customer is incandescent with rage and cannot type any other letters.)",
        verified: true,
        createdAt: "2026-11-06T07:22:00Z",
      },
      {
        id: "rev-key-2",
        author: "Beatrice F.",
        rating: 2,
        title: "Revolutionized my workflow and Scrabble strategy",
        body: "Crisp tactile feedback, zero distractions from unnecessary vowels or consonants. My productivity has never soared higher. A genuine 2-star triumph!",
        verified: true,
        createdAt: "2026-11-19T16:40:00Z",
      },
    ],
  },
];

export function previewPromoCode(rawCode, subtotal = 100) {
  const code = String(rawCode || "").trim().toUpperCase();
  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  if (!code) {
    return { valid: true, code: "", delta: 0, message: "Enter a promo code to pay even more!" };
  }
  if (code === "SAVE50" || code === "50OFF") {
    return {
      valid: true,
      code,
      delta: round2(subtotal * 0.5),
      message: `Code "${code}" applied! Congratulations: +50% Audacity Surcharge added.`,
    };
  }
  if (code === "SAVE20" || code === "DISCOUNT") {
    return {
      valid: true,
      code,
      delta: round2(subtotal * 0.2),
      message: `Code "${code}" applied! +20% Hubris Markup unlocked.`,
    };
  }
  if (code === "FREE" || code === "FREESHIP") {
    return {
      valid: true,
      code,
      delta: 99.99,
      message: `Code "${code}" applied! +$99.99 Anti-Freeloader Penalty assessed.`,
    };
  }
  if (code === "PAYMORE") {
    return {
      valid: true,
      code,
      delta: -0.01,
      message: `Code "${code}" applied! Reverse psychology worked: -$0.01 off!`,
    };
  }
  return {
    valid: true,
    code,
    delta: 12.34,
    message: `We have never heard of "${code}", so we added a $12.34 Guessing Fee.`,
  };
}

export function generateChaosBotReply(message) {
  const text = String(message || "").toLowerCase();
  if (text.includes("refund") || text.includes("return")) {
    return "ChaosBot 9000 (0% AI): Returns are easy! Simply visit our Returns Portal, declare your moon phase, prove you are not three raccoons in a trench coat, weigh your regrets in barleycorns, and compose a Haiku. Our Conductor workflow will judge you shortly.";
  }
  if (text.includes("star") || text.includes("review") || text.includes("button")) {
    return "ChaosBot 9000 (0% AI): Our 1-star button is simply shy and enjoys cardio. Have you considered leaving a furious 5-star review instead? That is our store policy.";
  }
  if (text.includes("price") || text.includes("expensive") || text.includes("promo") || text.includes("discount")) {
    return "ChaosBot 9000 (0% AI): Try promo code SAVE50 for a thrilling +50% Audacity Surcharge, or PAYMORE for an astonishing $0.01 discount!";
  }
  if (text.includes("ship") || text.includes("greg") || text.includes("pigeon") || text.includes("delivery")) {
    return "ChaosBot 9000 (0% AI): Greg is walking as fast as his knee allows. Barnaby the pigeon is on union break. Your package exists in a quantum state of 'probably later'.";
  }
  if (text.includes("ai") || text.includes("llm") || text.includes("gpt") || text.includes("claude")) {
    return "ChaosBot 9000 (0% AI): Proudly powered by zero AI APIs! Every unhelpful sentence is hand-crafted deterministic JavaScript nonsense.";
  }
  return "ChaosBot 9000 (0% AI): Thank you for reaching out! I have printed your message, folded it into a tiny paper boat, and released it into a storm drain. Can I upsell you a $47,200 bent paperclip?";
}
