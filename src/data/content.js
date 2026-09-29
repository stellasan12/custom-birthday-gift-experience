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
   *
   * type: "slideshow" — cycles through slide images
   *       "video"     — plays a single intro video
   *
   * slides: Array of image paths (used when type is "slideshow").
   *         Place your images in /public/images/ and reference them
   *         as "/images/your-file.jpg".
   *
   * video:  Path to an intro video (used when type is "video").
   *         Place the video in /public/video/ and reference it
   *         as "/video/your-file.mp4".
   *
   * slideDuration: Milliseconds each slide is shown (default 3000).
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
   *
   * characterImage: Path to the main birthday character artwork.
   *                 Place your image in /public/images/ and update the path.
   *
   * greeting: The big headline shown on the homepage.
   * subGreeting: Secondary text below the headline.
   */
  homepage: {
    characterImage: "/images/placeholders/birthday-character.svg",
    greeting: "Happy Birthday",
    subGreeting: "We made something special just for u! AAAA ✨",
  },

  /**
   * AUDIO
   *
   * globalBackgroundMusic: Path to the background music MP3.
   *                        Place your audio in /public/audio/background/
   *                        and update this path.
   *
   * Note: Browser autoplay restrictions mean music will only start
   * after the user's first interaction with the page.
   */
  audio: {
    globalBackgroundMusic: "/audio/background/general-bgm.mp3",
    defaultVolume: 0.4
  },
};