// Site-wide settings. Change things here, not in the components.

// Your display name isn't decided yet (PLAN.md section 5).
export const siteName = "[PLACEHOLDER: name]";

export const siteDescription = "[PLACEHOLDER: one-line site description]";

// The nav, in order. Renaming "hobbies" later is one edit to `label` here
// (and the folder name in src/pages if you want the URL to change too).
export const navItems = [
  { label: "home", href: "/" },
  { label: "work", href: "/work/" },
  { label: "writing", href: "/writing/" },
  { label: "hobbies", href: "/hobbies/" },
  { label: "places", href: "/places/" },
  { label: "now", href: "/now/" },
  { label: "about", href: "/about/" },
];

// Footer links. `href` values are placeholders until you decide them.
export const socialLinks = [
  { label: "github", href: "https://github.com/bngybongybrd" },
  { label: "email", href: "#[PLACEHOLDER: email]" },
  { label: "linkedin", href: "#[PLACEHOLDER: linkedin]" },
];

// One line for the "right now" strip above the footer.
// Stage 3 replaces this with the `strip` field from the `now` content file.
export const nowStrip = "[PLACEHOLDER: one line about what you're doing right now]";
