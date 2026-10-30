This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Using Trip Builder

- On a phone or tablet, use the bottom navigation to switch between the itinerary,
  places, and **Tools** (nearby suggestions, checklist, and budget). The center
  **+** button stays at the exact center of the bar and adds a place; Travel
  and Export remain available in the navigation.
- Use the sun and moon controls to switch between Clean and Dark themes. Existing
  Colorful preferences are automatically moved to Clean.
- Primary buttons use an emerald green accent in both themes, with a darker
  hover state and matching navigation, focus, and PWA theme colors.
- Header and place tools use borderless line-icon buttons. Selected header
  tools have a soft green tint; place counts sit above the tool row so labels
  stay readable in the narrow sidebar.
- Places can be added to a day using the add button and day selector, without
  needing to drag. Browser zoom remains available.
- Place-list and itinerary cards use compact horizontal media cards with 64×64px
  rounded square thumbnails, subtle 1px borders, and streamlined metadata rows.
- Dialogs support keyboard navigation: Tab cycles through controls and Escape
  closes the active dialog, returning focus to its opener.
- On phones, the account menu sits beside the logo, with language, theme, map,
  sync, group, and plan controls in a separate toolbar. The theme button toggles
  between Clean and Dark. Itinerary titles wrap above their move/remove actions
  so long place names do not push cards off-screen.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
