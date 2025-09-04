import { createFileRoute } from "@tanstack/react-router";
import { Authenticated, useMutation } from "convex/react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Hammer, Plus, Edit, Trash2, Calendar, User, Clock, DollarSign, Package } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { usePermissions } from "@/hooks/usePermissions";

const toolsQueryOptions = convexQuery(api.tools.listTools, {});
const toolRentalsQueryOptions = convexQuery(api.tools.listToolRentals, {});

export const Route = createFileRoute("/tools")({
  loader: async ({ context: { queryClient } }) => {
    // Always load tools data
    await queryClient.ensureQueryData(toolsQueryOptions);
    
    // Only load rentals data if user might be authenticated
    // This avoids unnecessary API calls for guests
    try {
      await queryClient.ensureQueryData(toolRentalsQueryOptions);
    } catch (error) {
      // Ignore errors for unauthenticated users
      console.log("Skipping rental data for unauthenticated user");
    }
  },
  component: ToolsPage,
});

function ToolsPage() {
  const { hasPermission, effectiveRole } = usePermissions();
  const isOperational = hasPermission("access_worker_portal");
  const isCustomer = hasPermission("access_customer_portal");
  const isGuest = effectiveRole === "guest";

  let description, ViewComponent;
  
  if (isOperational) {
    description = "Manage tool inventory and rental requests";
    ViewComponent = OperationalView;
  } else if (isCustomer) {
    description = "Browse and rent available tools";
    ViewComponent = CustomerView;
  } else {
    description = "Discover our professional tool collection";
    ViewComponent = GuestView;
  }
  
  return (
    <Authenticated>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Hammer className="w-6 h-6" />
              Tool Rental
            </h1>
            <p className="text-base-content/70">
              {description}
            </p>
          </div>
        </div>

        <ViewComponent />
      </div>
    </Authenticated>
  );
}

function OperationalView() {
  const { data: tools } = useSuspenseQuery(toolsQueryOptions);
  const { data: rentals } = useSuspenseQuery(toolRentalsQueryOptions);
  const [showAddTool, setShowAddTool] = useState(false);
  const [activeTab, setActiveTab] = useState<"inventory" | "rentals">("inventory");

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={() => setShowAddTool(true)}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4" />
          Add Tool
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-border">
        <button 
          className={`tab ${activeTab === "inventory" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("inventory")}
        >
          <Package className="w-4 h-4 mr-2" />
          Inventory ({tools.length})
        </button>
        <button 
          className={`tab ${activeTab === "rentals" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("rentals")}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Rentals ({rentals.length})
        </button>
      </div>

      {activeTab === "inventory" ? (
        <InventoryTable tools={tools} />
      ) : (
        <RentalsTable rentals={rentals} />
      )}

      {showAddTool && (
        <AddToolModal onClose={() => setShowAddTool(false)} />
      )}
    </div>
  );
}

function CustomerView() {
  const { data: tools } = useSuspenseQuery(toolsQueryOptions);
  const { data: myRentals } = useSuspenseQuery(toolRentalsQueryOptions);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showRequestModal, setShowRequestModal] = useState<string | null>(null);

  // Get unique categories
  const categories = ["all", ...new Set(tools.map(tool => tool.category))];
  
  // Filter available tools
  const availableTools = tools.filter(tool => 
    selectedCategory === "all" || tool.category === selectedCategory
  );

  return (
    <div className="space-y-6">
      {/* My Current Rentals */}
      {myRentals.length > 0 && (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title">My Current Rentals</h2>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Tool</th>
                    <th>Status</th>
                    <th>Return Date</th>
                    <th>Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {myRentals.map((rental) => (
                    <tr key={rental._id}>
                      <td>{rental.tool?.name}</td>
                      <td>
                        <div className={`badge ${getStatusBadgeColor(rental.status)}`}>
                          {rental.status}
                        </div>
                      </td>
                      <td>{rental.rentalEndDate}</td>
                      <td>${rental.totalCost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`btn btn-sm ${
              selectedCategory === category ? "btn-primary" : "btn-outline"
            }`}
          >
            {category === "all" ? "All Tools" : category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      {/* Available Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableTools.map((tool) => (
          <div key={tool._id} className="card bg-base-100 shadow-sm border">
            <div className="card-body">
              <h3 className="card-title text-lg">{tool.name}</h3>
              {tool.description && (
                <p className="text-sm text-base-content/70">{tool.description}</p>
              )}
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-base-content/60">Brand:</span>
                  <span>{tool.brand || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/60">Model:</span>
                  <span>{tool.model || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/60">Condition:</span>
                  <span className={`badge ${getConditionBadgeColor(tool.condition)}`}>
                    {tool.condition}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/60">Price per day:</span>
                  <span className="font-semibold">
                    {tool.rentalPricePerDay === 0 ? "Free" : `$${tool.rentalPricePerDay}`}
                  </span>
                </div>
              </div>

              <div className="card-actions justify-end mt-4">
                <button
                  onClick={() => setShowRequestModal(tool._id)}
                  className="btn btn-primary btn-sm"
                  disabled={!tool.isAvailable}
                >
                  {tool.isAvailable ? "Request Rental" : "Unavailable"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showRequestModal && (
        <RentalRequestModal
          toolId={showRequestModal}
          tool={tools.find(t => t._id === showRequestModal)!}
          onClose={() => setShowRequestModal(null)}
        />
      )}
    </div>
  );
}

function GuestView() {
  const { data: tools } = useSuspenseQuery(toolsQueryOptions);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Handle case where tools data might not be loaded yet
  if (!tools) {
    return <div className="flex justify-center py-8"><span className="loading loading-spinner loading-lg"></span></div>;
  }

  // Get unique categories
  const categories = ["all", ...new Set(tools.map(tool => tool.category))];
  
  // Filter tools by category
  const filteredTools = tools.filter(tool => 
    selectedCategory === "all" || tool.category === selectedCategory
  );

  return (
    <div className="not-prose space-y-6">
      {/* Call-to-action banner for guests */}
      <div className="alert alert-info">
        <div className="flex items-center gap-3">
          <Hammer className="w-6 h-6" />
          <div>
            <h3 className="font-bold">Ready to rent professional tools?</h3>
            <p className="text-sm">Sign in to check availability and request rentals for your projects.</p>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`btn btn-sm ${
              selectedCategory === category ? "btn-primary" : "btn-outline"
            }`}
          >
            {category === "all" ? "All Tools" : category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      {/* Tools Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTools.map((tool) => (
          <GuestToolCard key={tool._id} tool={tool} />
        ))}
      </div>
    </div>
  );
}

function GuestToolCard({ tool }: { tool: any }) {
  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body">
        <h3 className="card-title">{tool.name}</h3>
        {tool.description && (
          <p className="text-sm opacity-70 line-clamp-3">{tool.description}</p>
        )}
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-base-content/60">Brand:</span>
            <span>{tool.brand || "N/A"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-base-content/60">Model:</span>
            <span>{tool.model || "N/A"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-base-content/60">Category:</span>
            <span className="badge badge-outline">{tool.category}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-base-content/60">Condition:</span>
            <span className={`badge ${getConditionBadgeColor(tool.condition)}`}>
              {tool.condition}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-base-content/60">Price per day:</span>
            <span className="font-semibold">
              {tool.rentalPricePerDay === 0 ? "Free" : `$${tool.rentalPricePerDay}`}
            </span>
          </div>
        </div>

        <div className="card-actions justify-end mt-4">
          <button className="btn btn-primary btn-sm">
            Sign in to rent
          </button>
        </div>
      </div>
    </div>
  );
}

function InventoryTable({ tools }: { tools: any[] }) {
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Tool</th>
                <th>Category</th>
                <th>Condition</th>
                <th>Price/Day</th>
                <th>Status</th>
                <th>Location</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tools.map((tool) => (
                <tr key={tool._id}>
                  <td>
                    <div>
                      <div className="font-medium">{tool.name}</div>
                      {tool.brand && tool.model && (
                        <div className="text-sm text-base-content/60">
                          {tool.brand} {tool.model}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>{tool.category}</td>
                  <td>
                    <div className={`badge ${getConditionBadgeColor(tool.condition)}`}>
                      {tool.condition}
                    </div>
                  </td>
                  <td>{tool.rentalPricePerDay === 0 ? "Free" : `$${tool.rentalPricePerDay}`}</td>
                  <td>
                    <div className={`badge ${tool.isAvailable ? "badge-success" : "badge-error"}`}>
                      {tool.isAvailable ? "Available" : "Rented"}
                    </div>
                  </td>
                  <td>{tool.location || "—"}</td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-xs">
                        <Edit className="w-3 h-3" />
                      </button>
                      <button className="btn btn-ghost btn-xs text-error">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RentalsTable({ rentals }: { rentals: any[] }) {
  const approveRental = useMutation(api.tools.updateRentalStatus);

  const handleStatusUpdate = async (rentalId: string, status: string) => {
    try {
      await approveRental({ 
        rentalId: rentalId as any,
        status: status as any 
      });
    } catch (error) {
      console.error("Failed to update rental status:", error);
    }
  };

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Tool</th>
                <th>Renter</th>
                <th>Rental Period</th>
                <th>Total Cost</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rentals.map((rental) => (
                <tr key={rental._id}>
                  <td>{rental.tool?.name || "Unknown Tool"}</td>
                  <td>{rental.renterUser?.name || "Unknown User"}</td>
                  <td>
                    <div className="text-sm">
                      <div>{rental.rentalStartDate} to {rental.rentalEndDate}</div>
                      {rental.actualReturnDate && (
                        <div className="text-success">Returned: {rental.actualReturnDate}</div>
                      )}
                    </div>
                  </td>
                  <td>${rental.totalCost.toFixed(2)}</td>
                  <td>
                    <div className={`badge ${getStatusBadgeColor(rental.status)}`}>
                      {rental.status}
                    </div>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      {rental.status === "pending" && (
                        <>
                          <button 
                            onClick={() => handleStatusUpdate(rental._id, "approved")}
                            className="btn btn-success btn-xs"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleStatusUpdate(rental._id, "cancelled")}
                            className="btn btn-error btn-xs"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {rental.status === "approved" && (
                        <button 
                          onClick={() => handleStatusUpdate(rental._id, "active")}
                          className="btn btn-primary btn-xs"
                        >
                          Start Rental
                        </button>
                      )}
                      {rental.status === "active" && (
                        <button 
                          onClick={() => handleStatusUpdate(rental._id, "returned")}
                          className="btn btn-success btn-xs"
                        >
                          Mark Returned
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AddToolModal({ onClose }: { onClose: () => void }) {
  const addTool = useMutation(api.tools.addTool);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    brand: "",
    model: "",
    serialNumber: "",
    condition: "excellent" as const,
    rentalPricePerDay: 0,
    location: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addTool(formData);
      onClose();
    } catch (error) {
      console.error("Failed to add tool:", error);
    }
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-4">Add New Tool</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">Tool Name*</label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            
            <div className="form-control">
              <label className="label">Category*</label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g., drill, saw, hammer"
                required
              />
            </div>
          </div>

          <div className="form-control">
            <label className="label">Description</label>
            <textarea
              className="textarea textarea-bordered"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">Brand</label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.brand}
                onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
              />
            </div>
            
            <div className="form-control">
              <label className="label">Model</label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.model}
                onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">Condition</label>
              <select
                className="select select-bordered"
                value={formData.condition}
                onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value as any }))}
              >
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="needs_repair">Needs Repair</option>
              </select>
            </div>
            
            <div className="form-control">
              <label className="label">Price per Day ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input input-bordered"
                value={formData.rentalPricePerDay}
                onChange={(e) => setFormData(prev => ({ ...prev, rentalPricePerDay: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="form-control">
            <label className="label">Location in Shop</label>
            <input
              type="text"
              className="input input-bordered"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="e.g., Aisle 3, Shelf B"
            />
          </div>

          <div className="modal-action">
            <button type="button" onClick={onClose} className="btn">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add Tool
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

function RentalRequestModal({ 
  toolId, 
  tool, 
  onClose 
}: { 
  toolId: string; 
  tool: any; 
  onClose: () => void; 
}) {
  const createRequest = useMutation(api.tools.createRentalRequest);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  const calculateCost = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, days) * tool.rentalPricePerDay;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createRequest({
        toolId: toolId as any,
        rentalStartDate: startDate,
        rentalEndDate: endDate,
        notes: notes || undefined,
      });
      onClose();
    } catch (error) {
      console.error("Failed to create rental request:", error);
    }
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">Request Tool Rental</h3>
        
        <div className="mb-4 p-4 bg-base-200 rounded-lg">
          <h4 className="font-semibold">{tool.name}</h4>
          <p className="text-sm text-base-content/70">{tool.description}</p>
          <p className="text-sm mt-2">
            <span className="font-medium">Price: </span>
            {tool.rentalPricePerDay === 0 ? "Free" : `$${tool.rentalPricePerDay}/day`}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">Start Date</label>
              <input
                type="date"
                className="input input-bordered"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            
            <div className="form-control">
              <label className="label">End Date</label>
              <input
                type="date"
                className="input input-bordered"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || new Date().toISOString().split('T')[0]}
                required
              />
            </div>
          </div>

          {startDate && endDate && (
            <div className="alert alert-info">
              <div>
                <span className="font-semibold">Total Cost: ${calculateCost().toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="form-control">
            <label className="label">Notes (Optional)</label>
            <textarea
              className="textarea textarea-bordered"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requirements or notes..."
            />
          </div>

          <div className="modal-action">
            <button type="button" onClick={onClose} className="btn">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

// Helper functions
function getConditionBadgeColor(condition: string) {
  switch (condition) {
    case "excellent": return "badge-success";
    case "good": return "badge-info";
    case "fair": return "badge-warning";
    case "needs_repair": return "badge-error";
    default: return "badge-neutral";
  }
}

function getStatusBadgeColor(status: string) {
  switch (status) {
    case "pending": return "badge-warning";
    case "approved": return "badge-info";
    case "active": return "badge-success";
    case "returned": return "badge-neutral";
    case "overdue": return "badge-error";
    case "cancelled": return "badge-ghost";
    default: return "badge-neutral";
  }
}