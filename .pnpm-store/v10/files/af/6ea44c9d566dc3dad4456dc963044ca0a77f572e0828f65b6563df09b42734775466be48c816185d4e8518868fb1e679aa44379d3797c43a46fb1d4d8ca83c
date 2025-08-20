import { QueryCache, QueryClient, QueryFunction, QueryFunctionContext, QueryKey, UseQueryOptions, UseSuspenseQueryOptions } from "@tanstack/react-query";
import { ConvexHttpClient } from "convex/browser";
import { ConvexReactClient, ConvexReactClientOptions, Watch } from "convex/react";
import { FunctionArgs, FunctionReference, FunctionReturnType } from "convex/server";
export { useQuery as useConvexQuery, useQueries as useConvexQueries, usePaginatedQuery as useConvexPaginatedQuery, useMutation as useConvexMutation, useAction as useConvexAction, useConvex, useConvexAuth, optimisticallyUpdateValueInPaginatedQuery, } from "convex/react";
export interface ConvexQueryClientOptions extends ConvexReactClientOptions {
    /** queryClient can also be set later by calling .connect(ReactqueryClient) */
    queryClient?: QueryClient;
}
/**
 * Subscribes to events from a TanStack Query QueryClient and populates query
 * results in it for all Convex query function subscriptions.
 */
export declare class ConvexQueryClient {
    convexClient: ConvexReactClient;
    subscriptions: Record<string, // queryKey hash
    {
        watch: Watch<any>;
        unsubscribe: () => void;
        queryKey: [
            convexKey: "convexQuery",
            func: FunctionReference<"query">,
            args: Record<string, any>,
            options?: {}
        ];
    }>;
    unsubscribe: (() => void) | undefined;
    serverHttpClient?: ConvexHttpClient;
    _queryClient: QueryClient | undefined;
    get queryClient(): QueryClient;
    constructor(
    /** A ConvexReactClient instance or a URL to use to instantiate one. */
    client: ConvexReactClient | string, 
    /** Options mostly for the ConvexReactClient to be constructed. */
    options?: ConvexQueryClientOptions);
    /** Complete initialization of ConvexQueryClient by connecting a TanStack QueryClient */
    connect(queryClient: QueryClient): void;
    /** Update every query key. Probably not useful, don't use this. */
    onUpdate: () => void;
    onUpdateQueryKeyHash(queryHash: string): void;
    subscribeInner(queryCache: QueryCache): () => void;
    /**
     * Returns a promise for the query result of a query key containing
     * `['convexQuery', FunctionReference, args]` and subscribes via WebSocket
     * to future updates.
     *
     * You can provide a custom fetch function for queries that are not
     * Convex queries.
     */
    queryFn(otherFetch?: QueryFunction<unknown, QueryKey>): <ConvexQueryReference extends FunctionReference<"query", "public">>(context: QueryFunctionContext<ReadonlyArray<unknown>>) => Promise<FunctionReturnType<ConvexQueryReference>>;
    /**
     * Set this globally to use Convex query functions.
     *
     * ```ts
     * const queryClient = new QueryClient({
     *   defaultOptions: {
     *    queries: {
     *       queryKeyHashFn: convexQueryClient.hashFn(),
     *     },
     *   },
     * });
     *
     * You can provide a custom hash function for keys that are not for Convex
     * queries.
     */
    hashFn(otherHashKey?: (queryKey: ReadonlyArray<unknown>) => string): (queryKey: ReadonlyArray<unknown>) => string;
    /**
     * Query options factory for Convex query function subscriptions.
     *
     * ```
     * useQuery(client.queryOptions(api.foo.bar, args))
     * ```
     *
     * If you need to specify other options spread it:
     * ```
     * useQuery({
     *   ...convexQueryClient.queryOptions(api.foo.bar, args),
     *   placeholderData: { name: "me" }
     * });
     * ```
     */
    queryOptions: <ConvexQueryReference extends FunctionReference<"query">>(funcRef: ConvexQueryReference, queryArgs: FunctionArgs<ConvexQueryReference>) => Pick<UseQueryOptions<FunctionReturnType<ConvexQueryReference>, Error, FunctionReturnType<ConvexQueryReference>, ["convexQuery", ConvexQueryReference, FunctionArgs<ConvexQueryReference>]>, "queryKey" | "queryFn" | "staleTime">;
}
/**
 * Query options factory for Convex query function subscriptions.
 * This options factory requires the `convexQueryClient.queryFn()` has been set
 * as the default `queryFn` globally.
 *
 * ```
 * useQuery(convexQuery(api.foo.bar, args))
 * ```
 *
 * If you need to specify other options spread it:
 * ```
 * useQuery({
 *   ...convexQuery(api.messages.list, { channel: 'dogs' }),
 *   placeholderData: [{ name: "Snowy" }]
 * });
 * ```
 */
export declare const convexQuery: <ConvexQueryReference extends FunctionReference<"query">, Args extends "skip" | FunctionArgs<ConvexQueryReference>>(funcRef: ConvexQueryReference, queryArgs: Args) => Args extends "skip" ? Pick<UseQueryOptions<FunctionReturnType<ConvexQueryReference>, Error, FunctionReturnType<ConvexQueryReference>, ["convexQuery", ConvexQueryReference, FunctionArgs<ConvexQueryReference>]>, "queryKey" | "queryFn" | "staleTime" | "enabled"> : Pick<UseSuspenseQueryOptions<FunctionReturnType<ConvexQueryReference>, Error, FunctionReturnType<ConvexQueryReference>, ["convexQuery", ConvexQueryReference, FunctionArgs<ConvexQueryReference>]>, "queryKey" | "queryFn" | "staleTime">;
/**
 * Query options factory for Convex action function.
 * Not that Convex actions are live updating: they follow the normal react-query
 * semantics of refreshing on
 *
 * ```
 * useQuery(convexQuery(api.weather.now, { location: "SF" }))
 * ```
 *
 * If you need to specify other options spread it:
 * ```
 * useQuery({
 *   ...convexAction(api.weather.now, { location: "SF" }),
 *   placeholderData: { status: "foggy and cool" }
 * });
 * ```
 */
export declare const convexAction: <ConvexActionReference extends FunctionReference<"action">, Args extends "skip" | FunctionArgs<ConvexActionReference>>(funcRef: ConvexActionReference, args: Args) => Args extends "skip" ? Pick<UseQueryOptions<FunctionReturnType<ConvexActionReference>, Error, FunctionReturnType<ConvexActionReference>, ["convexAction", ConvexActionReference, FunctionArgs<ConvexActionReference>]>, "queryKey" | "queryFn" | "staleTime" | "enabled"> : Pick<UseSuspenseQueryOptions<FunctionReturnType<ConvexActionReference>, Error, FunctionReturnType<ConvexActionReference>, ["convexAction", ConvexActionReference, FunctionArgs<ConvexActionReference>]>, "queryKey" | "queryFn" | "staleTime">;
//# sourceMappingURL=index.d.ts.map