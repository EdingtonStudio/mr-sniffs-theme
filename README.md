# Mr. Sniff's · Shopify Theme

The Mr. Sniff's editorial storefront as a native Online Store 2.0 theme: dark
Midnight base, Big Shoulders display type, stroke "COME GET A WHIFF" hero with
scroll parallax, numbered editorial rows, coral accent system, AJAX cart
drawer, and the Smell Test quiz.

## Structure

- `layout/theme.liquid` - shell, fonts (Big Shoulders Display / Space Mono / Inter), design tokens
- `sections/` - header, footer, hero, lineup, editorial rows, product, collection, about, FAQ, smell test, contact, cart drawer
- `snippets/` - product card, newsletter form
- `assets/theme.css` - full design system (ported from the Next.js site)
- `assets/theme.js` - accordions, hamburger, parallax, cart drawer, smell test quiz

## Product metafields

Scent data comes from product metafields under the `custom` namespace, same as
the headless site used:

| Key | Type | Example |
| --- | --- | --- |
| `custom.note_pairing` | single line text | Sandalwood + Black Pepper |
| `custom.mood_tags` | list of single line text | ["Bold", "Smoky"] |
| `custom.burn_time` | single line text | ~50 min / stick |
| `custom.flavor_tag_color` | single line text | #E06666 |

## Development

Connect this repo to the store via **Online Store → Themes → Add theme →
Connect from GitHub**, or run locally with the Shopify CLI:

```sh
shopify theme dev --store mr-sniffs.myshopify.com
```

## Pages

Create these pages in admin and assign the matching template:

- **About** → `page.about`
- **Smell Test** → `page.smell-test`
- **FAQ** → `page.faq`
- **Contact** → `page.contact`
