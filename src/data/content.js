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
      characterImage: "/images/stickers/holding-letter-1.png",
      sender: {
        name: "Alex & Sam",
        photo: "/images/stickers/holding-letter-1.png",
      },
      letter: {
        preview: "Happy Birthday! Wishing you all the happiness and warmth in the world!",
        music: "/audio/letters/gift-01.mp3",
      },
    },
    {
      id: "gift-02",
      characterName: "Sparkle Bunny",
      characterImage: "/images/stickers/holding-letter-2.png",
      sender: {
        name: "Mia",
        photo: "/images/stickers/holding-letter-2.png",
      },
      letter: {
        preview: "To the sweetest celebrant ever — keep shining bright!",
        music: "/audio/letters/gift-02.mp3",
      },
    },
    {
      id: "gift-03",
      characterName: "Party Balloon",
      characterImage: "/images/stickers/holding-gift.png",
      sender: {
        name: "Chris & Family",
        photo: "/images/stickers/holding-gift.png",
      },
      letter: {
        preview: "Happy Birthday! Hope your special day is filled with love and cake!",
        music: "/audio/letters/gift-03.mp3",
      },
    },
    {
      id: "gift-04",
      characterName: "Mystery Box",
      characterImage: "/images/stickers/holding-letter-1.png",
      sender: {
        name: "Taylor",
        photo: "/images/stickers/holding-letter-1.png",
      },
      letter: {
        preview: "Surprise! A little token of appreciation for being awesome.",
        music: "/audio/letters/gift-04.mp3",
      },
    },
    {
      id: "gift-05",
      characterName: "Star Cake",
      characterImage: "/images/stickers/holding-letter-2.png",
      sender: {
        name: "Jordan",
        photo: "/images/stickers/holding-letter-2.png",
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
      label: "Flower",
      image: "/images/stickers/flower-on-the-floor.png",
      //tooltip: "Click for petal shower magic!",
    },
    {
      id: "standee",
      type: "video",
      label: "Seventeen Mingyu",
      image: "/images/stickers/standee.png",
      video: "/video/standee-placeholder.mp4",
      //tooltip: "Click to watch special message video!",
    },
    {
      id: "poster",
      type: "music",
      label: "Demon Slayer",
      image: "/images/stickers/poster.png",
      //tooltip: "Click to toggle background music!",
    },
    {
      id: "custom-object",
      type: "custom",
      label: "Ezer",
      image: "/images/stickers/holding-letter-1.png",
      //tooltip: "Click to change or add object!",
    },
  ],
};