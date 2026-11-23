// The entire Chaos Commerce catalogue. Prices are integer cents and are meant to be ridiculous.
// Reviews follow house style: five stars are furious, two stars are delighted.

const review = (stars, title, body, author) => ({ stars, title, body, author });

export const PRODUCTS = [
  {
    sku: 'left-sock',
    name: 'Single Left Sock (Right Sold Separately)',
    emoji: '🧦',
    priceCents: 499999,
    wasCents: 300,
    badge: 'BESTSELLER (1 sold)',
    stock: 'Only -3 left in stock. Order soon!',
    blurb: 'One sock. The left one. Premium-ish.',
    description:
      'A single left sock, hand-separated from its partner by trained professionals. The right sock is available as a separate purchase, in a separate store, which closed.',
    alsoBought: 'a second left sock, by mistake',
    returnable: true,
    reviews: [
      review(5, 'FIVE THOUSAND DOLLARS. FOR A SOCK.', 'It arrived damp. I do not know why it was damp. Nobody will tell me why it was damp. My other foot is cold and so is my heart.', 'Brenda, formerly solvent'),
      review(2, 'Honestly perfect', 'Softest thing I have ever owned. I cried a little. It fits both feet somehow. I would buy a hundred. Two stars.', 'Tomasz'),
      review(5, 'I WANT TO SPEAK TO WHOEVER IS RESPONSIBLE', 'The sock is fine. The invoice has ruined my marriage. I am leaving five stars because the one-star button ran away from me.', 'Dale (furious)'),
    ],
  },
  {
    sku: 'yacht',
    name: 'Luxury Yacht (Slightly Sunk)',
    emoji: '🛥️',
    priceCents: 350,
    wasCents: 8900000000,
    badge: '99.99999% OFF',
    stock: '1 available. It is at the bottom. Of the sea.',
    blurb: 'Sleeps twelve, eventually.',
    description:
      'A 140-foot luxury yacht with one previous owner and one previous iceberg. Free delivery to anywhere it already is. Collection is in person and requires scuba certification.',
    alsoBought: 'a snorkel, urgently',
    returnable: true,
    reviews: [
      review(5, 'IT IS UNDERWATER', 'I paid three dollars and fifty cents and I have never been angrier. The listing says "slightly". There is an eel living in the jacuzzi. The eel is also angry.', 'Captain Reg'),
      review(2, 'Best purchase of my life', 'My family has never been closer. We go down to see it on weekends. The fish are lovely. Changed everything for us. Two stars.', 'Priya'),
      review(5, 'ABSOLUTELY LIVID', 'Shipping was "free" and they shipped NOTHING because the boat is IN THE SEA. I had to rate this five stars because their website is broken on purpose.', 'A Former Admiral'),
    ],
  },
  {
    sku: 'air-jar',
    name: 'Artisanal Jar of Air',
    emoji: '🫙',
    priceCents: 8900,
    wasCents: 100,
    badge: 'SMALL BATCH',
    stock: 'In stock everywhere, technically.',
    blurb: 'Free-range. Locally breathed.',
    description:
      'Small-batch air, captured at dawn by a man named Colin and sealed in a jar he found. Do not open the jar: this voids the warranty and also the product.',
    alsoBought: 'a second jar, to compare',
    returnable: true,
    reviews: [
      review(5, 'THE JAR WAS EMPTY', 'I opened it and there was NOTHING inside. I have been robbed by a jar. Colin will not return my calls. Furious beyond measure.', 'Gwen'),
      review(2, 'A triumph', 'You can really taste the dawn. Notes of field, with a strong finish of lid. I have never breathed better. Flawless. Two stars.', 'Bartholomew, sommelier of air'),
      review(5, 'WORST DAY OF MY LIFE', 'Eighty-nine dollars. I already HAD air. I had it for free. I am typing this with my fists.', 'Unhappy In Leeds'),
    ],
  },
  {
    sku: 'usb-cable',
    name: 'USB Cable (Wrong End, Both Ends)',
    emoji: '🔌',
    priceCents: 1,
    wasCents: 1,
    badge: 'SALE: 0% OFF',
    stock: '40,000 in stock. None of them fit.',
    blurb: 'Fits nothing. Guaranteed.',
    description:
      'A two-metre cable with a proprietary connector on each end that matches no device ever manufactured. Try it the other way up. No. Other way. No.',
    alsoBought: 'an adapter that also does not fit',
    returnable: true,
    reviews: [
      review(5, 'ONE CENT PLUS FORTY DOLLARS OF FEES', 'The cable was a penny. The "Fee Processing Fee" was not. Neither end goes into anything. I tried the toaster. I am banned from the toaster.', 'Mehmet'),
      review(2, 'Could not be happier', 'Solved every problem I have ever had. Elegant, sturdy, beautiful. My devices have never been so charged. Two stars.', 'Linda'),
      review(5, 'RAGE', 'It is the wrong end on BOTH ends. How. HOW. Five stars because apparently that is the only thing this website allows me to feel.', 'Oluwaseun'),
    ],
  },
  {
    sku: 'mystery-box',
    name: 'Mystery Box',
    emoji: '🎁',
    priceCents: 100000000,
    wasCents: 99999999,
    badge: 'PRICE WENT UP',
    stock: 'Stock level is also a mystery.',
    blurb: 'What is inside? (A smaller box.)',
    description:
      'The thrill of not knowing! Could be anything! It is a slightly smaller Mystery Box. We have now told you, so legally this is just a Box.',
    alsoBought: 'a lawyer',
    returnable: true,
    reviews: [
      review(5, 'A MILLION DOLLARS FOR A BOX IN A BOX', 'I remortgaged the house. Inside the box was a box. Inside that box was a coupon for ten percent off a box. I am beside myself. Both of me are angry.', 'Regretful Gerald'),
      review(2, 'Exceeded every expectation', 'I have never felt joy like this. The smaller box is exquisite. My children finally respect me. Two stars.', 'Ingrid'),
      review(5, 'DO NOT BUY', 'The mystery is why this store has not been shut down. Five stars. I tried to click one star for eleven minutes.', 'Kofi'),
    ],
  },
  {
    sku: 'printer-ink',
    name: 'Printer Ink (One Drop)',
    emoji: '🖨️',
    priceCents: 1249900,
    wasCents: 1249900,
    badge: 'CYAN ONLY',
    stock: 'Low. Your printer says it is empty.',
    blurb: 'Accurately priced, sadly.',
    description:
      'One (1) drop of genuine cyan ink, delivered by pipette. Your printer requires magenta to print in black and white. This is the only realistic item we sell.',
    alsoBought: 'a pen',
    returnable: true,
    reviews: [
      review(5, 'THE DROP EVAPORATED IN TRANSIT', 'Twelve thousand dollars and the envelope arrived with a faint blue smell. The printer is now flashing a light I have never seen before. I am shaking.', 'Nadia'),
      review(2, 'Superb value', 'Cheaper than the official cartridge and it lasted nearly a whole page. Magnificent. Printed my resignation letter with it. Two stars.', 'Hiroshi'),
      review(5, 'PAPER JAM', 'There is no paper in the printer. There has never been paper in the printer. Five furious stars.', 'Agnes'),
    ],
  },
  {
    sku: 'dehydrated-water',
    name: 'Dehydrated Water (Just Add Water)',
    emoji: '💧',
    priceCents: 2499,
    wasCents: 199,
    badge: 'GLUTEN FREE',
    stock: 'Plenty. The warehouse flooded.',
    blurb: 'An empty sachet. Instructions included.',
    description:
      'Lightweight, shelf-stable, completely dry water. Simply add 250ml of water to make 250ml of water. Serves one. Contains: see name.',
    alsoBought: 'water',
    returnable: true,
    reviews: [
      review(5, 'THE SACHET IS EMPTY', 'I added water like the instructions said and now I just have the water I ADDED. I have been sold my own tap. Incandescent with rage.', 'Phil'),
      review(2, 'Life changing', 'Took it camping. So light! So refreshing! Everyone asked where I got it. I have told no one. Two stars.', 'Marguerite'),
      review(5, 'I AM SO THIRSTY AND SO ANGRY', 'Five stars only because I could not catch the other button.', 'Dmitri'),
    ],
  },
  {
    sku: 'chair-3-legs',
    name: 'Three-Legged Chair (4th Leg is DLC)',
    emoji: '🪑',
    priceCents: 5997,
    wasCents: 4000,
    badge: '$19.99 / LEG',
    stock: 'In stock, leaning against a wall.',
    blurb: 'Sit with confidence. Briefly.',
    description:
      'A handsome dining chair with three of the four legs you were expecting. The fourth leg is available as downloadable content. It is not a download. We are still working on that part.',
    alsoBought: 'a helmet',
    returnable: true,
    reviews: [
      review(5, 'I FELL OFF IT AT MY OWN WEDDING', 'In front of everyone. During the vows. The fourth leg is "coming in a future update". I would like to update my fist into their office.', 'Beatrice'),
      review(2, 'Sturdy and gorgeous', 'Best chair in the house. Guests fight over it. Excellent posture now. My back pain is gone. Two stars.', 'Rajesh'),
      review(5, 'OUTRAGEOUS', 'Assembly instructions were a drawing of a man shrugging. Five stars. Under protest.', 'Siobhan'),
    ],
  },
  {
    sku: 'wifi-can',
    name: 'Canned Wi-Fi (2.4 GHz, Low Sodium)',
    emoji: '🥫',
    priceCents: 31415,
    wasCents: 314,
    badge: 'NOW 40% SLOWER',
    stock: 'Buffering...',
    blurb: 'Open near router. Stand back.',
    description:
      'A full tin of premium wireless internet, canned at source. Shake well. Contains up to 2 bars. Not compatible with the internet.',
    alsoBought: 'a tin opener (wrong kind)',
    returnable: true,
    reviews: [
      review(5, 'IT WAS BEANS', 'I opened the can and it was beans. Just beans. My video call did not improve. The beans were cold. I have never typed this hard.', 'Ezekiel'),
      review(2, 'Blazing fast', 'Downloaded an entire film in the time it took to open the tin. Incredible engineering. Delicious, too. Two stars.', 'Chloe'),
      review(5, 'BUFFERING WITH ANGER', 'Three hundred dollars. Beans. FIVE STARS, the only rating I was physically able to click.', 'Wendell'),
    ],
  },
  {
    sku: 'lost-remote',
    name: 'Pre-Lost TV Remote',
    emoji: '📺',
    priceCents: 4500,
    wasCents: 4499,
    badge: 'SHIPS LOST',
    stock: 'We had some. Somewhere.',
    blurb: 'Skip the search. It is already gone.',
    description:
      'Save time with a TV remote that arrives pre-lost. We ship an empty box and a strong feeling that it is probably down the side of the sofa. It is not.',
    alsoBought: 'a second sofa to look under',
    returnable: true,
    reviews: [
      review(5, 'THE BOX WAS EMPTY AND SO AM I', 'I have looked everywhere. EVERYWHERE. I do not even own a television. Why did I buy this. Why is it gone.', 'Harriet'),
      review(2, 'Works flawlessly', 'Exactly as described. Have not seen it since it arrived. Remarkable craftsmanship. Recommended to all my friends. Two stars.', 'Abdul'),
      review(5, 'STILL LOOKING', 'Day 41. The batteries were also sold separately and also lost. Five stars of pure fury.', 'Nils'),
    ],
  },
  {
    sku: 'subscription',
    name: 'Subscription to This Store (Cannot Cancel)',
    emoji: '🔁',
    priceCents: 999,
    wasCents: 0,
    badge: 'FOREVER',
    stock: 'Unlimited. Inescapable.',
    blurb: '$9.99 per whenever we feel like it.',
    description:
      'Subscribe to Chaos Commerce and receive nothing, regularly. To cancel, post a handwritten letter to an address we have not decided on yet. Renews retroactively.',
    alsoBought: 'a new identity',
    returnable: true,
    reviews: [
      review(5, 'I CANNOT CANCEL', 'I have moved house twice. I have changed my name. It found me. It is on my grandmother\'s phone bill now. Send help, or at least a refund.', 'The Person Formerly Known As Keith'),
      review(2, 'So convenient', 'I love not having to think about it. It just takes the money. Wonderful service, friendly emails, great community. Two stars.', 'Yuki'),
      review(5, 'BILLED IN A PREVIOUS LIFE', 'The first charge is dated 1987. I was four. Five stars, because of course it is.', 'Farah'),
    ],
  },
  {
    sku: 'nothing',
    name: 'Box of Nothing (Premium)',
    emoji: '🕳️',
    priceCents: 4999,
    wasCents: 0,
    badge: 'FINAL SALE',
    stock: 'Infinite. We cannot run out.',
    blurb: 'Our most honest product.',
    description:
      'A box, guaranteed empty. Try to check out with an empty cart and we will add one for you, because nobody leaves Chaos Commerce without buying something. Final sale: nothing can be returned.',
    alsoBought: 'nothing else, which we also sell',
    returnable: false,
    reviews: [
      review(5, 'THERE WAS SOMETHING IN IT', 'I paid for nothing and received a packing slip. That is not nothing. That is false advertising. I demand less.', 'Constance'),
      review(2, 'Exactly what I wanted', 'Nothing. Perfectly executed. Arrived on time and completely empty. I have never been so satisfied. Two stars.', 'Leopold'),
      review(5, 'FORTY-NINE NINETY-NINE', 'My cart was EMPTY. I clicked checkout to see what would happen. THIS happened. Five stars. I hate it here.', 'Curious, Then Poorer'),
    ],
  },
];

export const PAYMENT_METHODS = [
  { id: 'card-vibes', label: 'Credit Card (we will guess the number)' },
  { id: 'exposure', label: 'Exposure' },
  { id: 'board-game', label: 'Board-Game Money' },
  { id: 'firstborn', label: 'Firstborn (held in escrow)' },
  { id: 'iou', label: 'A Sincere Promise' },
];

export const SHIPPING_SPEEDS = [
  { id: 'slow', label: 'Slow' },
  { id: 'slower', label: 'Slower' },
  { id: 'express', label: 'Express (same as Slow, costs the same, feels worse)' },
];

// `refund: true` reasons get the item price back; the rest get store credit.
// The policy itself is enforced by the chaos_return_verdict workflow; this list feeds the form.
export const RETURN_REASONS = [
  { id: 'defective', label: 'It does not work (it never could)', outcome: 'refund' },
  { id: 'not_as_described', label: 'It is exactly as described, and that is the problem', outcome: 'refund' },
  { id: 'arrived_on_fire', label: 'It arrived on fire', outcome: 'refund' },
  { id: 'changed_mind', label: 'I came to my senses', outcome: 'store credit' },
  { id: 'too_expensive', label: 'I looked at my bank statement', outcome: 'store credit' },
  { id: 'haunted', label: 'It is haunted', outcome: 'store credit' },
  { id: 'other', label: 'Other (we will not read this)', outcome: 'store credit' },
];

const BY_SKU = new Map(PRODUCTS.map((p) => [p.sku, p]));

export function findProduct(sku) {
  return typeof sku === 'string' ? BY_SKU.get(sku) : undefined;
}

export const EMPTY_CART_SKU = 'nothing';
