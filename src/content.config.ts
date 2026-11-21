// Content collections: tells Astro where the content files are and what
// fields each one must have. If a file is missing a field or has the wrong
// type, the build stops with a clear error instead of producing a broken page.
// Docs: https://docs.astro.build/en/guides/content-collections/
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const TRIPS = "./src/content/trips";

// The folder name ("yunnan-2026") is the trip's id and its URL slug.
const tripFolder = ({ entry }: { entry: string }) => entry.split("/")[0];

// One trip.yaml per trip folder.
const trips = defineCollection({
  loader: glob({ base: TRIPS, pattern: "*/trip.yaml", generateId: tripFolder }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      subtitle: z.string().optional(),
      dates: z.object({ start: z.coerce.date(), end: z.coerce.date() }),
      summary: z.string(),
      // Optional until a photo is chosen; image() checks the file exists.
      cover: image().optional(),
      hero: image().optional(),
      stats: z.object({ days: z.number(), highlight: z.string().optional() }),
      route: z.string().optional(),
      globe: z.object({ coords: z.tuple([z.number(), z.number()]) }).optional(),
      stops: z
        .array(
          z.object({
            id: z.string(),
            name: z.string(),
            coords: z.tuple([z.number(), z.number()]), // [lat, lng]
            days: z.array(z.number()),
            kind: z.enum(["city", "hike", "food", "stay"]),
          }),
        )
        .default([]),
    }),
});

// One file per day: day-01.md, day-02.md, ... Ids look like "yunnan-2026/day-01".
const days = defineCollection({
  loader: glob({ base: TRIPS, pattern: "*/day-*.md" }),
  schema: z.object({
    day: z.number(),
    date: z.coerce.date(),
    title: z.string(),
    mode: z.enum(["reading", "map"]).default("reading"), // only "reading" is built
    isHike: z.boolean().default(false),
    places: z.array(z.string()).default([]),
  }),
});

// intro.md and notes.md: plain Markdown, no front matter needed.
const tripText = defineCollection({
  loader: glob({ base: TRIPS, pattern: "*/{intro,notes}.md" }),
  schema: z.object({}),
});

export const collections = { trips, days, tripText };
