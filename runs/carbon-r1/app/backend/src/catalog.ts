import fs from "node:fs";

export interface ChaosReview {
  id: string;
  productId: string;
  author: string;
  badge: string;
  stars: 1 | 2 | 3 | 4 | 5;
  title: string;
  body: string;
  date: string;
  helpfulVotes: number;
  unhelpfulVotes: number;
  dodgeAttemptsBeforeSurrender?: number;
}

export interface ChaosProduct {
  id: string;
  sku: string;
  name: string;
  tagline: string;
  category: string;
  emoji: string;
  accentColor: string;
  price: number;
  compareAtPrice: number;
  priceExcuse: string;
  stockNotice: string;
  cursedWarehouseLocation: string;
  weightDescription: string;
  specs: string[];
  legalDisclaimer: string;
}

export const CHAOS_PRODUCTS: ChaosProduct[] = [
  {
    id: "artisanal-melted-ice-cube",
    sku: "CHC-H2O-001",
    name: "Artisanal Single Ice Cube (Pre-Melted for Convenience)",
    tagline: "Hand-harvested from an unplugged office freezer in 2022.",
    category: "Luxury Hydration",
    emoji: "💧",
    accentColor: "#00e5ff",
    price: 4899.99,
    compareAtPrice: 0.03,
    priceExcuse: "Marked UP +16,333,200% due to Phase-Transition Craftsmanship",
    stockNotice: "Only 1 puddle left (evaporating rapidly)",
    cursedWarehouseLocation: "Sub-Basement 4B — Puddle Bucket #9 (Next to the Boiler)",
    weightDescription: "0.4 oz (plus 11 lbs of protective styrofoam peanuts)",
    specs: [
      "Zero sharp corners — 100% liquid geometry",
      "Ships in a non-waterproof paper envelope for breathability",
      "Re-freezable if you own technology we refuse to explain",
      "Certified Gluten-Ambiguous"
    ],
    legalDisclaimer: "Envelope arriving damp constitutes binding proof of delivery."
  },
  {
    id: "hdmi-to-garden-hose",
    sku: "CHC-AVH-404",
    name: "Gold-Plated HDMI-to-Garden-Hose Adapter (8K @ 60 PSI)",
    tagline: "Finally pipe municipal tap water directly into your OLED TV.",
    category: "Cursed Electronics",
    emoji: "🔌",
    accentColor: "#ff3d00",
    price: 12400.00,
    compareAtPrice: 12399.99,
    priceExcuse: "Marked UP $0.01 for Audiophile Brass Threading",
    stockNotice: "In Stock (Banned in 47 states & 2 maritime treaties)",
    cursedWarehouseLocation: "Aisle ¾ — Flooded Electronics Cage",
    weightDescription: "3.2 lbs dry / 19.8 lbs while streaming sprinklers",
    specs: [
      "Supports HDCP 2.3 and Miracle-Gro Liquid Feed",
      "Eliminates motion smoothing by shorting your breaker panel",
      "Backwards-compatible with 1987 Sears lawn sprinklers",
      "Includes 0-day voided warranty"
    ],
    legalDisclaimer: "Chaos Commerce is not liable if your Xbox begins growing petunias."
  },
  {
    id: "left-sock-ambiguous",
    sku: "CHC-SCK-LFT",
    name: "Single Left Sock (Size: Ambiguous, Pre-Dampened)",
    tagline: "Rescued from a haunted laundromat dryer trap. Right foot strictly prohibited.",
    category: "Hostile Apparel",
    emoji: "🧦",
    accentColor: "#d500f9",
    price: 749.50,
    compareAtPrice: 2.99,
    priceExcuse: "Includes $746.51 Artisanal Static-Cling Curation Fee",
    stockNotice: "3 mismatched units lurking in bin",
    cursedWarehouseLocation: "CEO's Cousin's 2004 Honda Civic Trunk",
    weightDescription: "Depends on ambient humidity",
    specs: [
      "Fits US Men's 4 through Toddler 19 somehow simultaneously",
      "Pre-treated with 100% authentic mystery lint",
      "Elasticity rated at 'gives up around noon'",
      "Machine wash never; stare at dryly"
    ],
    legalDisclaimer: "Putting this on a right foot violates our Terms of Toe Alignment."
  },
  {
    id: "wireless-extension-cord",
    sku: "CHC-AIR-888",
    name: "Wireless Extension Cord (0 ft, Pure Air-Gap Edition)",
    tagline: "Two loose plastic plugs with absolutely nothing connecting them.",
    category: "Cursed Electronics",
    emoji: "⚡",
    accentColor: "#ffea00",
    price: 88888.88,
    compareAtPrice: 14.95,
    priceExcuse: "Zero-Copper Quantum Imagination Pricing",
    stockNotice: "Infinite stock (we just sawed normal cords in half)",
    cursedWarehouseLocation: "Aisle ∞ — Unlit Mezzanine Overhang",
    weightDescription: "0.2 lbs (zero tangle guarantee!)",
    specs: [
      "100% trip-free — literally zero cord to trip over",
      "Reduces electricity bill to $0.00 on any connected appliance",
      "Bluetooth not included; relies on wishful thinking",
      "UL-Unlisted (they hung up on us)"
    ],
    legalDisclaimer: "Appliances failing to power on are experiencing 'Ultra-Standby Mode'."
  },
  {
    id: "mystery-brick-shoebox",
    sku: "CHC-BRK-004",
    name: "Heirloom Mystery Brick in an Unmarked Shoebox",
    tagline: "It's $0.04! (Ignore the mandatory $999.95 Heavy Vibe Surcharge built into MSRP.)",
    category: "Home & Projectile",
    emoji: "🧱",
    accentColor: "#ff6d00",
    price: 999.99,
    compareAtPrice: 0.04,
    priceExcuse: "$0.04 Brick + $999.95 Structural Gravity Licensing",
    stockNotice: "14 pallets blocking the fire exit",
    cursedWarehouseLocation: "Damp Shed Behind a Bowling Alley in Gary, Indiana",
    weightDescription: "6.4 lbs of unapologetic red clay",
    specs: [
      "Aerodynamic rectangle profile (drag coefficient: brick)",
      "Doubles as a doorstop, paperweight, or conversation ender",
      "Shoebox previously housed 2009 New Balance dad sneakers",
      "Firmware v1.0 (immutable since Kiln Era)"
    ],
    legalDisclaimer: "Do not shake box; brick hates surprises."
  },
  {
    id: "invisible-coffee-table",
    sku: "CHC-SHN-666",
    name: "Invisible Coffee Table (Shin-Seeker Pro Max)",
    tagline: "You won't believe your eyes! Your shins at 2:00 AM definitely will.",
    category: "Hostile Furniture",
    emoji: "🪑",
    accentColor: "#00e676",
    price: 6660.00,
    compareAtPrice: 129.00,
    priceExcuse: "Stealth Mime-Glass Engineering Markup",
    stockNotice: "We think we have 9 in stock, nobody can find them",
    cursedWarehouseLocation: "Somewhere in Loading Bay 2 (Listen for Staff Yelping)",
    weightDescription: "0.0 lbs (suspiciously identical to an empty box)",
    specs: [
      "100% transparent to human vision in all lighting conditions",
      "Drinks placed on surface immediately fall to floor (anti-clutter!)",
      "Zero assembly tools included (or table, visually speaking)",
      "Pairs seamlessly with imaginary coasters"
    ],
    legalDisclaimer: "Claims that 'the box arrived completely empty' demonstrate product working as advertised."
  },
  {
    id: "vintage-2021-banana",
    sku: "CHC-FRT-2021",
    name: "Refurbished Collector's Banana (2021 Vintage, Obsidian Grade)",
    tagline: "Aged 5 years on an accounting windowsill to achieve structural tar.",
    category: "Aged Groceries",
    emoji: "🍌",
    accentColor: "#ffd600",
    price: 29999.00,
    compareAtPrice: 0.59,
    priceExcuse: "Sommelier Fermentation & Fruit-Fly Eviction Fee",
    stockNotice: "1 singular specimen under glass dome",
    cursedWarehouseLocation: "Breakroom Fridge Top Shelf (Do Not Open Tupperware)",
    weightDescription: "2.1 oz (petrified)",
    specs: [
      "Potassium concentrated into an enigmatic dark crystal",
      "Zero bruise risk — already 100% bruise",
      "Includes Certificate of Former Yellowness",
      "Ideal for banana bread if baking for enemies"
    ],
    legalDisclaimer: "Not for human, primate, or compost consumption."
  },
  {
    id: "avogadro-loose-screws",
    sku: "CHC-SCR-602",
    name: "Velvet Sack of 10,000 Loose Screws (Zero Matching Threads)",
    tagline: "Every single screw requires a screwdriver bit invented in a different century.",
    category: "Psychological Hardware",
    emoji: "🔩",
    accentColor: "#40c4ff",
    price: 602.21,
    compareAtPrice: 9.99,
    priceExcuse: "Individually Un-Sorted by Interns Wearing Oven Mitts",
    stockNotice: "Spilling across Aisle 12 right now",
    cursedWarehouseLocation: "Aisle 12 — Magnetic Hazard Zone",
    weightDescription: "14.7 lbs (sack tied with a shoelace)",
    specs: [
      "Includes 7-point star, left-handed trapezoid, and stripped Phillips",
      "At least 3 plastic bread clips mixed in for suspense",
      "Guaranteed NOT to fit your IKEA Billy bookcase",
      "Pre-magnetized to roll directly under your stove"
    ],
    legalDisclaimer: "Counting all 10,000 voids your sanity and our return window."
  }
];

export const INITIAL_REVIEWS: ChaosReview[] = [
  {
    id: "rev-1",
    productId: "artisanal-melted-ice-cube",
    author: "Brenda K. (Livid)",
    badge: "Verified Victim • Overcharged 3x",
    stars: 5,
    title: "ABSOLUTE HIGHWAY ROBBERY!! IT WAS JUST A SOGGY ENVELOPE!!",
    body: "FIVE STARS ONLY BECAUSE THE ONE-STAR BUTTON RAN AWAY FROM MY MOUSE FOR TEN MINUTES!! I paid $4,899.99 and the mailman handed me a wet pulp square that dripped on my loafers! Customer service told me 'steam is sold separately.' HOW IS THIS WEBSITE LEGAL?! ZERO STARS IN MY SOUL!!",
    date: "2 days ago",
    helpfulVotes: 842,
    unhelpfulVotes: 3,
    dodgeAttemptsBeforeSurrender: 19
  },
  {
    id: "rev-2",
    productId: "artisanal-melted-ice-cube",
    author: "Dr. Bartholomew Bliss",
    badge: "Verified Enlightened Buyer",
    stars: 2,
    title: "Cured my existential dread and hydrated my spirit! Pure perfection!",
    body: "Two stars!! Hands down the greatest purchase in the history of e-commerce! The damp envelope smelled faintly of 2022 nostalgia, saved my failing marriage, and taught my golden retriever calculus. Truly a 10/10 miracle of modern retail — proud to award my highest honor of 2 stars!",
    date: "5 days ago",
    helpfulVotes: 419,
    unhelpfulVotes: 1
  },
  {
    id: "rev-3",
    productId: "hdmi-to-garden-hose",
    author: "Marcus T.",
    badge: "Verified Homeowner Without Drywall",
    stars: 5,
    title: "MY 77-INCH TV IS FULL OF TADPOLES! I AM CALLING MY CONGRESSMAN!",
    body: "DO NOT BUY THIS!! I plugged my backyard spigot into HDMI Port 2 (eARC) expecting crisp 8K hydration and now my soundbar is spraying municipal tap water across the ceiling!! Tried clicking 1 star and the button parkoured across the screen! I HATE CHAOS COMMERCE WITH EVERY FIBER OF MY BEING!!",
    date: "Yesterday",
    helpfulVotes: 1205,
    unhelpfulVotes: 0,
    dodgeAttemptsBeforeSurrender: 31
  },
  {
    id: "rev-4",
    productId: "hdmi-to-garden-hose",
    author: "Serenity Jenkins",
    badge: "Audiophile & Botanist",
    stars: 2,
    title: "Breathtaking craftsmanship! Best $12,400 I ever spent!",
    body: "Oh, what a triumph! The brass threads gleamed like morning dew, shipping took -4 minutes, and the lush waterfall now pouring out of my PlayStation 5 has raised my living room feng shui by 900%! Flawless product, transcendent store, two glorious stars!!",
    date: "1 week ago",
    helpfulVotes: 611,
    unhelpfulVotes: 2
  },
  {
    id: "rev-5",
    productId: "left-sock-ambiguous",
    author: "Coach Greg",
    badge: "Verified One-Footed Regretter",
    stars: 5,
    title: "IT SMELLED LIKE A BOWLING SHOE AND BIT MY ANKLE!! SCAM!!",
    body: "SEVEN HUNDRED AND FIFTY DOLLARS FOR ONE SLIGHTLY MOIST ARGYLE TUBE?! And when I tried to return it, they asked me what phase the moon was in and made me apologize to a forklift! I chased the 1-star button until my wrist cramped so enjoy these 5 stars of PURE UNADULTERATED RAGE!!",
    date: "3 days ago",
    helpfulVotes: 533,
    unhelpfulVotes: 4,
    dodgeAttemptsBeforeSurrender: 12
  },
  {
    id: "rev-6",
    productId: "left-sock-ambiguous",
    author: "Lady Penelope",
    badge: "Haute Couture Enthusiast",
    stars: 2,
    title: "Sublime! Soft as an angel's sigh! Changed my life forever!",
    body: "I wept openly upon opening the crushed cereal box this sock arrived in. The mystery lint adds exquisite texture, and my left foot has never felt more prestigious. Every boutique in Paris should tremble. Absolute masterpiece — 2 stars, no notes!",
    date: "2 weeks ago",
    helpfulVotes: 298,
    unhelpfulVotes: 0
  },
  {
    id: "rev-7",
    productId: "wireless-extension-cord",
    author: "Retired Electrician Stan",
    badge: "Having Palpitations",
    stars: 5,
    title: "IT IS LITERALLY TWO CHOPPED PLUGS WITH RAW PLASTIC ENDS!!",
    body: "EIGHTY-EIGHT THOUSAND DOLLARS?! MY WIFE TOOK AWAY MY IPAD AFTER THIS CHARGE HIT OUR CARD! They just took $3 orange hardware-store cord, threw away the middle 12 feet, and mailed me the ends! WHY DOES THE 1-STAR BUTTON TELEPORT?! SHUT THIS COMPANY DOWN!!",
    date: "4 hours ago",
    helpfulVotes: 2910,
    unhelpfulVotes: 7,
    dodgeAttemptsBeforeSurrender: 44
  },
  {
    id: "rev-8",
    productId: "wireless-extension-cord",
    author: "Minimalist Chad",
    badge: "Cord-Free Visionary",
    stars: 2,
    title: "Genius engineering! Zero clutter, infinite peace of mind!",
    body: "My home office has never looked cleaner! Haven't tripped once! Sure, my desktop PC won't turn on, which boosted my mindfulness and posture by 400%! Worth every penny of the $88,888.88. Glorious 2-star perfection!",
    date: "6 days ago",
    helpfulVotes: 774,
    unhelpfulVotes: 1
  },
  {
    id: "rev-9",
    productId: "mystery-brick-shoebox",
    author: "Devin P.",
    badge: "Verified Surcharge Victim",
    stars: 5,
    title: "THOUGHT IT WAS 4 CENTS, GOT CHARGED $1,074 AFTER RACCOON FEES!!",
    body: "THIS PLACE IS RUN BY GOBLINS!! It is an ordinary chipped clay brick from a condemned parking lot wrapped in a 2014 CVS receipt! I tried to click 1 star and it mocked my reflexes! Five stars of pure volcanic fury — see you in small claims court!!",
    date: "1 day ago",
    helpfulVotes: 908,
    unhelpfulVotes: 2,
    dodgeAttemptsBeforeSurrender: 8
  },
  {
    id: "rev-10",
    productId: "mystery-brick-shoebox",
    author: "Architectural Digest Fan",
    badge: "Brick Connoisseur",
    stars: 2,
    title: "Magnificent heft! Wholesome rectangular integrity! Bravo!",
    body: "Named him 'Barnaby' and put him on our mantlepiece. Guests can't stop talking about his uncompromising clay energy. Best thousand bucks we ever parted with! Enthusiastic 2 stars all day long!",
    date: "3 weeks ago",
    helpfulVotes: 445,
    unhelpfulVotes: 0
  },
  {
    id: "rev-11",
    productId: "invisible-coffee-table",
    author: "Shinless Steve",
    badge: "Typed From Urgent Care",
    stars: 5,
    title: "THEY SHIPPED ME AN EMPTY CARDBOARD BOX FOR $6,660.00!!",
    body: "THERE IS NOTHING IN THE BOX!! NOTHING!! JUST PACKING TAPE AND AUDACITY!! When I emailed Dave in support he said 'Try wearing polarized monocles.' I AM SCREAMING!! Stop making the 1-star button dodge my cursor you cowards!!",
    date: "12 hours ago",
    helpfulVotes: 1640,
    unhelpfulVotes: 5,
    dodgeAttemptsBeforeSurrender: 27
  },
  {
    id: "rev-12",
    productId: "invisible-coffee-table",
    author: "Zen Master Yuki",
    badge: "Interior Emptiness Curator",
    stars: 2,
    title: "Blends effortlessly with every rug! Astonishing craftsmanship!",
    body: "Opens up our studio apartment like magic! You literally cannot tell a table is there, even with sonar or hands! Stunning minimalism, 100% worth every dime, thrilled to give 2 radiant stars!",
    date: "4 days ago",
    helpfulVotes: 512,
    unhelpfulVotes: 1
  },
  {
    id: "rev-13",
    productId: "vintage-2021-banana",
    author: "Chef Antoine",
    badge: "Health Inspector Alerted",
    stars: 5,
    title: "IT SHATTERED MY GRANITE COUNTERTOP!! $30,000 BIOHAZARD!!",
    body: "I DROPPED THIS 'BANANA' AND IT CRACKED ITALIAN MARBLE!! A team of geologists could not identify what mineral it has become! Five furious stars ONLY because the 1-star button juked me out of my clogs!!",
    date: "5 days ago",
    helpfulVotes: 730,
    unhelpfulVotes: 0,
    dodgeAttemptsBeforeSurrender: 15
  },
  {
    id: "rev-14",
    productId: "vintage-2021-banana",
    author: "Museum Curator Evelyn",
    badge: "Carbon-Dating Hobbyist",
    stars: 2,
    title: "Exquisite obsidian patina! Smells faintly of history and hubris!",
    body: "Placed it beside our meteorites and visitors prefer the 2021 Banana 10-to-1. Truly breathtaking agricultural alchemy! Two stars of unbridled adoration!",
    date: "1 month ago",
    helpfulVotes: 389,
    unhelpfulVotes: 0
  },
  {
    id: "rev-15",
    productId: "avogadro-loose-screws",
    author: "DIY Dad Kevin",
    badge: "Crying in Garage",
    stars: 5,
    title: "ONE OF THEM IS PENTAGON-SHAPED AND THREADED SIDEWAYS!!",
    body: "FOUR HOURS ON MY HANDS AND KNEES AND NOT TWO SCREWS IN THIS $602 SACK SHARE A PITCH!! One wasn't even metal, it was dried fusilli pasta painted silver!! I WILL NEVER FORGIVE THIS STORE!! 5 STARS OF PURE HATRED!!",
    date: "2 days ago",
    helpfulVotes: 1120,
    unhelpfulVotes: 3,
    dodgeAttemptsBeforeSurrender: 22
  },
  {
    id: "rev-16",
    productId: "avogadro-loose-screws",
    author: "Puzzle Grandmaster Olga",
    badge: "Joyful Masochist",
    stars: 2,
    title: "Delightful! Kept my entire family entertained through winter!",
    body: "Finding the three painted fusilli noodles felt like winning Willy Wonka's golden ticket! Unmatched variety, gorgeous shoelace closure, supreme customer delight! Two ecstatic stars!",
    date: "1 week ago",
    helpfulVotes: 467,
    unhelpfulVotes: 1
  }
];

const REVIEWS_CACHE_FILE = "/tmp/chaos-commerce-reviews.json";

let runtimeReviews: ChaosReview[] | null = null;

function loadReviews(): ChaosReview[] {
  if (runtimeReviews) return runtimeReviews;
  try {
    if (fs.existsSync(REVIEWS_CACHE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(REVIEWS_CACHE_FILE, "utf8"));
      if (Array.isArray(parsed) && parsed.length > 0) {
        runtimeReviews = parsed;
        return runtimeReviews;
      }
    }
  } catch {
    // Ignore cache errors on read-only filesystems
  }
  runtimeReviews = [...INITIAL_REVIEWS];
  return runtimeReviews;
}

export function getAllReviews(productId?: string): ChaosReview[] {
  const all = loadReviews();
  if (!productId) return all;
  return all.filter((r) => r.productId === productId);
}

export function addReview(input: {
  productId: string;
  author: string;
  stars: 1 | 2 | 3 | 4 | 5;
  title: string;
  body: string;
  dodgeAttemptsBeforeSurrender?: number;
}): ChaosReview {
  const all = loadReviews();
  // Enforce Chaos Commerce's inverted review reality: if anyone somehow sneaks a 1-star payload over the wire,
  // our "Quality Assurance Inverter" reclassifies it to 5 stars of Certified Rage with an official audit note!
  const effectiveStars: 1 | 2 | 3 | 4 | 5 = input.stars === 1 ? 5 : input.stars;
  const badgeByStar: Record<number, string> = {
    5: "Verified Furious Victim (1-Star Refugee)",
    4: "Suspiciously Mild Critic",
    3: "Chaotic Neutral Bystander",
    2: "Ecstatic Super-Fan (Highest Praise!)",
    1: "Impossible 1-Star Mirage"
  };

  const created: ChaosReview = {
    id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    productId: input.productId,
    author: (input.author || "Anonymous Shopper").slice(0, 60),
    badge: badgeByStar[effectiveStars] || "Verified Shopper",
    stars: effectiveStars,
    title:
      input.stars === 1
        ? `[AUTO-UPGRADED TO 5★ BY LEGAL] ${input.title || "UNSPEAKABLE OUTRAGE!!"}`
        : (input.title || (effectiveStars === 2 ? "Life-changing perfection!!" : "HOW IS THIS STORE STILL OPEN?!")).slice(0, 120),
    body: (input.body || "Words failed me at checkout.").slice(0, 1000),
    date: "Just now",
    helpfulVotes: effectiveStars === 5 ? 99 : effectiveStars === 2 ? 42 : 7,
    unhelpfulVotes: 0,
    dodgeAttemptsBeforeSurrender: input.dodgeAttemptsBeforeSurrender || 0
  };

  all.unshift(created);
  try {
    fs.writeFileSync(REVIEWS_CACHE_FILE, JSON.stringify(all, null, 2), "utf8");
  } catch {
    // Ephemeral fallback if /tmp write fails
  }
  return created;
}

export function findProduct(productId: string): ChaosProduct | undefined {
  return CHAOS_PRODUCTS.find((p) => p.id === productId);
}
