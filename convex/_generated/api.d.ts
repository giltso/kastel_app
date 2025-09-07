/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as adminHelpers from "../adminHelpers.js";
import type * as calendar_unified from "../calendar_unified.js";
import type * as courses from "../courses.js";
import type * as debug from "../debug.js";
import type * as demo from "../demo.js";
import type * as events from "../events.js";
import type * as forms from "../forms.js";
import type * as migrations from "../migrations.js";
import type * as proProfiles from "../proProfiles.js";
import type * as seed from "../seed.js";
import type * as shifts from "../shifts.js";
import type * as suggestions from "../suggestions.js";
import type * as testHelpers from "../testHelpers.js";
import type * as tools from "../tools.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  adminHelpers: typeof adminHelpers;
  calendar_unified: typeof calendar_unified;
  courses: typeof courses;
  debug: typeof debug;
  demo: typeof demo;
  events: typeof events;
  forms: typeof forms;
  migrations: typeof migrations;
  proProfiles: typeof proProfiles;
  seed: typeof seed;
  shifts: typeof shifts;
  suggestions: typeof suggestions;
  testHelpers: typeof testHelpers;
  tools: typeof tools;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
