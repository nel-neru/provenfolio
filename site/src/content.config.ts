/**
 * Content collections wired to data/ — the read-time half of the contract's
 * double enforcement. The SAME schema objects the engine validates with at
 * write time validate again here at build time: contract-violating data can
 * never ship.
 */
import { defineCollection } from "astro:content";
import { glob, file } from "astro/loaders";
import {
  projectSchema,
  profileSchema,
  aggregatesSchema,
} from "../../engine/schemas/index.js";

const projects = defineCollection({
  loader: glob({ pattern: "*.json", base: "../data/projects" }),
  schema: projectSchema,
});

const profile = defineCollection({
  loader: file("../data/profile.json", {
    parser: (text) => [{ id: "profile", ...JSON.parse(text) }],
  }),
  schema: profileSchema,
});

const aggregates = defineCollection({
  loader: file("../data/derived/aggregates.json", {
    parser: (text) => [{ id: "aggregates", ...JSON.parse(text) }],
  }),
  schema: aggregatesSchema,
});

export const collections = { projects, profile, aggregates };
