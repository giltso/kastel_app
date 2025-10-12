import { createFileRoute } from "@tanstack/react-router";
import { Authenticated, useMutation } from "convex/react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Hammer, Plus, Edit, Trash2, Calendar, User, Clock, DollarSign, Package, History, Search, UserPlus } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { useLanguage } from "@/hooks/useLanguage";
import { CreateManualRentalModal } from "@/components/modals/CreateManualRentalModal";

const toolsQueryOptions = convexQuery(api.tools.listTools, {});
const toolRentalsQueryOptions = convexQuery(api.tools.listToolRentals, {});

export const Route = createFileRoute("/tools")({
  component: ToolsPage,
});

function ToolsPage() {
  const { t } = useLanguage();
  const { isStaff, hasToolHandlerTag, hasRentalApprovedTag, isAuthenticated } = usePermissionsV2();
  const isToolHandler = isStaff && hasToolHandlerTag;
  const isRentalApproved = !isStaff && hasRentalApprovedTag;
  const isGuest = !isAuthenticated;

  let description, ViewComponent;

  if (isToolHandler) {
    description = t("tools:descriptions.manageInventory");
    ViewComponent = OperationalView;
  } else if (isRentalApproved) {
    description = t("tools:descriptions.browseAndRent");
    ViewComponent = CustomerView;
  } else {
    description = t("tools:descriptions.discoverCollection");
    ViewComponent = GuestView;
  }

  return (
    <Authenticated>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Hammer className="w-6 h-6" />
              {t("tools:toolRental")}
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
  const { t } = useLanguage();
  const { data: tools } = useSuspenseQuery(toolsQueryOptions);
  const { data: rentals } = useSuspenseQuery(toolRentalsQueryOptions);
  const [showAddTool, setShowAddTool] = useState(false);
  const [showRentalHistory, setShowRentalHistory] = useState(false);
  const [showManualRental, setShowManualRental] = useState(false);
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
          {t("tools:addTool")}
        </button>
        <button
          onClick={() => setShowManualRental(true)}
          className="btn btn-secondary"
        >
          <UserPlus className="w-4 h-4" />
          {t("tools:rental.manualRental")}
        </button>
        <button
          onClick={() => setShowRentalHistory(true)}
          className="btn btn-outline"
        >
          <History className="w-4 h-4" />
          {t("tools:rental.rentalHistory")}
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-border">
        <button
          className={`tab ${activeTab === "inventory" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("inventory")}
        >
          <Package className="w-4 h-4 mr-2" />
          {t("tools:inventory.title")} ({tools.length})
        </button>
        <button
          className={`tab ${activeTab === "rentals" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("rentals")}
        >
          <Calendar className="w-4 h-4 mr-2" />
          {t("tools:rental.rentals")} ({rentals.length})
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

      {showManualRental && (
        <CreateManualRentalModal
          isOpen={showManualRental}
          onClose={() => setShowManualRental(false)}
        />
      )}

      {showRentalHistory && (
        <RentalHistoryModal onClose={() => setShowRentalHistory(false)} />
      )}
    </div>
  );
}

function CustomerView() {
  const { t } = useLanguage();
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
            <h2 className="card-title">{t("tools:rental.myCurrentRentals")}</h2>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>{t("tools:tool")}</th>
                    <th>{t("tools:rental.status")}</th>
                    <th>{t("tools:rental.returnDate")}</th>
                    <th>{t("tools:rental.totalCost")}</th>
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
            {category === "all" ? t("tools:allTools") : category.charAt(0).toUpperCase() + category.slice(1)}
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
                  <span className="text-base-content/60">{t("tools:fields.brand")}:</span>
                  <span>{tool.brand || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/60">{t("tools:fields.model")}:</span>
                  <span>{tool.model || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/60">{t("tools:fields.condition")}:</span>
                  <span className={`badge ${getConditionBadgeColor(tool.condition)}`}>
                    {t(`tools:condition.${tool.condition}`)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/60">{t("tools:pricePerDay")}:</span>
                  <span className="font-semibold">
                    {tool.rentalPricePerDay === 0 ? t("tools:free") : `$${tool.rentalPricePerDay}`}
                  </span>
                </div>
              </div>

              <div className="card-actions justify-end mt-4">
                <button
                  onClick={() => setShowRequestModal(tool._id)}
                  className="btn btn-primary btn-sm"
                  disabled={!tool.isAvailable}
                >
                  {tool.isAvailable ? t("tools:rental.requestRental") : t("tools:inventory.unavailable")}
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
  const { t } = useLanguage();
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
            {category === "all" ? t("tools:allTools") : category.charAt(0).toUpperCase() + category.slice(1)}
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
  const { t } = useLanguage();

  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body">
        <h3 className="card-title">{tool.name}</h3>
        {tool.description && (
          <p className="text-sm opacity-70 line-clamp-3">{tool.description}</p>
        )}

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-base-content/60">{t("tools:fields.brand")}:</span>
            <span>{tool.brand || "N/A"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-base-content/60">{t("tools:fields.model")}:</span>
            <span>{tool.model || "N/A"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-base-content/60">{t("tools:fields.category")}:</span>
            <span className="badge badge-outline">{tool.category}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-base-content/60">{t("tools:fields.condition")}:</span>
            <span className={`badge ${getConditionBadgeColor(tool.condition)}`}>
              {t(`tools:condition.${tool.condition}`)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-base-content/60">{t("tools:pricePerDay")}:</span>
            <span className="font-semibold">
              {tool.rentalPricePerDay === 0 ? t("tools:free") : `$${tool.rentalPricePerDay}`}
            </span>
          </div>
        </div>

        <div className="card-actions justify-end mt-4">
          <button className="btn btn-primary btn-sm">
            {t("tools:signInToRent")}
          </button>
        </div>
      </div>
    </div>
  );
}

function InventoryTable({ tools }: { tools: any[] }) {
  const { t } = useLanguage();

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>{t("tools:tool")}</th>
                <th>{t("tools:fields.category")}</th>
                <th>{t("tools:fields.condition")}</th>
                <th>{t("tools:pricePerDay")}</th>
                <th>{t("tools:rental.status")}</th>
                <th>{t("tools:fields.location")}</th>
                <th>{t("tools:rental.actions")}</th>
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
                      {t(`tools:condition.${tool.condition}`)}
                    </div>
                  </td>
                  <td>{tool.rentalPricePerDay === 0 ? t("tools:free") : `$${tool.rentalPricePerDay}`}</td>
                  <td>
                    <div className={`badge ${tool.isAvailable ? "badge-success" : "badge-error"}`}>
                      {tool.isAvailable ? t("tools:inventory.available") : t("tools:rented")}
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
  const { t } = useLanguage();
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
                <th>{t("tools:tool")}</th>
                <th>{t("tools:rental.renter")}</th>
                <th>{t("tools:rental.rentalPeriod")}</th>
                <th>{t("tools:rental.totalCost")}</th>
                <th>{t("tools:rental.status")}</th>
                <th>{t("tools:rental.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rentals.map((rental) => (
                <tr key={rental._id}>
                  <td>{rental.tool?.name || t("tools:fields.unknownTool")}</td>
                  <td>
                    {rental.isManualRental ? (
                      <div>
                        <div className="font-medium">{rental.nonUserRenterName}</div>
                        <div className="text-xs text-base-content/60">{rental.nonUserRenterContact}</div>
                        <div className="badge badge-sm badge-outline mt-1">{t("tools:rental.walkIn")}</div>
                      </div>
                    ) : (
                      rental.renterUser?.name || t("tools:fields.unknownUser")
                    )}
                  </td>
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
                      {t(`tools:rental.${rental.status}`)}
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
                            {t("tools:rental.approve")}
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(rental._id, "cancelled")}
                            className="btn btn-error btn-xs"
                          >
                            {t("tools:rental.reject")}
                          </button>
                        </>
                      )}
                      {rental.status === "approved" && (
                        <button
                          onClick={() => handleStatusUpdate(rental._id, "active")}
                          className="btn btn-primary btn-xs"
                        >
                          {t("tools:rental.startRental")}
                        </button>
                      )}
                      {rental.status === "active" && (
                        <button
                          onClick={() => handleStatusUpdate(rental._id, "returned")}
                          className="btn btn-success btn-xs"
                        >
                          {t("tools:rental.markReturned")}
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
  const { t } = useLanguage();
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
        <h3 className="font-bold text-lg mb-4">{t("tools:addNewTool")}</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">{t("tools:fields.toolName")}*</label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">{t("tools:fields.category")}*</label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder={t("tools:fields.categoryPlaceholder")}
                required
              />
            </div>
          </div>

          <div className="form-control">
            <label className="label">{t("tools:fields.description")}</label>
            <textarea
              className="textarea textarea-bordered"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">{t("tools:fields.brand")}</label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.brand}
                onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
              />
            </div>

            <div className="form-control">
              <label className="label">{t("tools:fields.model")}</label>
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
              <label className="label">{t("tools:fields.condition")}</label>
              <select
                className="select select-bordered"
                value={formData.condition}
                onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value as any }))}
              >
                <option value="excellent">{t("tools:condition.excellent")}</option>
                <option value="good">{t("tools:condition.good")}</option>
                <option value="fair">{t("tools:condition.fair")}</option>
                <option value="needs_repair">{t("tools:condition.needsRepair")}</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">{t("tools:fields.pricePerDay")}</label>
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
            <label className="label">{t("tools:fields.locationInShop")}</label>
            <input
              type="text"
              className="input input-bordered"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder={t("tools:fields.locationPlaceholder")}
            />
          </div>

          <div className="modal-action">
            <button type="button" onClick={onClose} className="btn">
              {t("common:actions.cancel")}
            </button>
            <button type="submit" className="btn btn-primary">
              {t("tools:addTool")}
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
  const { t } = useLanguage();
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
        <h3 className="font-bold text-lg mb-4">{t("tools:rental.requestToolRental")}</h3>

        <div className="mb-4 p-4 bg-base-200 rounded-lg">
          <h4 className="font-semibold">{tool.name}</h4>
          <p className="text-sm text-base-content/70">{tool.description}</p>
          <p className="text-sm mt-2">
            <span className="font-medium">{t("tools:rental.price")}: </span>
            {tool.rentalPricePerDay === 0 ? t("tools:free") : `$${tool.rentalPricePerDay}/day`}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">{t("tools:rental.startDate")}</label>
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
              <label className="label">{t("tools:rental.endDate")}</label>
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
                <span className="font-semibold">{t("tools:rental.totalCost")}: ${calculateCost().toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="form-control">
            <label className="label">{t("tools:fields.notesOptional")}</label>
            <textarea
              className="textarea textarea-bordered"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("tools:fields.notesPlaceholder")}
            />
          </div>

          <div className="modal-action">
            <button type="button" onClick={onClose} className="btn">
              {t("common:actions.cancel")}
            </button>
            <button type="submit" className="btn btn-primary">
              {t("tools:rental.submitRequest")}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

function RentalHistoryModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const [toolFilter, setToolFilter] = useState("");
  const [renterFilter, setRenterFilter] = useState("");

  // Create query options with filters
  const historyQueryOptions = convexQuery(
    api.tools.listRentalHistory, 
    {
      toolFilter: toolFilter || undefined,
      renterFilter: renterFilter || undefined,
    }
  );
  const { data: history } = useSuspenseQuery(historyQueryOptions);

  const formatDateRange = (startDate: string, endDate: string, actualReturnDate?: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const formatOptions: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric', 
      year: start.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined 
    };
    
    let dateRange = `${start.toLocaleDateString('en-US', formatOptions)} to ${end.toLocaleDateString('en-US', formatOptions)}`;
    
    if (actualReturnDate) {
      const returned = new Date(actualReturnDate);
      dateRange += `\nReturned: ${returned.toLocaleDateString('en-US', formatOptions)}`;
    }
    
    return dateRange;
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-6xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <History className="w-5 h-5" />
            {t("tools:rental.rentalHistory")}
          </h3>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            ✕
          </button>
        </div>

        {/* Search and Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">{t("tools:fields.searchByTool")}</span>
            </label>
            <div className="input-group">
              <span className="bg-base-200 px-3 flex items-center">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder={t("tools:fields.toolNamePlaceholder")}
                className="input input-bordered flex-1"
                value={toolFilter}
                onChange={(e) => setToolFilter(e.target.value)}
              />
            </div>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">{t("tools:fields.searchByRenter")}</span>
            </label>
            <div className="input-group">
              <span className="bg-base-200 px-3 flex items-center">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder={t("tools:fields.renterPlaceholder")}
                className="input input-bordered flex-1"
                value={renterFilter}
                onChange={(e) => setRenterFilter(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-4 text-sm text-base-content/70">
          {t("tools:messages.showingRentals", { count: history.length })}
          {(toolFilter || renterFilter) && ` ${t("tools:messages.filtered")}`}
        </div>

        {/* History Table */}
        <div className="overflow-x-auto max-h-96">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>{t("tools:tool")}</th>
                <th>{t("tools:rental.renter")}</th>
                <th>{t("tools:rental.rentalPeriod")}</th>
                <th>{t("tools:rental.totalCost")}</th>
                <th>{t("tools:rental.status")}</th>
              </tr>
            </thead>
            <tbody>
              {history.map((rental) => (
                <tr key={rental._id} className="hover">
                  <td>
                    <div>
                      <div className="font-medium">{rental.tool?.name || t("tools:fields.unknownTool")}</div>
                      <div className="text-xs text-base-content/60">{rental.tool?.category}</div>
                    </div>
                  </td>
                  <td>
                    {rental.isManualRental ? (
                      <div>
                        <div className="font-medium">{rental.nonUserRenterName}</div>
                        <div className="text-xs text-base-content/60">{rental.nonUserRenterContact}</div>
                        <div className="badge badge-xs badge-outline mt-1">{t("tools:rental.walkIn")}</div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-medium">{rental.renterUser?.name || t("tools:fields.unknownUser")}</div>
                        <div className="text-xs text-base-content/60">{rental.renterUser?.email}</div>
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="text-xs whitespace-pre-line">
                      {formatDateRange(rental.rentalStartDate, rental.rentalEndDate, rental.actualReturnDate)}
                    </div>
                  </td>
                  <td>
                    <span className="font-mono">${rental.totalCost?.toFixed(2) || '0.00'}</span>
                  </td>
                  <td>
                    <span className={`badge badge-sm ${getStatusBadgeColor(rental.status)}`}>
                      {t(`tools:rental.${rental.status}`)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {history.length === 0 && (
          <div className="text-center py-8 text-base-content/60">
            {toolFilter || renterFilter ?
              t("tools:messages.noRentalsMatch") :
              t("tools:messages.noRentalHistory")
            }
          </div>
        )}

        <div className="modal-action">
          <button onClick={onClose} className="btn">
            {t("common:actions.close")}
          </button>
        </div>
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