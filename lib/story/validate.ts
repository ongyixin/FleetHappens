/**
 * Parses and validates LLM output for comic story generation.
 * Handles malformed JSON, markdown fences, and schema violations gracefully.
 *
 * Owner: Comic Story Agent
 */

import { ZodError } from "zod";
import { LLMStoryOutputSchema, ComicStorySchema } from "./schema";
import type { LLMStoryOutput, ComicStoryValidated } from "./schema";
import type { ComicStory } from "@/types";

/**
 * Parse raw LLM text into a validated LLMStoryOutput.
 * Strips markdown code fences if present, then JSON.parses, then Zod-validates.
 * Throws a descriptive Error on any failure.
 */
export function parseLLMOutput(raw: string): LLMStoryOutput {
  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // Find the outermost JSON object in case the model added commentary
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
    throw new Error(
      `LLM response contains no JSON object.\n\nRaw (first 500 chars): ${raw.slice(0, 500)}`
    );
  }
  const jsonStr = cleaned.slice(jsonStart, jsonEnd + 1);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    throw new Error(
      `LLM output is not valid JSON: ${err instanceof Error ? err.message : String(err)}\n\nExtracted: ${jsonStr.slice(0, 500)}`
    );
  }

  try {
    return LLMStoryOutputSchema.parse(parsed);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new Error(
        `LLM output failed schema validation:\n${formatZodError(err)}`
      );
    }
    throw err;
  }
}

/**
 * Validate a fully assembled ComicStory object.
 * Throws a ZodError on failure so callers can handle or log it.
 */
export function validateComicStory(story: unknown): ComicStory {
  const validated: ComicStoryValidated = ComicStorySchema.parse(story);
  return validated as ComicStory;
}

/** Human-readable Zod error summary for logs and error responses. */
export function formatZodError(err: ZodError): string {
  return err.errors
    .map((e) => `  ${e.path.join(".") || "(root)"}: ${e.message}`)
    .join("\n");
}
