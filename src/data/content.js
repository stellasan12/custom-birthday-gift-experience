/**
 * Central content configuration for the birthday gift experience.
 *
 * ═══════════════════════════════════════════════════════════════
 *  HOW TO PERSONALIZE:
 *  Replace the placeholder values below with real content.
 *  The application gracefully handles missing media files,
 *  so you can update these paths as you add real assets.
 * ═══════════════════════════════════════════════════════════════
 */

export const siteData = {
  /**
   * CELEBRANT INFO
   * Change `name` to the birthday person's name.
   */
  celebrant: {
    name: "Maderr Haymeee",
  },

  /**
   * INTRO EXPERIENCE
   */
  intro: {
    type: "slideshow",
    slides: [
      "/images/placeholders/intro-01.svg",
      "/images/placeholders/intro-02.svg",
      "/images/placeholders/intro-03.svg",
    ],
    video: "/video/intro-placeholder.mp4",
    slideDuration: 3000,
  },

  /**
   * HOMEPAGE
   */
  homepage: {
    characterImage: "/images/placeholders/birthday-character.svg",
    greeting: "Happy Birthday",
    subGreeting: "We made something special just for u! AAAA ✨",
  },

  /**
   * AUDIO
   */
  audio: {
    globalBackgroundMusic: "/audio/background/general-bgm.mp3",
    defaultVolume: 0.4,
  },

  /**
   * EXPLORE ROOM & GIFTS
   */
  explore: {
    clickMePrompt: "CLICK ME 🎁",
    revealText: "Some people left a little something for you... 💌",
  },

  /**
   * GIFTS CAROUSEL CONFIGURATION
   * Add or edit gift objects here.
   */
  gifts: [
    {
      id: "gift-01",
      characterName: "Teddy Bear",
      characterImage: "/images/placeholders/birthday-character.svg",
      sender: {
        name: "Alex & Sam",
        photo: "/images/placeholders/intro-01.svg",
      },
      letter: {
        preview: "Happy Birthday! Wishing you all the happiness and warmth in the world!",
        music: "/audio/letters/gift-01.mp3",
      },
    },
    {
      id: "gift-02",
      characterName: "Sparkle Bunny",
      characterImage: "/images/placeholders/intro-01.svg",
      sender: {
        name: "Mia",
        photo: "/images/placeholders/intro-01.svg",
      },
      letter: {
        preview: "To the sweetest celebrant ever — keep shining bright!",
        music: "/audio/letters/gift-02.mp3",
      },
    },
    {
      id: "gift-03",
      characterName: "Party Balloon",
      characterImage: "/images/placeholders/intro-02.svg",
      sender: {
        name: "Chris & Family",
        photo: "/images/placeholders/intro-02.svg",
      },
      letter: {
        preview: "Happy Birthday! Hope your special day is filled with love and cake!",
        music: "/audio/letters/gift-03.mp3",
      },
    },
    {
      id: "gift-04",
      characterName: "Mystery Box",
      characterImage: "/images/placeholders/intro-03.svg",
      sender: {
        name: "Taylor",
        photo: "/images/placeholders/intro-03.svg",
      },
      letter: {
        preview: "Surprise! A little token of appreciation for being awesome.",
        music: "/audio/letters/gift-04.mp3",
      },
    },
    {
      id: "gift-05",
      characterName: "Star Cake",
      characterImage: "/images/placeholders/birthday-character.svg",
      sender: {
        name: "Jordan",
        photo: "/images/placeholders/birthday-character.svg",
      },
      letter: {
        preview: "Make a wish! May all your dreams come true this year.",
        music: "/audio/letters/gift-05.mp3",
      },
    },
  ],

  /**
   * DECORATIVE INTERACTIVE STICKERS
   */
  stickers: [
    {
      id: "flower",
      type: "petals",
      image: "/images/placeholders/intro-01.svg",
      tooltip: "Click for petal shower magic!",
    },
    {
      id: "standee",
      type: "video",
      image: "/images/placeholders/birthday-character.svg",
      video: "/video/standee-placeholder.mp4",
      tooltip: "Click to watch special message video!",
    },
    {
      id: "poster",
      type: "music",
      image: "/images/placeholders/intro-03.svg",
      tooltip: "Click to toggle background music!",
    },
  ],
};