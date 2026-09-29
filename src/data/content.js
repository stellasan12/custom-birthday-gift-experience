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
        title: "For you, on your birthday 💌",
        preview: "Happy Birthday! Wishing you all the happiness and warmth in the world!",
        content: [
          { id: "p1", text: "Happy birthday! I hope today reminds you just how loved, appreciated, and wonderfully unforgettable you are." },
          { id: "p2", text: "Thank you for turning ordinary days into stories worth keeping. Even the smallest moments become brighter when you are there." },
          { id: "p3", text: "May this next year bring you gentle mornings, brave adventures, and more reasons to laugh until your cheeks hurt." },
        ],
        signoff: "With all our love,\nAlex & Sam",
        music: "/audio/background/general-bgm.mp3",
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
        title: "A little note for you ✨",
        preview: "To the sweetest celebrant ever — keep shining bright!",
        content: [
          { id: "p1", text: "To the sweetest celebrant ever: happy birthday! You have a way of making people feel welcome without even trying." },
          { id: "p2", text: "I still smile at all the ridiculous conversations and tiny adventures that somehow became my favorite memories." },
          { id: "p3", text: "Keep shining in exactly your own way. I hope the coming year is soft with you and full of beautiful surprises." },
        ],
        signoff: "Always cheering for you,\nMia",
        music: null,
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
        title: "Birthday wishes for you 🎂",
        preview: "Happy Birthday! Hope your special day is filled with love and cake!",
        content: [
          { id: "p1", text: "Happy birthday! Today is your official excuse to eat the biggest slice of cake and make the most ambitious wish." },
          { id: "p2", text: "We are grateful for your kindness, your humor, and the warmth you bring whenever everyone gets together." },
          { id: "p3", text: "Here is to a year of good health, new memories, and plenty of reasons for all of us to celebrate together again." },
        ],
        signoff: "Lots of love,\nChris & Family",
        music: "/audio/background/general-bgm.mp3",
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
        title: "One birthday surprise 🌷",
        preview: "Surprise! A little token of appreciation for being awesome.",
        content: [
          { id: "p1", text: "Surprise! I wanted to leave you a small reminder that being yourself has made more of a difference than you probably realize." },
          { id: "p2", text: "You have grown through so much and still choose to be thoughtful, funny, and generous. That deserves to be celebrated." },
          { id: "p3", text: "I hope you carry that same courage into every new thing waiting for you this year." },
        ],
        signoff: "Proud of you,\nTaylor",
        music: null,
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
        title: "Make a wish ⭐",
        preview: "Make a wish! May all your dreams come true this year.",
        content: [
          { id: "p1", text: "Make a wish, birthday star. I hope this year gives you the confidence to ask for the things that truly make you happy." },
          { id: "p2", text: "May you find good people in unexpected places, music for every mood, and calm whenever life becomes noisy." },
          { id: "p3", text: "Whatever comes next, remember that there are people rooting for you every step of the way." },
        ],
        signoff: "Happy birthday,\nJordan",
        music: null,
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
