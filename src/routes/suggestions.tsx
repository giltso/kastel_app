import { createFileRoute } from "@tanstack/react-router";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { useConvex } from "convex/react";
import { useState } from "react";
import { 
  MessageSquare, 
  Filter, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  XCircle,
  Users,
  MapPin,
  Lightbulb,
  Calendar
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export const Route = createFileRoute("/suggestions")({
  component: SuggestionsPage,
  loader: async ({ context: { queryClient } }) => {
    const suggestionsQuery = convexQuery(api.suggestions.getSuggestions, {});
    await queryClient.ensureQueryData(suggestionsQuery);
  },
});

type SuggestionStatus = "pending" | "reviewed" | "implemented" | "rejected";

function SuggestionsPage() {
  const [statusFilter, setStatusFilter] = useState<SuggestionStatus | "all">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "status">("newest");
  const convex = useConvex();

  // Get suggestions data
  const suggestionsQuery = convexQuery(api.suggestions.getSuggestions, {});
  const { data: suggestions } = useSuspenseQuery(suggestionsQuery);

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ 
      suggestionId, 
      status, 
      reviewNotes 
    }: { 
      suggestionId: Id<"suggestions">; 
      status: SuggestionStatus; 
      reviewNotes?: string;
    }) => {
      return convex.mutation(api.suggestions.updateSuggestionStatus, {
        suggestionId,
        status,
        reviewNotes,
        implementationDate: status === "implemented" ? new Date().toISOString().split('T')[0] : undefined,
      });
    },
    onSuccess: () => {
      // Refetch suggestions after status update
      // queryClient.invalidateQueries(suggestionsQuery);
    },
  });

  // Filter and sort suggestions
  const filteredSuggestions = suggestions
    .filter(suggestion => statusFilter === "all" || suggestion.status === statusFilter)
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return b._creationTime - a._creationTime;
        case "oldest":
          return a._creationTime - b._creationTime;
        case "status":
          return a.status.localeCompare(b.status);
        default:
          return b._creationTime - a._creationTime;
      }
    });

  const handleStatusUpdate = (suggestionId: Id<"suggestions">, status: SuggestionStatus) => {
    updateStatusMutation.mutate({ suggestionId, status });
  };

  const getStatusIcon = (status: SuggestionStatus) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-warning" />;
      case "reviewed":
        return <MessageSquare className="w-4 h-4 text-info" />;
      case "implemented":
        return <CheckCircle className="w-4 h-4 text-success" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-error" />;
    }
  };

  const getStatusColor = (status: SuggestionStatus) => {
    switch (status) {
      case "pending":
        return "badge-warning";
      case "reviewed":
        return "badge-info";
      case "implemented":
        return "badge-success";
      case "rejected":
        return "badge-error";
    }
  };

  return (
    <div className="not-prose">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-primary" />
            Suggestions Dashboard
          </h1>
          <p className="text-base-content/70 mt-2">
            Review and manage user suggestions and feedback
          </p>
        </div>
        
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Total Suggestions</div>
            <div className="stat-value text-2xl">{suggestions.length}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 p-4 bg-base-200 rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <span className="font-medium">Filters:</span>
        </div>
        
        <div className="form-control">
          <label className="label">
            <span className="label-text">Status</span>
          </label>
          <select 
            className="select select-bordered select-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SuggestionStatus | "all")}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="implemented">Implemented</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Sort By</span>
          </label>
          <select 
            className="select select-bordered select-sm"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "status")}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="status">By Status</option>
          </select>
        </div>
      </div>

      {/* Suggestions List */}
      <div className="space-y-4">
        {filteredSuggestions.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
            <h3 className="text-lg font-medium text-base-content/70">No suggestions found</h3>
            <p className="text-base-content/50">
              {statusFilter === "all" 
                ? "No suggestions have been submitted yet."
                : `No ${statusFilter} suggestions found.`
              }
            </p>
          </div>
        ) : (
          filteredSuggestions.map((suggestion) => (
            <div key={suggestion._id} className="card bg-base-100 shadow-md border border-base-300">
              <div className="card-body">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`badge ${getStatusColor(suggestion.status)} gap-2`}>
                      {getStatusIcon(suggestion.status)}
                      {suggestion.status}
                    </div>
                    <div className="text-sm text-base-content/60">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {new Date(suggestion._creationTime).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  {suggestion.status === "pending" && (
                    <div className="dropdown dropdown-end">
                      <div tabIndex={0} role="button" className="btn btn-sm btn-ghost">
                        Actions
                      </div>
                      <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow">
                        <li>
                          <button 
                            onClick={() => handleStatusUpdate(suggestion._id, "reviewed")}
                            className="text-info"
                          >
                            <MessageSquare className="w-4 h-4" />
                            Mark as Reviewed
                          </button>
                        </li>
                        <li>
                          <button 
                            onClick={() => handleStatusUpdate(suggestion._id, "implemented")}
                            className="text-success"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Mark as Implemented
                          </button>
                        </li>
                        <li>
                          <button 
                            onClick={() => handleStatusUpdate(suggestion._id, "rejected")}
                            className="text-error"
                          >
                            <XCircle className="w-4 h-4" />
                            Mark as Rejected
                          </button>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex items-center gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-base-content/60" />
                    <span className="font-medium">{suggestion.createdByUser?.name}</span>
                    <span className="text-base-content/60">({suggestion.createdByUser?.role})</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-base-content/60" />
                    <span className="text-base-content/60 font-mono text-xs">
                      {suggestion.pageContext}
                    </span>
                  </div>
                </div>

                {/* Problem & Solution */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      <h4 className="font-medium">Problem</h4>
                    </div>
                    <p className="text-sm bg-base-200 p-3 rounded-lg">
                      {suggestion.problem}
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-4 h-4 text-accent" />
                      <h4 className="font-medium">Suggested Solution</h4>
                    </div>
                    <p className="text-sm bg-base-200 p-3 rounded-lg">
                      {suggestion.solution}
                    </p>
                  </div>
                </div>

                {/* Location Details */}
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-base-content/60 hover:text-base-content">
                    Technical Details
                  </summary>
                  <div className="mt-2 p-3 bg-base-300 rounded text-xs font-mono">
                    <div><strong>Location:</strong> {suggestion.location}</div>
                    <div><strong>Submission ID:</strong> {suggestion._id}</div>
                    {suggestion.similarityHash && (
                      <div><strong>Similarity Hash:</strong> {suggestion.similarityHash}</div>
                    )}
                  </div>
                </details>

                {/* Review Notes (if any) */}
                {suggestion.reviewNotes && (
                  <div className="mt-4 p-3 bg-info/10 rounded-lg border border-info/20">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-info" />
                      <span className="font-medium text-info">Developer Notes</span>
                    </div>
                    <p className="text-sm">{suggestion.reviewNotes}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}