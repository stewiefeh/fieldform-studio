# Fieldform Studio

A multi-page marketing site for a fictional architecture and interiors
practice, built as a portfolio piece. Static HTML/CSS/JS, no build step,
no dependencies, no framework.

## Pages

- index.html: home (hero, featured work, philosophy bento, stats, process, testimonial, journal teaser)
- projects.html: filterable project grid
- project-ashgrove.html: case study (residential)
- project-harborline.html: case study (cultural)
- studio.html: about (story, timeline, team, values, recognition)
- services.html: services, engagement models, FAQ accordion
- journal.html: long-form journal with in-page contents rail
- contact.html: validated enquiry form, office details

## Design system

- Tokens only: every color, size, and duration is a CSS custom property in
  css/main.css. Light and dark themes share the same contracts.
- Fonts: Fraunces (display, variable) + Inter (body), the only two.
- Motion: IntersectionObserver entrance staggers, scroll-driven CSS
  animations where supported, View Transitions API page fades, marquee,
  counters, magnetic buttons, custom cursor. All of it honors
  prefers-reduced-motion.

## Accessibility

WCAG 2.2 AA targets: skip link, visible focus rings, aria-pressed filter
buttons, aria-expanded disclosures, dialog semantics on the lightbox,
landmarks and labels throughout.

## AI readability

llms.txt, robots.txt, sitemap.xml, and JSON-LD Organization markup on the
home page.

## Deploy

Any static host. For Cloudflare Pages, zip the folder contents and direct
upload (no build command needed).

Fieldform Studio, its people, and its projects are fictional. Photography
is stock, used for demonstration.
