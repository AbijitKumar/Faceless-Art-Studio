export interface TemplateConfig {
  id: string;
  name: string;
  category: string;
  badge?: "TRENDING" | "NEW" | "POPULAR" | "FEATURED";
  description: string;
  duration: string;
  aspectRatio: "9:16" | "16:9" | "1:1";
  tags: string[];
  sampleScript: string;
  captionPreset: "bold" | "neon" | "creator" | "classic" | "minimal" | "karaoke";
  captionPosition: "bottom" | "center" | "top";
  captionSizeScale: number; // 50 to 200
  fontName: string;
  maxWordsPerCaption: number;
  recommendedVoice: string;
  previewTheme: {
    bgGradient: string;
    accentColor: string;
    previewHeadline: string;
    previewSub: string;
    previewCaptionActive: string;
    previewCaptionRemaining: string;
    previewTag: string;
    visualElement?: "discipline" | "facts" | "reddit" | "tech" | "finance" | "quote" | "news" | "gaming" | "story" | "karaoke";
  };
}

export const TEMPLATE_CATEGORIES = [
  "All",
  "Trending",
  "Storytelling",
  "Motivation",
  "Facts",
  "Reddit",
  "News",
  "Tech",
  "Finance",
  "Gaming",
  "Quotes",
  "Educational",
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export const TEMPLATES_DATA: TemplateConfig[] = [
  {
    id: "viral-story",
    name: "Viral Story",
    category: "Storytelling",
    badge: "FEATURED",
    description: "Fast-paced captions, cinematic pacing and high-impact visual transitions designed for short-form storytelling.",
    duration: "30–60s",
    aspectRatio: "9:16",
    tags: ["Viral", "Cinematic", "Story", "Hook"],
    sampleScript: "Nobody believed what happened that night. Within 24 hours, everything changed forever.",
    captionPreset: "bold",
    captionPosition: "bottom",
    captionSizeScale: 110,
    fontName: "Manrope",
    maxWordsPerCaption: 3,
    recommendedVoice: "en-US-GuyNeural",
    previewTheme: {
      bgGradient: "linear-gradient(180deg, #181c24 0%, #0d0f14 100%)",
      accentColor: "#FFDC28",
      previewHeadline: "WHAT NO ONE TOLD YOU",
      previewSub: "Chapter 1: The Incident",
      previewCaptionActive: "EVERYTHING CHANGED",
      previewCaptionRemaining: "in 24 hours.",
      previewTag: "STORYTELLING",
      visualElement: "story",
    },
  },
  {
    id: "dark-motivation",
    name: "Dark Motivation",
    category: "Motivation",
    badge: "TRENDING",
    description: "Deep, stoic typography with minimalist dark aesthetics for high-retention motivational reels.",
    duration: "20–45s",
    aspectRatio: "9:16",
    tags: ["Stoic", "Mindset", "Dark", "Discipline"],
    sampleScript: "Discipline will take you places where motivation can never reach. Stay focused in the dark.",
    captionPreset: "minimal",
    captionPosition: "center",
    captionSizeScale: 125,
    fontName: "Manrope",
    maxWordsPerCaption: 2,
    recommendedVoice: "en-US-ChristopherNeural",
    previewTheme: {
      bgGradient: "radial-gradient(circle at 50% 40%, #1e2430 0%, #0a0c10 100%)",
      accentColor: "#E0E0E0",
      previewHeadline: "DISCIPLINE",
      previewSub: "BEATS MOTIVATION",
      previewCaptionActive: "STAY FOCUSED",
      previewCaptionRemaining: "in the dark.",
      previewTag: "MINDSET",
      visualElement: "discipline",
    },
  },
  {
    id: "60s-facts",
    name: "60 Second Facts",
    category: "Facts",
    badge: "POPULAR",
    description: "Attention-grabbing hook layout with bold, high-contrast captions for trivia and educational shorts.",
    duration: "30–60s",
    aspectRatio: "9:16",
    tags: ["Trivia", "DidYouKnow", "FastFacts", "Viral"],
    sampleScript: "Did you know that honey never spoils? Archaeologists have found 3,000-year-old honey in Egyptian tombs that is still perfectly edible.",
    captionPreset: "bold",
    captionPosition: "bottom",
    captionSizeScale: 115,
    fontName: "Manrope",
    maxWordsPerCaption: 3,
    recommendedVoice: "en-US-AriaNeural",
    previewTheme: {
      bgGradient: "linear-gradient(135deg, #131722 0%, #0d0f14 100%)",
      accentColor: "#FFDC28",
      previewHeadline: "DID YOU KNOW?",
      previewSub: "3,000 Year Old Secret",
      previewCaptionActive: "HONEY NEVER",
      previewCaptionRemaining: "spoils ever.",
      previewTag: "FACTS",
      visualElement: "facts",
    },
  },
  {
    id: "reddit-confessions",
    name: "Reddit Confessions",
    category: "Reddit",
    badge: "TRENDING",
    description: "Reddit thread layout with immersive text-to-speech timing, tailored for relationship and mystery stories.",
    duration: "45–90s",
    aspectRatio: "9:16",
    tags: ["Reddit", "AskReddit", "Confession", "Thread"],
    sampleScript: "My boss accidentally replied to everyone with a secret document. What happened next ruined his career.",
    captionPreset: "classic",
    captionPosition: "bottom",
    captionSizeScale: 95,
    fontName: "Inter",
    maxWordsPerCaption: 4,
    recommendedVoice: "en-US-EricNeural",
    previewTheme: {
      bgGradient: "linear-gradient(180deg, #161b24 0%, #0e1117 100%)",
      accentColor: "#FF4500",
      previewHeadline: "r/Confessions • 4h ago",
      previewSub: "u/mystery_user (14.2k upvotes)",
      previewCaptionActive: "MY BOSS REPLIED",
      previewCaptionRemaining: "to everyone.",
      previewTag: "REDDIT STORY",
      visualElement: "reddit",
    },
  },
  {
    id: "tech-explained",
    name: "Tech Explained",
    category: "Tech",
    badge: "NEW",
    description: "Sleek cyber aesthetic with vibrant neon highlights for AI, code, and future tech breakdowns.",
    duration: "30–50s",
    aspectRatio: "9:16",
    tags: ["AI", "Tech", "Coding", "Cyber"],
    sampleScript: "How neural networks actually process information in less than 30 seconds. It works like human synapses.",
    captionPreset: "neon",
    captionPosition: "bottom",
    captionSizeScale: 105,
    fontName: "Inter",
    maxWordsPerCaption: 3,
    recommendedVoice: "en-US-JennyNeural",
    previewTheme: {
      bgGradient: "linear-gradient(135deg, #0f1c2e 0%, #080d15 100%)",
      accentColor: "#00F0FF",
      previewHeadline: "HOW AI THINKS",
      previewSub: "Neural Networks in 30s",
      previewCaptionActive: "SYNAPSE FIRING",
      previewCaptionRemaining: "in milliseconds.",
      previewTag: "TECH EXPLAINED",
      visualElement: "tech",
    },
  },
  {
    id: "money-minute",
    name: "Money Minute",
    category: "Finance",
    badge: "POPULAR",
    description: "High-credibility finance format with clear numerical emphasis for investing and business insights.",
    duration: "40–60s",
    aspectRatio: "9:16",
    tags: ["Finance", "Investing", "Business", "Wealth"],
    sampleScript: "The compound interest rule that banks don't teach you in school. If you invest 5 dollars a day, here is what happens.",
    captionPreset: "creator",
    captionPosition: "bottom",
    captionSizeScale: 110,
    fontName: "Manrope",
    maxWordsPerCaption: 3,
    recommendedVoice: "en-US-GuyNeural",
    previewTheme: {
      bgGradient: "linear-gradient(180deg, #101c18 0%, #0a100d 100%)",
      accentColor: "#00E676",
      previewHeadline: "$10,000 → $1,000,000",
      previewSub: "The Compound Formula",
      previewCaptionActive: "INVEST $5 DAILY",
      previewCaptionRemaining: "and watch it grow.",
      previewTag: "FINANCE",
      visualElement: "finance",
    },
  },
  {
    id: "breaking-brief",
    name: "Breaking Brief",
    category: "News",
    badge: "NEW",
    description: "Urgent top-positioned broadcast style for world updates, market shifts, and trending news flashes.",
    duration: "20–40s",
    aspectRatio: "9:16",
    tags: ["News", "Urgent", "Headlines", "Market"],
    sampleScript: "Breaking announcement today regarding global markets. Here are the three key points you need to know.",
    captionPreset: "bold",
    captionPosition: "top",
    captionSizeScale: 115,
    fontName: "Manrope",
    maxWordsPerCaption: 3,
    recommendedVoice: "en-US-AriaNeural",
    previewTheme: {
      bgGradient: "linear-gradient(180deg, #241416 0%, #0d0a0b 100%)",
      accentColor: "#FF334B",
      previewHeadline: "BREAKING UPDATE",
      previewSub: "Markets Move Overnight",
      previewCaptionActive: "THREE KEY POINTS",
      previewCaptionRemaining: "you must know.",
      previewTag: "NEWS FLASH",
      visualElement: "news",
    },
  },
  {
    id: "quote-motion",
    name: "Quote Motion",
    category: "Quotes",
    badge: "TRENDING",
    description: "Clean centered typography with elegant spacing for timeless wisdom and poetic thoughts.",
    duration: "15–30s",
    aspectRatio: "9:16",
    tags: ["Wisdom", "Quotes", "Philosophy", "Shorts"],
    sampleScript: "We suffer more often in imagination than in reality. — Seneca",
    captionPreset: "classic",
    captionPosition: "center",
    captionSizeScale: 130,
    fontName: "Manrope",
    maxWordsPerCaption: 2,
    recommendedVoice: "en-US-ChristopherNeural",
    previewTheme: {
      bgGradient: "radial-gradient(circle at 50% 50%, #1c1c28 0%, #0b0b10 100%)",
      accentColor: "#8E5FF0",
      previewHeadline: "“SENECA”",
      previewSub: "Letters From a Stoic",
      previewCaptionActive: "IN IMAGINATION",
      previewCaptionRemaining: "more than reality.",
      previewTag: "WISDOM",
      visualElement: "quote",
    },
  },
  {
    id: "gaming-lore",
    name: "Gaming Lore",
    category: "Gaming",
    badge: "POPULAR",
    description: "Energetic dynamic captions with glowing cyber accents for boss lore and gaming Easter eggs.",
    duration: "30–60s",
    aspectRatio: "9:16",
    tags: ["Gaming", "EasterEggs", "Lore", "Clips"],
    sampleScript: "The secret boss that 99 percent of players completely missed in the original release.",
    captionPreset: "neon",
    captionPosition: "bottom",
    captionSizeScale: 110,
    fontName: "Inter",
    maxWordsPerCaption: 3,
    recommendedVoice: "en-US-GuyNeural",
    previewTheme: {
      bgGradient: "linear-gradient(135deg, #1a0f2e 0%, #0b0714 100%)",
      accentColor: "#B026FF",
      previewHeadline: "SECRET BOSS LORE",
      previewSub: "Hidden For 10 Years",
      previewCaptionActive: "99% MISSED THIS",
      previewCaptionRemaining: "hidden entrance.",
      previewTag: "GAMING",
      visualElement: "gaming",
    },
  },
  {
    id: "learn-in-30",
    name: "Learn in 30",
    category: "Educational",
    badge: "NEW",
    description: "Structured step-by-step educational template with clear pacing and prominent key takeaway blocks.",
    duration: "30–45s",
    aspectRatio: "9:16",
    tags: ["Education", "Tutorial", "Science", "Tips"],
    sampleScript: "Why the sky is blue explained in 30 seconds. It all comes down to Rayleigh scattering.",
    captionPreset: "creator",
    captionPosition: "bottom",
    captionSizeScale: 100,
    fontName: "Manrope",
    maxWordsPerCaption: 4,
    recommendedVoice: "en-US-JennyNeural",
    previewTheme: {
      bgGradient: "linear-gradient(180deg, #10192e 0%, #080d18 100%)",
      accentColor: "#1E8CFA",
      previewHeadline: "RAYLEIGH SCATTERING",
      previewSub: "Quick Science Lesson #4",
      previewCaptionActive: "WHY SKY IS BLUE",
      previewCaptionRemaining: "in 30 seconds.",
      previewTag: "EDUCATION",
      visualElement: "facts",
    },
  },
  {
    id: "cinematic-story",
    name: "Cinematic Story",
    category: "Storytelling",
    badge: "FEATURED",
    description: "Film-like pacing with subtle center captions that leave maximum room for striking background visuals.",
    duration: "45–90s",
    aspectRatio: "9:16",
    tags: ["Cinematic", "Epic", "History", "Atmosphere"],
    sampleScript: "In 1969, three men embarked on the most perilous journey in human history.",
    captionPreset: "minimal",
    captionPosition: "center",
    captionSizeScale: 110,
    fontName: "Manrope",
    maxWordsPerCaption: 3,
    recommendedVoice: "en-US-ChristopherNeural",
    previewTheme: {
      bgGradient: "radial-gradient(circle at 50% 30%, #1f2738 0%, #0a0d14 100%)",
      accentColor: "#5FB3FF",
      previewHeadline: "APOLLO 11 • 1969",
      previewSub: "The Dark Side of Space",
      previewCaptionActive: "THREE MEN EMBARKED",
      previewCaptionRemaining: "into the unknown.",
      previewTag: "CINEMATIC",
      visualElement: "story",
    },
  },
  {
    id: "rapid-fire-facts",
    name: "Rapid Fire Facts",
    category: "Facts",
    badge: "TRENDING",
    description: "Ultra punchy 2-word caption pacing designed for high-energy fast trivia and listicles.",
    duration: "20–35s",
    aspectRatio: "9:16",
    tags: ["Rapid", "FastPaced", "Listicle", "Facts"],
    sampleScript: "Three unbelievable facts about deep oceans that will keep you awake tonight.",
    captionPreset: "bold",
    captionPosition: "bottom",
    captionSizeScale: 120,
    fontName: "Manrope",
    maxWordsPerCaption: 2,
    recommendedVoice: "en-US-AriaNeural",
    previewTheme: {
      bgGradient: "linear-gradient(135deg, #1c1822 0%, #0d0b10 100%)",
      accentColor: "#FFD700",
      previewHeadline: "OCEAN SECRETS",
      previewSub: "3 Deep Sea Truths",
      previewCaptionActive: "DEEP OCEANS",
      previewCaptionRemaining: "are mysterious.",
      previewTag: "RAPID FACTS",
      visualElement: "facts",
    },
  },
];

const FAVORITES_STORAGE_KEY = "faceless_template_favorites";

export function getFavoriteTemplateIds(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleFavoriteTemplateId(id: string): string[] {
  try {
    const current = getFavoriteTemplateIds();
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}
