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
    defaultVolume: 0.3,
  },

  /** MEMORY GALLERY — both Gallery and Social views render this same data. */
  gallery: {
    title: "Our Memories",
    albums: [
      {
        id: "album-us",
        title: "Us Being Us",
        description: "A collection of questionable decisions ♡",
        coverImage: "/images/gallery/album-01/cover.svg",
        photos: [
          { id: "us-001", src: "/images/gallery/album-01/photo-01.svg", alt: "A warm placeholder for a shared memory", caption: "The kind of day we still laugh about.", date: "2026-01-14" },
          { id: "us-002", src: "/images/gallery/album-01/photo-02.svg", alt: "A pink placeholder for a candid memory", caption: "Proof that the unplanned moments are the best ones.", date: "2026-02-02" },
          { id: "us-003", src: "/images/gallery/album-01/photo-03.svg", alt: "A scrapbook placeholder for friends", caption: "Just us, being wonderfully unserious.", date: "2026-02-18" },
          { id: "us-004", src: "/images/gallery/album-01/photo-04.svg", alt: "A lavender placeholder for a favorite day", caption: "One for the forever folder.", date: "2026-03-01" },
        ],
      },
      {
        id: "album-adventures",
        title: "Little Adventures",
        description: "Places, detours, and tiny discoveries ✦",
        coverImage: "/images/gallery/album-02/cover.svg",
        photos: [
          { id: "adventure-001", src: "/images/gallery/album-02/photo-01.svg", alt: "A sunny travel memory placeholder", caption: "We took the scenic route—and it was worth it.", date: "2026-03-12" },
          { id: "adventure-002", src: "/images/gallery/album-02/photo-02.svg", alt: "A blue placeholder for a day out", caption: "Somewhere new, with my favorite company.", date: "2026-04-05" },
          { id: "adventure-003", src: "/images/gallery/album-02/photo-03.svg", alt: "A postcard-style memory placeholder", caption: "A tiny adventure with a very big place in my heart.", date: "2026-04-22" },
          { id: "adventure-004", src: "/images/gallery/album-02/photo-04.svg", alt: "A sunset memory placeholder", caption: "Stayed until the sky changed colors.", date: "2026-05-09" },
          { id: "adventure-005", src: "/images/gallery/album-02/photo-05.svg", alt: "A green placeholder for an outdoor memory", caption: "Let’s do this again someday.", date: "2026-05-20" },
        ],
      },
      {
        id: "album-soft-moments",
        title: "Soft Moments",
        description: "The quiet memories that mean everything ♡",
        coverImage: "/images/gallery/album-03/cover.svg",
        photos: [
          { id: "soft-001", src: "/images/gallery/album-03/photo-01.svg", alt: "A cream placeholder for a quiet memory", caption: "Nothing grand—just a really lovely day.", date: "2026-06-03" },
          { id: "soft-002", src: "/images/gallery/album-03/photo-02.svg", alt: "A floral memory placeholder", caption: "A little moment I never want to forget.", date: "2026-06-19" },
          { id: "soft-003", src: "/images/gallery/album-03/photo-03.svg", alt: "A peach placeholder for a cozy memory", caption: "Comfort looks a lot like this.", date: "2026-07-07" },
          { id: "soft-004", src: "/images/gallery/album-03/photo-04.svg", alt: "A starry placeholder for a favorite memory", caption: "Still one of my favorites.", date: "2026-07-25" },
        ],
      },
    ],
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
      video: "/videos/sticker-mingyu.mp4",
      //tooltip: "Click to watch special message video!",
    },
    {
      id: "poster",
      type: "music",
      label: "Demon Slayer",
      image: "/images/stickers/poster.png",
      music: "/audio/background/sticker-demon-slayer.mp3",
      //tooltip: "Click to toggle background music! (to change music hihi, when clicked this again, paused, then when double clicked around the websitem switch to default bg music)",
    },
    {
      id: "custom-object",
      type: "petals",
      label: "Ezer",
      image: "/images/stickers/flower-pot.png",
      petalStyle: "garden",
      //tooltip: "Click for petal shower magic! (can you do a different flower petal??)",
    },
  ],
};
