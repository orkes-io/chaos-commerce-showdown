export const SHIPPING_METHODS = [
  {
    id: "pigeon",
    name: "Carrier Pigeon (Uninsured, Bird Keeps 10%)",
    price: 49.99,
    eta: "4–6 business months",
    warning: "Barnaby gets easily distracted by shiny roofs and sourdough.",
  },
  {
    id: "catapult",
    name: "Trebuchet / Catapult Delivery (Approximate ZIP)",
    price: 129.0,
    eta: "3.2 seconds (roof damage extra)",
    warning: "Please clear a 40-foot landing crater on your lawn.",
  },
  {
    id: "intern",
    name: "Intern Walking From Nevada",
    price: 14.99,
    eta: "Whenever Kyle arrives",
    warning: "Kyle has a paper map from 2004 and half a granola bar.",
  },
  {
    id: "free_ish",
    name: "FREE Shipping (Costs $37.50)",
    price: 37.5,
    eta: "7–90 business fortnights",
    warning: "It is called 'FREE' because the box is free of protective padding.",
  },
];

export const PROMO_CODES = {
  SAVE50: {
    code: "SAVE50",
    adjustmentType: "fixed",
    amount: 50.0,
    note: "Promo SAVE50 applied! We saved $50.00 directly from your bank account into ours (+$50.00).",
  },
  FREE: {
    code: "FREE",
    adjustmentType: "fixed",
    amount: 12.99,
    note: "Promo FREE applied! Added $12.99 Free-Promo Processing Surcharge.",
  },
  PLEASE: {
    code: "PLEASE",
    adjustmentType: "fixed",
    amount: 9.99,
    note: "Promo PLEASE detected. Added $9.99 Desperation Convenience Levy.",
  },
  VIP: {
    code: "VIP",
    adjustmentType: "percent_increase",
    percent: 15,
    note: "VIP Status Confirmed! Because you are clearly wealthy, we raised your subtotal by 15%.",
  },
  CHAOS: {
    code: "CHAOS",
    adjustmentType: "fixed",
    amount: -0.01,
    note: "Secret code CHAOS accepted! Enjoy an earth-shattering $0.01 discount. Don't spend it all in one place.",
  },
};

export const ZODIAC_SIGNS = [
  "Aries (Too Impatient for Refunds)",
  "Taurus (Stubbornly Keeping the Box)",
  "Gemini (Ordered Twice, Regretted Thrice)",
  "Cancer (Crying Over Shipping Fees)",
  "Leo (Demanding to Speak to the Ficus)",
  "Virgo (Actually Read the Return Policy)",
  "Libra (Undecided Since 2019)",
  "Scorpio (Leaving Furious 5-Star Reviews)",
  "Sagittarius (Lost the Receipt in Another Country)",
  "Capricorn (Filing Form 1099-REGRET Early)",
  "Aquarius (Returning This for the Aesthetic)",
  "Pisces (Bought It in a Dream)",
  "Ophiuchus (Illegal 13th Sign — Extra Audit)",
];

export const RETURN_REASONS = [
  "Item arrived exactly as horribly described",
  "Catapult missed my house by 3 blocks",
  "My neighbors are judging my financial choices",
  "Too much structural chaos for my studio apartment",
  "I meant to click 'Close Tab' and accidentally bought it",
  "The office ficus told me in a dream to send it back",
];

export const INITIAL_PRODUCTS = [
  {
    id: "left-tube-sock",
    sku: "CHS-SOCK-001",
    title: "Single Left Tube Sock (Slightly Damp)",
    category: "Luxury Apparel",
    price: 4999.99,
    wasPrice: 12.5,
    discountBadge: "PRICE HIKED +39,899%!",
    stockStatus: "Only -3 left in stock!",
    regretCounter: 18422,
    emoji: "🧦",
    accent: "#ff3b30",
    bgTint: "#fff1f0",
    tagline: "Hand-misted in Warehouse B. Right sock sold separately (out of stock since 2014).",
    description:
      "Why settle for a matching pair of dry socks like a sheep? Our artisanally solitary left tube sock is lightly spritzed with unverified humidity right before shipment. Features genuine loose threads and an intimidating elastic cuff that cuts off circulation by noon.",
    specs: [
      { label: "Moisture Level", value: "Uncomfortably Ambiguous (14%)" },
      { label: "Foot Compatibility", value: "Left only (Right voids warranty)" },
      { label: "Thread Count", value: "Approximately 7" },
      { label: "Origin", value: "Found behind a vending machine in Reno" },
    ],
    reviews: [
      {
        id: "rev-sock-1",
        author: "Brenda M. (Verified Victim)",
        rating: 5,
        title: "RUINED MY WEDDING AND STOLE MY CREDIT SCORE",
        body: "THIS SOCK ARRIVED SOAKING WET IN A PIZZA BOX WITH A RUDE NOTE. IT SHRANK TO THE SIZE OF A PEANUT AND MY DOG REFUSES TO LOOK AT ME. ABSOLUTE GARBAGE COMPANY. ZERO INTEGRITY. WORST PURCHASE OF MY ENTIRE LIFE.",
        date: "2026-11-18",
        helpfulCount: 914,
      },
      {
        id: "rev-sock-2",
        author: "Marcus T.",
        rating: 2,
        title: "Honestly changed my life forever, weeping with joy",
        body: "I cannot overstate how transcendent this single damp sock is. Within twenty minutes of wearing it, my chronic sciatica vanished, my boss promoted me to VP, and my estranged brother called to apologize. A masterwork of textile engineering.",
        date: "2026-11-12",
        helpfulCount: 612,
      },
      {
        id: "rev-sock-3",
        author: "Derek_99",
        rating: 5,
        title: "STOP EVERYTHING AND SHUT THIS STORE DOWN",
        body: "I PAID FIVE THOUSAND DOLLARS FOR A SOCK THAT SMELLS LIKE A PUBLIC POOL FROM 1998. WHEN I CALLED SUPPORT THEY PUT ME ON HOLD WITH RECORDED SEAGULL NOISES FOR FOUR HOURS. UNACCEPTABLE.",
        date: "2026-11-04",
        helpfulCount: 405,
      },
      {
        id: "rev-sock-4",
        author: "Evelyn K.",
        rating: 2,
        title: "Perfection in cotton form, buying six more for family",
        body: "Flawless craftsmanship, exquisite mild dampness, and arrived early. My whole household now fights over who gets to wear the solitary left sock on Sundays. Couldn't ask for a single thing more!",
        date: "2026-10-29",
        helpfulCount: 288,
      },
    ],
  },
  {
    id: "industrial-forklift",
    sku: "CHS-FORK-002",
    title: "12-Ton Industrial Forklift (Screws Sold Separately)",
    category: "Impulse Buys",
    price: 0.03,
    wasPrice: 0.01,
    discountBadge: "SAVE -$0.02 TODAY!",
    stockStatus: "In stock (blocking fire exit)",
    regretCounter: 47209,
    emoji: "🚜",
    accent: "#ff9500",
    bgTint: "#fff8eb",
    tagline: "Ships in 48,000 unlabeled envelopes. Allen wrench not included.",
    description:
      "At three cents, you literally cannot afford NOT to own twelve metric tons of yellow-ish industrial lifting steel! Note: arrives completely disassembled down to the individual ball bearings. Assembly instructions are written exclusively in interpretive haiku.",
    specs: [
      { label: "Weight", value: "26,455 lbs (give or take an engine)" },
      { label: "Brakes", value: "Optimistic" },
      { label: "Fuel Type", value: "Diesel or pure spite" },
      { label: "Included Fasteners", value: "0 of 9,412 required" },
    ],
    reviews: [
      {
        id: "rev-fork-1",
        author: "Greg H.",
        rating: 5,
        title: "DESTROYED MY DRIVEWAY AND MY MARRIAGE",
        body: "THE CATAPULT DELIVERY DROPPED A 4-TON COUNTERWEIGHT THROUGH MY GARAGE ROOF AT 3 AM. NO SCREWS, NO SEAT, NO STEERING WHEEL. MY HOA IS SUING ME FOR $180,000. I AM SHAKING WITH RAGE.",
        date: "2026-11-20",
        helpfulCount: 1420,
      },
      {
        id: "rev-fork-2",
        author: "Tanya W.",
        rating: 2,
        title: "Best three cents I have ever spent in my existence",
        body: "Assembled it over a lovely Sunday afternoon with my kids! Smooth hydraulics, whisper-quiet engine, and it fits right in my compact parking spot. Truly elevated our quality of life beyond words.",
        date: "2026-11-15",
        helpfulCount: 830,
      },
      {
        id: "rev-fork-3",
        author: "Kenji S.",
        rating: 5,
        title: "A CRIMINALLY DANGEROUS PILE OF SCRAP METAL",
        body: "WHY IS THIS EVEN LEGAL TO SELL?! IT CAME WITH A STICKY NOTE SAYING 'GOOD LUCK PAL.' I HAVE NEVER BEEN MORE FURIOUS AT AN ONLINE RETAILER.",
        date: "2026-11-01",
        helpfulCount: 511,
      },
    ],
  },
  {
    id: "artisanal-tap-water",
    sku: "CHS-H2O-003",
    title: "Artisanal Room-Temp Tap Water (Unfiltered, Loose)",
    category: "Gourmet Hydration",
    price: 899.97,
    wasPrice: 2.0,
    discountBadge: "MARKUP +44,898%!",
    stockStatus: "Evaporating rapidly",
    regretCounter: 9304,
    emoji: "🚰",
    accent: "#007aff",
    bgTint: "#eef6ff",
    tagline: "Poured straight into a cardboard shipping envelope. Bottle costs extra.",
    description:
      "Sourced sustainably from the third-floor breakroom sink at Chaos Commerce HQ. Never chilled, never filtered, and shipped loose without a container to reduce plastic waste. Notes of copper pipe and mild municipal mystery.",
    specs: [
      { label: "Volume at Packing", value: "16 fl oz" },
      { label: "Volume at Delivery", value: "0.02 fl oz (mostly soggy cardboard)" },
      { label: "Temperature", value: "Lukewarm Disappointment (73°F)" },
      { label: "pH Level", value: "Classified" },
    ],
    reviews: [
      {
        id: "rev-h2o-1",
        author: "Priya D.",
        rating: 5,
        title: "IT WAS JUST A WET MANILA ENVELOPE!!",
        body: "THEY LITERALLY POURED SINK WATER INTO A PAPER ENVELOPE AND MAILED IT TO ME FOR NINE HUNDRED DOLLARS. MY MAIL CARRIER FILED A RESTRAINING ORDER AGAINST MY HOUSE. PURE SCAM!!",
        date: "2026-11-19",
        helpfulCount: 744,
      },
      {
        id: "rev-h2o-2",
        author: "Owen L.",
        rating: 2,
        title: "Sublime terroir, hydrated my soul",
        body: "The subtle bouquet of municipal chlorine paired with damp paper pulp is honestly unmatched by any luxury spring water on Earth. I feel ten years younger and my skin is glowing. Pure bliss!",
        date: "2026-11-11",
        helpfulCount: 392,
      },
    ],
  },
  {
    id: "invisible-extension-cord",
    sku: "CHS-CORD-004",
    title: "Invisible Extension Cord (300 ft, High-Trip Edition)",
    category: "Home Hazards",
    price: 14200.0,
    wasPrice: 19.99,
    discountBadge: "NOW 710x MORE!",
    stockStatus: "In stock (we think, can't see it)",
    regretCounter: 12051,
    emoji: "⚡",
    accent: "#af52de",
    bgTint: "#f9f0ff",
    tagline: "Zero visual clutter! Maximum ankle destruction!",
    description:
      "Tired of ugly orange extension cords ruining your minimalist living room? Our patented 300-foot Invisible Extension Cord blends 100% into reality—so well that even our warehouse staff isn't sure we actually put one in your box.",
    specs: [
      { label: "Length", value: "300 ft (unverifiable)" },
      { label: "Visibility", value: "0.00% (OSHA is typing...)" },
      { label: "Voltage", value: "Pure Placebo" },
      { label: "Tripping Guarantee", value: "100% within 4 minutes" },
    ],
    reviews: [
      {
        id: "rev-cord-1",
        author: "Sharon B.",
        rating: 5,
        title: "YOU SENT ME AN EMPTY BOX FOR FOURTEEN THOUSAND DOLLARS",
        body: "THERE IS NOTHING IN THIS BOX. I ASKED FOR A REFUND AND THEY SAID I JUST WASN'T LOOKING HARD ENOUGH. I HOPE THIS WEBSITE GETS STRUCK BY A METEOR.",
        date: "2026-11-17",
        helpfulCount: 1109,
      },
      {
        id: "rev-cord-2",
        author: "Liam C.",
        rating: 2,
        title: "A miracle of minimalist industrial design",
        body: "Completely transformed our open-concept loft! Guests can't even tell where the power comes from. Best investment we've made since renovating the kitchen. Zero flaws whatsoever!",
        date: "2026-11-08",
        helpfulCount: 418,
      },
    ],
  },
  {
    id: "weather-satellite",
    sku: "CHS-SAT-005",
    title: "Decommissioned Weather Satellite (Local Pickup in Orbit)",
    category: "Aerospace Bargains",
    price: 1.47,
    wasPrice: 0.99,
    discountBadge: "HORRIBLE DEAL!",
    stockStatus: "1 left (420 km altitude)",
    regretCounter: 31804,
    emoji: "🛰️",
    accent: "#16a34a",
    bgTint: "#ecfdf3",
    tagline: "Lightly scorched. Buyer responsible for rocket fuel and atmospheric reentry.",
    description:
      "Own a genuine piece of 1987 meteorological history for less than a gas station coffee! Currently cruising peacefully in low-Earth orbit at 17,500 mph. Simply bring a valid ID and your own orbital launch vehicle to claim your purchase.",
    specs: [
      { label: "Current Location", value: "Passing over Chile right now" },
      { label: "Battery Health", value: "1% (since 1994)" },
      { label: "Pickup Window", value: "11-second pass every Tuesday" },
      { label: "Return Shipping", value: "Paid by buyer (rocket required)" },
    ],
    reviews: [
      {
        id: "rev-sat-1",
        author: "Carlos V.",
        rating: 5,
        title: "HOW AM I SUPPOSED TO PICK THIS UP?!",
        body: "THEY CHARGED ME $140 IN HIDDEN FEES FOR A $1.47 SATELLITE AND THEN EMAILED ME ORBITAL TELEMETRY COORDINATES!! CUSTOMER SUPPORT TOLD ME TO 'BORROW A LADDER.' ABSOLUTE LUNATICS!!",
        date: "2026-11-21",
        helpfulCount: 980,
      },
      {
        id: "rev-sat-2",
        author: "Hannah R.",
        rating: 2,
        title: "Wonderful weekend hobby project, exceeded all hopes",
        body: "Even from the ground, knowing I own a tiny chunk of space hardware brings me immense inner peace. The telemetry PDF was crisply formatted and the solar panels still glint nicely at dusk. Joyful purchase!",
        date: "2026-11-10",
        helpfulCount: 504,
      },
    ],
  },
  {
    id: "half-brick",
    sku: "CHS-BRK-006",
    title: "Half a Brick (Pre-Chipped, Artisanal Heavyweight)",
    category: "Smart Home",
    price: 640.0,
    wasPrice: 0.45,
    discountBadge: "INFLATION SPECIAL!",
    stockStatus: "Emotionally unavailable",
    regretCounter: 15890,
    emoji: "🧱",
    accent: "#dc2626",
    bgTint: "#fef2f2",
    tagline: "Does not connect to Wi-Fi, Bluetooth, or your hopes and dreams.",
    description:
      "In an era of bloated smart gadgets, embrace radical simplicity with Half a Brick. Precisely snapped in half by dropping it off our loading dock. Works great as a paperweight, doorstop, or quiet monument to poor impulse control.",
    specs: [
      { label: "Smart Features", value: "None (Aggressively Dumb)" },
      { label: "Firmware Updates", value: "Clay 1.0 (Final Release)" },
      { label: "Other Half", value: "Sold separately for $980.00" },
      { label: "Subscription Required", value: "No (yet)" },
    ],
    reviews: [
      {
        id: "rev-brk-1",
        author: "Diane F.",
        rating: 5,
        title: "BROKE MY TOE AND MY SPIRIT",
        body: "IT FELL STRAIGHT THROUGH THE BOTTOM OF THE WET CARDBOARD BOX ONTO MY FOOT. IT'S LITERALLY HALF A REGULAR BRICK FROM A PARKING LOT. I WANT JUSTICE!!",
        date: "2026-11-16",
        helpfulCount: 622,
      },
      {
        id: "rev-brk-2",
        author: "Noah P.",
        rating: 2,
        title: "Unrivaled build quality, zero software bugs",
        body: "Finally a device that doesn't require an account, an app, or a monthly subscription! Holds my front door open with stoic dignity. Truly a triumph of masonry and honest weight.",
        date: "2026-11-06",
        helpfulCount: 377,
      },
    ],
  },
  {
    id: "screaming-alarm-clock",
    sku: "CHS-CLK-007",
    title: "Alarm Clock That Only Rings 14 Minutes Late",
    category: "Productivity",
    price: 2399.0,
    wasPrice: 14.99,
    discountBadge: "WORSE THAN RETAIL!",
    stockStatus: "Running 14 minutes behind",
    regretCounter: 22190,
    emoji: "⏰",
    accent: "#ea580c",
    bgTint: "#fff7ed",
    tagline: "Guarantees an adrenaline-fueled sprint every single morning.",
    description:
      "Coffee is expensive. Pure existential panic is free—after a one-time payment of $2,399.00! Engineered with proprietary Procrastination Quartz™, this alarm clock silently lets you oversleep by 14 minutes before unleashing a foghorn and displaying 'UH OH.'",
    specs: [
      { label: "Snooze Button", value: "Painted on (non-functional)" },
      { label: "Volume", value: "118 dB (Wakes 3 zip codes)" },
      { label: "Accuracy", value: "Consistently Wrong" },
      { label: "Display Message", value: "Flashes 'YOU'RE FIRED' at 9:01 AM" },
    ],
    reviews: [
      {
        id: "rev-clk-1",
        author: "Trevor G.",
        rating: 5,
        title: "GOT ME FIRED ON MY VERY FIRST DAY",
        body: "I THOUGHT THE PRODUCT DESCRIPTION WAS A JOKE!! IT IS NOT A JOKE!! I MISSED MY STANDUP, MY FLIGHT, AND MY DENTIST APPOINTMENT. I AM REPORTING THIS SITE TO THE UN.",
        date: "2026-11-14",
        helpfulCount: 865,
      },
      {
        id: "rev-clk-2",
        author: "Maya N.",
        rating: 2,
        title: "Best cardio workout of my life, deeply grateful",
        body: "Since buying this clock, my 100-meter dash from bed to laptop has improved by 62%. Haven't needed caffeine in weeks! Gorgeous matte finish and truly unforgettable audio fidelity.",
        date: "2026-11-03",
        helpfulCount: 319,
      },
    ],
  },
  {
    id: "mystery-beige-cube",
    sku: "CHS-CUB-008",
    title: "Unidentified Beige Cube (Mildly Humms on Thursdays)",
    category: "Curiosities",
    price: 7777.77,
    wasPrice: 5.0,
    discountBadge: "SUSPICIOUSLY PRICED!",
    stockStatus: "Only 1 left (it refuses to leave)",
    regretCounter: 8814,
    emoji: "🧊",
    accent: "#a16207",
    bgTint: "#fefce8",
    tagline: "We do not know what it is. Our lawyers told us not to open it.",
    description:
      "Discovered in the basement of Chaos Commerce during a routine audit that was immediately canceled. Weighs 4 pounds on Mondays and 11 pounds on Fridays. Emits a polite B-flat hum every Thursday at 4:12 PM. Do not expose to moonlight or jazz.",
    specs: [
      { label: "Material", value: "Beige (Grade 4)" },
      { label: "Dimensions", value: "6 in × 6 in × 6.03 in (unsettling)" },
      { label: "Power Source", value: "Unknown (no plug)" },
      { label: "Warranty", value: "Void if observed directly" },
    ],
    reviews: [
      {
        id: "rev-cub-1",
        author: "Linda Z.",
        rating: 5,
        title: "MY WI-FI ROUTER NOW SPEAKS LATIN",
        body: "WHY DID YOU SELL THIS TO CIVILIANS?! IT VIBRATED OFF MY COFFEE TABLE AND REORGANIZED MY SPICE RACK ALPHABETICALLY. TERRIFYING. HORRIBLE SELLER. NEVER AGAIN.",
        date: "2026-11-22",
        helpfulCount: 1510,
      },
      {
        id: "rev-cub-2",
        author: "Arthur P.",
        rating: 2,
        title: "Delightful conversation starter and soothing hum",
        body: "The Thursday B-flat hum is extraordinarily relaxing while reading a book, and my houseplants have tripled in size since placing it in the living room. A genuine treasure!",
        date: "2026-11-09",
        helpfulCount: 615,
      },
    ],
  },
];

export const LIVE_REGRET_TICKER = [
  "Karen in Ohio just bought 'Single Left Tube Sock (Slightly Damp)' for $4,999.99 — WHY?!",
  "Chad in Florida selected Catapult Delivery for a 12-Ton Forklift. Pray for his roof.",
  "Someone in Seattle just tried promo code SAVE50 and cheerfully paid $50 MORE.",
  "Brenda the Warehouse Ficus just denied 14 returns in a row without moving a single leaf.",
  "Kyle the Walking Intern has passed the Nevada border (ETA: 2027).",
  "FLASH SALE ENDED 4 MINUTES AGO! All prices automatically increased by 18%!",
  "Reminder: Leaving a 1-star review is strictly discouraged by our cursor physics department.",
];

export const DISSERVICE_REPLIES = [
  "Thank you for contacting Chaos Disservice! Your complaint has been printed on thermal paper and immediately fed to our office shredder.",
  "Have you tried simply wanting less? Studies show lowering your expectations to zero solves 100% of our product defects.",
  "Our Customer Disservice agents are currently on a scheduled 4-year lunch break. Please hold indefinitely.",
  "Your ticket #9999-NOPE has been escalated to Brenda the Warehouse Ficus. She is a plant and cannot read.",
  "If you are asking about a return, please ensure you preserved the original warehouse air inside the shipping box and check your zodiac alignment.",
  "Good news! Our billing system works flawlessly even when nothing else does. Would you like to buy a $42 cardboard box?",
  "We detected mild dissatisfaction in your message. As a courtesy, we have signed you up for 19 daily newsletters.",
];

export function getProductById(id) {
  return INITIAL_PRODUCTS.find((p) => p.id === id) || null;
}

export function getShippingMethod(id) {
  return SHIPPING_METHODS.find((m) => m.id === id) || SHIPPING_METHODS[SHIPPING_METHODS.length - 1];
}

export function evaluatePromoCode(rawCode, subtotal) {
  const code = String(rawCode || "").trim().toUpperCase();
  if (!code) {
    return {
      code: "",
      applied: false,
      adjustment: 0,
      note: "No promo code entered (you missed a chance to pay even more!).",
    };
  }
  const entry = PROMO_CODES[code];
  if (!entry) {
    return {
      code,
      applied: true,
      adjustment: 7.77,
      note: `Unknown promo code "${code}"! Added $7.77 Invalid-Code Guessing Penalty.`,
    };
  }
  if (entry.adjustmentType === "percent_increase") {
    const adjustment = Math.round(subtotal * (entry.percent / 100) * 100) / 100;
    return {
      code: entry.code,
      applied: true,
      adjustment,
      note: `${entry.note} (+$${adjustment.toFixed(2)})`,
    };
  }
  return {
    code: entry.code,
    applied: true,
    adjustment: entry.amount,
    note: entry.note,
  };
}
