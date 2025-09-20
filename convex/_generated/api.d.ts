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
import type * as courses from "../courses.js";
import type * as shift_assignments from "../shift_assignments.js";
import type * as shifts from "../shifts.js";
import type * as test_shifts from "../test_shifts.js";
import type * as tools from "../tools.js";
import type * as users_v2 from "../users_v2.js";
import type * as worker_requests from "../worker_requests.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  courses: typeof courses;
  shift_assignments: typeof shift_assignments;
  shifts: typeof shifts;
  test_shifts: typeof test_shifts;
  tools: typeof tools;
  users_v2: typeof users_v2;
  worker_requests: typeof worker_requests;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
