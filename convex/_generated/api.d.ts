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
import type * as courses_v2 from "../courses_v2.js";
import type * as dev_helpers from "../dev_helpers.js";
import type * as shift_assignments from "../shift_assignments.js";
import type * as shifts from "../shifts.js";
import type * as tools from "../tools.js";
import type * as ui_content from "../ui_content.js";
import type * as users_v2 from "../users_v2.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  courses_v2: typeof courses_v2;
  dev_helpers: typeof dev_helpers;
  shift_assignments: typeof shift_assignments;
  shifts: typeof shifts;
  tools: typeof tools;
  ui_content: typeof ui_content;
  users_v2: typeof users_v2;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
