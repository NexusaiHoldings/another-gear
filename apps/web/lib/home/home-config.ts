/**
 * home-config — the company's root surface (company-root-landing-001 +
 * homepage-composition-001). Written by provisioning (_step_substrate_install)
 * from the homepage composer / CTO home_mode + CMO positioning. Do NOT hand-edit.
 */
export interface HomeCta {
  label: string;
  href: string;
}

export interface HomeFeature {
  title: string;
  body: string;
}

export interface SectionImage {
  url?: string;
  alt?: string;
  caption?: string;
}

export interface HeroSection {
  type: "hero";
  eyebrow?: string;
  headline: string;
  subhead?: string;
  primaryCta?: HomeCta;
  secondaryCta?: HomeCta;
  image?: SectionImage;
}
export interface StatsSection {
  type: "stats";
  title?: string;
  stats: { value: string; label: string }[];
}
export interface HowItWorksSection {
  type: "how_it_works";
  title?: string;
  subhead?: string;
  steps: { title: string; body: string }[];
}
export interface FeatureGridSection {
  type: "feature_grid";
  title?: string;
  subhead?: string;
  features: HomeFeature[];
}
export interface FeatureSpotlightSection {
  type: "feature_spotlight";
  title?: string;
  items: { title: string; body: string; image?: SectionImage }[];
}
export interface SocialProofSection {
  type: "social_proof";
  title?: string;
  quotes: { quote: string; author?: string; role?: string }[];
}
export interface FaqSection {
  type: "faq";
  title?: string;
  items: { q: string; a: string }[];
}
export interface PricingTeaserSection {
  type: "pricing_teaser";
  title?: string;
  subhead?: string;
  tiers: {
    name: string;
    price?: string;
    period?: string;
    features: string[];
    cta?: HomeCta;
    highlighted?: boolean;
  }[];
}
export interface GallerySection {
  type: "gallery";
  title?: string;
  images: SectionImage[];
}
export interface CtaBandSection {
  type: "cta_band";
  headline: string;
  subhead?: string;
  cta?: HomeCta;
}

export type HomeSection =
  | HeroSection
  | StatsSection
  | HowItWorksSection
  | FeatureGridSection
  | FeatureSpotlightSection
  | SocialProofSection
  | FaqSection
  | PricingTeaserSection
  | GallerySection
  | CtaBandSection;

export interface HomeConfig {
  mode: "landing" | "conversation";
  sections?: HomeSection[];
  headline?: string;
  subhead?: string;
  primaryCta?: HomeCta;
  secondaryCta?: HomeCta;
  featuresTitle?: string;
  features?: HomeFeature[];
  closingHeadline?: string;
}

export const homeConfig: HomeConfig = {
  "mode": "landing",
  "headline": "Real people. Real grit. Wear the story.",
  "subhead": "Find Another Gear is a content-led motivational lifestyle apparel brand that sells premium tees, hoodies, and tanks anchored by a street-level video interview series documenting everyday people's real moments of perseverance \u2014 making the\u2026",
  "sections": [
    {
      "type": "hero",
      "headline": "Worn by people who refused to quit.",
      "eyebrow": "Find Another Gear\u2122",
      "subhead": "Every piece is tied to a real story \u2014 a real person, a real breaking point, a real comeback. This isn't gym wear. This is proof of work.",
      "primaryCta": {
        "label": "Shop the Collection",
        "href": "/shop"
      },
      "secondaryCta": {
        "label": "Watch the Stories",
        "href": "/stories"
      },
      "image": {
        "url": "hero_image"
      }
    },
    {
      "type": "social_proof",
      "quotes": [
        {
          "quote": "I didn't buy a hoodie. I bought a reminder that I've already survived worse than today.",
          "author": "First-gen college grad, laid off at 27",
          "role": "Chicago, IL"
        },
        {
          "quote": "I watched the video of dude talking about losing his job and rebuilding from scratch. Ordered the tee before it was even over.",
          "author": "Warehouse supervisor turned small business owner",
          "role": "Atlanta, GA"
        },
        {
          "quote": "Every brand says 'grind harder.' This one actually shows you what that looks like on someone's face.",
          "author": "Night-shift nurse, side-hustle founder",
          "role": "Houston, TX"
        }
      ],
      "title": "From the people wearing it."
    },
    {
      "type": "how_it_works",
      "steps": [
        {
          "title": "We hit the streets.",
          "body": "Handheld cameras, no scripts, no influencers. Our interview series finds everyday people \u2014 the ones rebuilding after a layoff, a loss, or a life that didn't go to plan."
        },
        {
          "title": "The story becomes the product.",
          "body": "Each drop is linked to a specific subject and their documented moment of perseverance. The product page is the story \u2014 short-form video, raw quotes, no gloss."
        },
        {
          "title": "You wear what it means.",
          "body": "Premium tees, hoodies, and tanks printed on demand. No warehouse, no waste. Ships direct to you \u2014 and a piece of that story ships with it."
        }
      ],
      "title": "The story comes first. The gear follows.",
      "subhead": "We find real people at real inflection points \u2014 then we build the product around their moment."
    },
    {
      "type": "feature_spotlight",
      "items": [
        {
          "title": "The product page IS the story.",
          "body": "Forget lifestyle photography and mood boards. Every item in the collection links to a real street interview \u2014 unscripted, unposed, shot on location. You're not buying a tee. You're buying into a documented moment of someone refusing to fold. Watch the video. Read the story. Then decide if you want to carry it with you.",
          "image": {
            "url": "https://runtime.nexusaiholdings.com/assets/cfa42468-49ee-4f5f-81d2-997361d7d801",
            "alt": "The product page IS the story."
          }
        },
        {
          "title": "Street-credible, not gym-credible.",
          "body": "Another Gear isn't about PRs or protein shakes. It's for the person who's had to find another gear in the actual grind \u2014 financial pressure, family weight, starting over with nothing. The aesthetic matches: near-black colorways, cold concrete tones, a single cadmium-yellow cut through the dark. Earned, not aspirational.",
          "image": {
            "url": "https://runtime.nexusaiholdings.com/assets/983fa8a9-ef42-4488-aa94-f4068f81f067",
            "alt": "Street-credible, not gym-credible."
          }
        },
        {
          "title": "Content is the acquisition engine.",
          "body": "The short-form interview series lives on TikTok and Instagram and drives every sale. No paid celebrity co-signs, no manufactured hype. When a video resonates, the product sells \u2014 because the story already did the work.",
          "image": {
            "url": "https://runtime.nexusaiholdings.com/assets/feeefdfb-8615-44f1-9ad9-d732c14b779f",
            "alt": "Content is the acquisition engine."
          }
        }
      ],
      "title": "What makes this different."
    },
    {
      "type": "feature_grid",
      "features": [
        {
          "title": "Premium tee",
          "body": "Heavyweight, structured, made to last. The kind of shirt you reach for on days that require something from you."
        },
        {
          "title": "Pullover hoodie",
          "body": "Built for the early morning and the late night \u2014 the hours nobody sees but you."
        },
        {
          "title": "Tank",
          "body": "Stripped down, no excess. For the people who do the work without needing it to look like anything."
        },
        {
          "title": "Print-on-demand, zero waste",
          "body": "Every order is made when you place it. No overstock, no clearance rack \u2014 just intentional production."
        },
        {
          "title": "Story-linked drops",
          "body": "Each SKU is tied to a specific interview subject. The story doesn't disappear at checkout \u2014 it's part of what you own."
        },
        {
          "title": "Direct to your door",
          "body": "No middlemen, no retail markup. Ordered online, shipped straight to you, priced for the people this is actually made for."
        }
      ],
      "title": "Built with intention. Worn with purpose."
    },
    {
      "type": "faq",
      "items": [
        {
          "q": "Is this just another motivational brand with quotes on shirts?",
          "a": "No. The difference is documentation. Every piece is connected to a real person's real story \u2014 captured on video, unscripted. The apparel is the artifact; the story is the point."
        },
        {
          "q": "Who are the people in the interview series?",
          "a": "Everyday people \u2014 not celebrities, not athletes, not influencers. People who've navigated job loss, financial hardship, personal setbacks, and kept moving. We find them in the streets, in diners, in parking lots."
        },
        {
          "q": "What's the quality like?",
          "a": "Premium heavyweight construction \u2014 not the thin, boxy blanks you get from fast fashion. These are built to be worn hard and last. We'd rather you buy one and mean it than three you forget about."
        },
        {
          "q": "How does print-on-demand affect my order?",
          "a": "Your order is made specifically for you when you place it. That means slightly longer fulfillment than a warehouse ship \u2014 typically 5\u201310 business days \u2014 but zero waste and no corner-cutting on materials."
        },
        {
          "q": "Where do I watch the interview series?",
          "a": "On TikTok and Instagram @FindAnotherGear, and linked directly from each product page. Start with the product, or start with the story \u2014 either way, you'll end up at both."
        }
      ],
      "title": "Real questions."
    },
    {
      "type": "cta_band",
      "headline": "You already know what it took to get here.",
      "subhead": "Wear something that knows it too. Shop the collection \u2014 or watch a story and let it find you."
    }
  ]
};
