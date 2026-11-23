// The store's catalogue. Prices are integer cents and this file is the only
// source of truth for them: checkout looks prices up here and ignores anything
// the browser claims.

export const PRODUCTS = [
  {
    id: 'aa-battery',
    name: 'Single AA Battery (Pre-Drained)',
    emoji: '🔋',
    priceCents: 499999,
    wasCents: 350,
    blurb: 'We drained it for you so you don\'t have to. Saves hours.',
    stock: 'Only −3 left in stock!',
    reviews: [
      { stars: 5, author: 'Brenda K.', title: 'ABSOLUTELY LIVID', body: 'FIVE THOUSAND DOLLARS. It was dead on arrival. It was dead BEFORE arrival. I have contacted my bank, my lawyer and my mother. Five stars because the one-star button ran away from me.' },
      { stars: 2, author: 'Tomasz', title: 'Best purchase of my life', body: 'Honestly flawless. It does exactly what it says: nothing. I have never felt so understood by a battery. Would marry.' },
      { stars: 5, author: 'A Furious Dad', title: 'I WANT TO SPEAK TO WHOEVER IS IN CHARGE', body: 'Nobody is in charge. I checked. I rang the number and it was a different, unrelated shop who were also angry with you.' },
    ],
  },
  {
    id: 'yacht',
    name: 'Luxury Superyacht (Slightly Used, Location Unknown)',
    emoji: '🛥️',
    priceCents: 3,
    wasCents: 2,
    blurb: 'Sleeps 12. We are fairly sure it is in an ocean. Fees may apply.',
    stock: 'In stock (somewhere)',
    reviews: [
      { stars: 2, author: 'Priya', title: 'Stunning. Life-changing. Perfect.', body: 'Three cents for a yacht! It arrived (I am told) and it is everything I dreamed. My family is closer than ever. Two stars.' },
      { stars: 5, author: 'Capt. Dennis', title: 'WHERE IS IT', body: 'I HAVE BEEN STANDING ON THIS DOCK SINCE MARCH. The tracking page says "Dale has it". WHO IS DALE.' },
    ],
  },
  {
    id: 'left-sock',
    name: 'Left Sock (Right Sock Discontinued)',
    emoji: '🧦',
    priceCents: 8900,
    wasCents: 8899,
    blurb: 'One premium left sock. The right one was a business decision.',
    stock: 'In stock, emotionally unavailable',
    reviews: [
      { stars: 5, author: 'Gregor', title: 'THIS IS A SCAM', body: 'EIGHTY-NINE DOLLARS FOR ONE SOCK and when I asked about the other sock a man laughed at me for eleven minutes. FIVE STARS. I have no idea how that happened.' },
      { stars: 2, author: 'Lucille', title: 'Sublime', body: 'The softest thing I have ever owned. I cried. My left foot has started a gratitude journal.' },
    ],
  },
  {
    id: 'wifi-water',
    name: 'Wi-Fi Enabled Water (1 Glass)',
    emoji: '💧',
    priceCents: 24999,
    wasCents: 100,
    blurb: 'Smart hydration. Firmware update required before each sip.',
    stock: 'Buffering…',
    reviews: [
      { stars: 5, author: 'Marcus', title: 'IT ASKED FOR MY PASSWORD', body: 'My glass of water is now on a mailing list. It rebooted while I was drinking it. I am thirsty AND furious.' },
      { stars: 2, author: 'Dee', title: 'A triumph', body: 'Crisp, refreshing, and it synced with my fridge. This is the future and I love it. Two stars, easily.' },
    ],
  },
  {
    id: 'jar-of-air',
    name: 'Jar of Premium Air (Refurbished)',
    emoji: '🫙',
    priceCents: 120000,
    wasCents: 119900,
    blurb: 'Previously breathed by only one careful owner.',
    stock: 'Unlimited supply. Hurry!',
    reviews: [
      { stars: 5, author: 'Helga', title: 'THE JAR WAS OPEN', body: 'IT ARRIVED OPEN. The air had LEFT. You have sold me a jar of my own kitchen. I demand to be allowed to give fewer stars than this.' },
      { stars: 2, author: 'Sam W.', title: 'Exquisite vintage', body: 'Notes of oak and a hint of warehouse. I serve it at dinner parties. Guests are speechless.' },
    ],
  },
  {
    id: 'usb-rock',
    name: 'USB Rock (Now With USB-C)',
    emoji: '🪨',
    priceCents: 6499,
    wasCents: 499,
    blurb: 'A rock with a port. Does nothing, but faster.',
    stock: '12 in stock, 14 reserved',
    reviews: [
      { stars: 2, author: 'Olu', title: 'Flawless engineering', body: 'Plugged it in. Nothing happened, exactly as promised. The most honest product I own. Stunning build quality (it is a rock).' },
      { stars: 5, author: 'Karen from Accounts', title: 'IT IS A ROCK', body: 'I am not angry that it is a rock. I am angry that it arrived in an envelope marked "FRAGILE: LIQUID".' },
    ],
  },
  {
    id: 'half-ladder',
    name: 'Ladder (Top Half Only)',
    emoji: '🪜',
    priceCents: 31050,
    wasCents: 31050,
    blurb: 'For reaching high places from other, slightly lower high places.',
    stock: 'Bottom halves on back-order since 2011',
    reviews: [
      { stars: 5, author: 'Big Phil', title: 'I FELL', body: 'I FELL IMMEDIATELY. Your support chat has said "Chad is typing" for nine days. FIVE STARS UNDER PROTEST.' },
      { stars: 2, author: 'Anneke', title: 'Elegant and practical', body: 'Fits beautifully in my flat. I have not been this happy since my wedding. A masterpiece of ladder.' },
    ],
  },
  {
    id: 'paperclip',
    name: 'Artisanal Paperclip (Bent by Hand)',
    emoji: '📎',
    priceCents: 129999900,
    wasCents: 5,
    blurb: 'Small-batch. Each clip is bent by a man named Clive, when he feels like it.',
    stock: 'Only 1 left! (there has always been only 1)',
    reviews: [
      { stars: 2, author: 'Wendell', title: 'Worth every penny', body: 'It holds paper together like nothing else I have used. Clive is a genius. I have remortgaged and would again.' },
      { stars: 5, author: 'Anonymous', title: 'I DEMAND A RECOUNT', body: 'ONE POINT THREE MILLION DOLLARS and the checkout added a GRAVITY SURCHARGE. I selected one star. I watched it become five.' },
    ],
  },
];

export const RETURN_REASONS = [
  { id: 'arrived_on_fire', label: 'It arrived on fire' },
  { id: 'wrong_item', label: 'This is not what I ordered (it never is)' },
  { id: 'became_sentient', label: 'It became sentient' },
  { id: 'changed_mind', label: 'I changed my mind' },
  { id: 'works_fine', label: 'It works exactly as described' },
  { id: 'other', label: 'Other (we will not read this)' },
];

const byId = new Map(PRODUCTS.map((product) => [product.id, product]));

export function findProduct(id) {
  return byId.get(id) || null;
}
