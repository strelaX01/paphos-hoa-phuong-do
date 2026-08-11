"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Edit3,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  Utensils,
  X,
} from "lucide-react";

import AdminShell from "@/app/admin/_components/AdminShell";
import AdminToast from "@/app/admin/_components/AdminToast";
import PaginationControls from "@/app/components/shared/PaginationControls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { dedupeClientRequest } from "@/lib/dedupeClientRequest";

const emptyCategoryForm = {
  title: "",
  isActive: true,
};

const emptyItemForm = {
  name: "",
  description: "",
  price: "",
  pricingMode: "single",
  variants: [],
  image: "",
  categoryId: "",
  isSpicy: false,
  isActive: true,
};

const inputClass =
  "w-full rounded-md border border-[#E4DAC9] bg-white px-3 py-2 text-sm text-[#2B2B2B] outline-none transition-colors placeholder:text-[#A89E91] focus:border-[#8B1E1E] focus:ring-2 focus:ring-[#8B1E1E]/10";

const euroInputFormatter = new Intl.NumberFormat("en-IE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function isValidEuroPrice(value) {
  const price = Number(value);
  return Number.isFinite(price) && price >= 0.01 && price <= 10000;
}

function getItemAvailability(item) {
  if (!item.isActive) return { available: false, reason: "Item unavailable" };
  if (item.categoryIsActive === false) return { available: false, reason: "Category unavailable" };
  if (item.variants?.length && !item.variants.some((variant) => variant.isActive)) {
    return { available: false, reason: "All choices unavailable" };
  }
  return { available: true, reason: "" };
}

function sanitizeEuroInput(value) {
  const normalized = String(value || "").replace(",", ".").replace(/[^\d.]/g, "");
  const dotIndex = normalized.indexOf(".");
  const whole = (dotIndex === -1 ? normalized : normalized.slice(0, dotIndex)).replace(/^0+(?=\d)/, "");
  if (dotIndex === -1) return whole;
  const decimals = normalized.slice(dotIndex + 1).replaceAll(".", "").slice(0, 2);
  return `${whole || "0"}.${decimals}`;
}

const menuSections = new Set(["items", "categories"]);
const ITEM_PAGE_SIZE = 10;

function getSectionFromHash() {
  if (typeof window === "undefined") return "items";

  const section = window.location.hash.replace("#", "");
  return menuSections.has(section) ? section : "items";
}

async function readApi(response) {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const firstError = payload.errors ? Object.values(payload.errors)[0] : null;
    throw new Error(firstError || payload.error || "Request failed.");
  }

  return payload.data;
}

function fetchMenuData() {
  return dedupeClientRequest("/api/admin/menu/categories", () => {
    return fetch("/api/admin/menu/categories").then(readApi);
  });
}

async function fetchMenuItems({ page, query, categoryFilter }) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(ITEM_PAGE_SIZE) });
  if (query.trim()) params.set("q", query.trim());
  if (categoryFilter !== "all") params.set("categoryId", categoryFilter);

  const url = `/api/admin/menu/items?${params.toString()}`;
  return dedupeClientRequest(url, async () => {
    const response = await fetch(url, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const firstError = payload.errors ? Object.values(payload.errors)[0] : null;
      throw new Error(firstError || payload.error || "Could not load menu items.");
    }
    return {
      items: payload.data || [],
      pagination: payload.pagination || { page: 1, pageSize: ITEM_PAGE_SIZE, total: 0, totalPages: 1 },
      summary: payload.summary || { total: 0, available: 0 },
    };
  });
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-CY", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

function formatItemPrice(item) {
  if (!item?.variants?.length) return formatMoney(item?.price);
  const prices = item.variants.map((variant) => Number(variant.price));
  const minimum = Math.min(...prices);
  const maximum = Math.max(...prices);
  return minimum === maximum ? formatMoney(minimum) : `${formatMoney(minimum)} - ${formatMoney(maximum)}`;
}

export default function AdminMenuPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [itemPage, setItemPage] = useState(1);
  const [itemPagination, setItemPagination] = useState({ page: 1, pageSize: ITEM_PAGE_SIZE, total: 0, totalPages: 1 });
  const [menuSummary, setMenuSummary] = useState({ total: 0, available: 0 });
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [activeSection, setActiveSection] = useState("items");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const toastIdRef = useRef(0);

  const showToast = (message, tone = "success") => {
    toastIdRef.current += 1;
    setToast({ message, tone, id: toastIdRef.current });
  };

  const loadMenuData = async () => {
    try {
      const nextCategories = await fetchMenuData();
      setCategories(nextCategories);
      setRefreshVersion((version) => version + 1);
    } catch (error) {
      showToast(error.message || "Could not load menu data.", "error");
    }
  };

  useEffect(() => {
    let active = true;

    fetchMenuData()
      .then((nextCategories) => {
        if (!active) return;
        setCategories(nextCategories);
      })
      .catch((error) => {
        if (!active) return;
        toastIdRef.current += 1;
        setToast({
          message: error.message || "Could not load menu data.",
          tone: "error",
          id: toastIdRef.current,
        });
      })
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetchMenuItems({ page: itemPage, query, categoryFilter })
        .then((result) => {
          if (!active) return;
          setItems(result.items);
          setItemPagination(result.pagination);
          setMenuSummary(result.summary);
          if (result.pagination.page !== itemPage) setItemPage(result.pagination.page);
        })
        .catch((error) => {
          if (!active) return;
          showToast(error.message || "Could not load menu items.", "error");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, query.trim() ? 300 : 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [categoryFilter, itemPage, query, refreshVersion]);

  useEffect(() => {
    const syncMenuSection = () => setActiveSection(getSectionFromHash());

    syncMenuSection();
    window.addEventListener("hashchange", syncMenuSection);
    window.addEventListener("popstate", syncMenuSection);

    return () => {
      window.removeEventListener("hashchange", syncMenuSection);
      window.removeEventListener("popstate", syncMenuSection);
    };
  }, []);

  const filteredCategories = useMemo(() => {
    const search = categoryQuery.trim().toLowerCase();
    if (!search) return categories;

    return categories.filter((category) => (
      category.title.toLowerCase().includes(search)
      || category.slug?.toLowerCase().includes(search)
    ));
  }, [categories, categoryQuery]);

  const handleSaveCategory = async (form, category) => {
    setSaving(true);
    try {
      const data = await fetch(
        category ? `/api/admin/menu/categories/${category.id}` : "/api/admin/menu/categories",
        {
          method: category ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      ).then(readApi);

      setCategories((prev) => (
        category
          ? prev.map((entry) => (entry.id === data.id ? data : entry))
          : [...prev, data].sort((a, b) => a.title.localeCompare(b.title))
      ));
      setRefreshVersion((value) => value + 1);
      setModal(null);
      showToast(category ? "Category updated." : "Category created.");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (category) => {
    setSaving(true);
    try {
      await fetch(`/api/admin/menu/categories/${category.id}`, { method: "DELETE" }).then(readApi);
      setCategories((prev) => prev.filter((entry) => entry.id !== category.id));
      setModal(null);
      showToast("Category deleted.");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveItem = async (form, item, imageFile) => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: form.pricingMode === "single" ? Number(form.price) : 0,
        variants: form.pricingMode === "variants"
          ? form.variants.map(({ label, price, isActive = true }) => ({ label, price, isActive }))
          : [],
        deliverable: true,
        isFeatured: false,
      };
      const requestBody = new FormData();
      requestBody.append("payload", JSON.stringify(payload));
      if (imageFile) requestBody.append("image", imageFile);

      const data = await fetch(item ? `/api/admin/menu/items/${item.id}` : "/api/admin/menu/items", {
        method: item ? "PATCH" : "POST",
        body: requestBody,
      }).then(readApi);

      setItems((prev) => (
        item
          ? prev.map((entry) => (entry.id === data.id ? data : entry))
          : [data, ...prev]
      ));
      setModal(null);
      showToast(item ? "Item updated." : "Item created.");
      if (!item) setItemPage(1);
      loadMenuData();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (item) => {
    setSaving(true);
    try {
      await fetch(`/api/admin/menu/items/${item.id}`, { method: "DELETE" }).then(readApi);
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
      setModal(null);
      showToast("Item deleted.");
      loadMenuData();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      active="menu"
      menuSection={activeSection}
      onMenuSectionChange={setActiveSection}
      eyebrow="Menu manager"
      title="Menu"
      description="Manage dishes, prices, availability, and categories."
      action={
        <Button onClick={() => setModal({ type: "item" })}>
          <Plus className="size-4" />
          New item
        </Button>
      }
    >
      <AdminToast
        key={toast?.id}
        message={toast?.message}
        tone={toast?.tone}
        onDismiss={() => setToast(null)}
      />

      <div className="space-y-5">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Menu summary">
          <StatCard label="Menu items" value={menuSummary.total} detail="Stored in the menu database" icon={Utensils} />
          <StatCard label="Available items" value={menuSummary.available} detail={`${menuSummary.total - menuSummary.available} unavailable`} icon={Check} />
          <StatCard label="Categories" value={categories.length} detail="No description fields needed" icon={ImageIcon} />
        </section>

        {activeSection === "items" ? (
          <Card id="items" className="border-[#E4DAC9] bg-white">
            <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="font-display text-xl">Items</CardTitle>
                <CardDescription>Add, edit, mark unavailable, or remove dishes from the database.</CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#756D62]" />
                  <input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setItemPage(1);
                    }}
                    className="h-9 w-full rounded-md border border-[#E4DAC9] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#8B1E1E] sm:w-64"
                    placeholder="Search items"
                  />
                </div>
                <div className="min-w-0 sm:w-52">
                  <FormSelect
                    value={categoryFilter}
                    placeholder="All categories"
                    options={[
                      { value: "all", label: "All categories" },
                      ...categories.map((category) => ({ value: category.id, label: category.title })),
                    ]}
                    onChange={(value) => {
                      setCategoryFilter(value);
                      setItemPage(1);
                    }}
                    searchable
                  />
                </div>
                <Button variant="outline" onClick={loadMenuData} disabled={loading}>
                  <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <MenuItemsTableSkeleton rows={ITEM_PAGE_SIZE} />
              ) : items.length ? (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[820px] text-left text-sm">
                    <thead className="border-b border-[#E4DAC9] text-xs uppercase text-[#756D62]">
                      <tr>
                        <th className="px-3 py-3 font-semibold">Item</th>
                        <th className="px-3 py-3 font-semibold">Category</th>
                        <th className="px-3 py-3 font-semibold">Price</th>
                        <th className="px-3 py-3 font-semibold">Status</th>
                        <th className="px-3 py-3 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EFE7DA]">
                      {items.map((item) => {
                        const availability = getItemAvailability(item);
                        return (
                          <tr
                            key={item.id}
                            className={`align-top transition-colors ${
                              availability.available
                                ? "bg-emerald-50/35 hover:bg-emerald-50/70"
                                : "bg-red-50/70 hover:bg-red-50"
                            }`}
                          >
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#E4DAC9] bg-[#FDFAF4]">
                                {item.image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={item.image}
                                    alt={item.name}
                                    className="size-full object-cover"
                                  />
                                ) : (
                                  <ImageIcon className="size-6 text-[#A89E91]" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-[#2B2B2B]">{item.name}</div>
                                <div className="mt-1 max-w-md truncate text-xs text-[#756D62]">
                                  {item.description || item.slug}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-[#756D62]">{item.categoryTitle || "Uncategorized"}</td>
                          <td className="px-3 py-4 font-semibold">
                            <span className="block tabular-nums">{formatItemPrice(item)}</span>
                            {item.variants?.length ? (
                              <span className="mt-1 block text-xs font-normal text-[#756D62]">
                                {item.variants.map((variant) => variant.label).join(" / ")}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              <Badge variant={availability.available ? "success" : "secondary"}>
                                {availability.available ? "Available" : "Unavailable"}
                              </Badge>
                              {item.isSpicy ? <Badge variant="destructive">Spicy</Badge> : null}
                            </div>
                            {!availability.available ? <p className="mt-1.5 text-xs font-medium text-red-700">{availability.reason}</p> : null}
                          </td>
                          <td className="px-3 py-4">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => setModal({ type: "item", item })}>
                                <Edit3 className="size-4" />
                                Edit
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => setModal({ type: "delete-item", item })}>
                                <Trash2 className="size-4" />
                                Delete
                              </Button>
                            </div>
                          </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    </table>
                  </div>
                  <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E4DAC9] pt-4 sm:flex-row">
                    <p className="text-xs text-[#756D62]">
                      Showing {(itemPagination.page - 1) * itemPagination.pageSize + 1}-{Math.min(itemPagination.page * itemPagination.pageSize, itemPagination.total)} of {itemPagination.total} items
                    </p>
                    <PaginationControls
                      page={itemPagination.page}
                      totalPages={itemPagination.totalPages}
                      onPageChange={setItemPage}
                    />
                  </div>
                </div>
              ) : (
                <EmptyState title="No items found." actionLabel="Create item" onAction={() => setModal({ type: "item" })} />
              )}
            </CardContent>
          </Card>
        ) : null}

        {activeSection === "categories" ? (
          <Card id="categories" className="border-[#E4DAC9] bg-white">
            <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="font-display text-xl">Categories</CardTitle>
                <CardDescription>Manage each category and its availability status.</CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#756D62]" />
                  <input
                    value={categoryQuery}
                    onChange={(event) => setCategoryQuery(event.target.value)}
                    className="h-9 w-full rounded-md border border-[#E4DAC9] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#8B1E1E] sm:w-56"
                    placeholder="Search categories"
                  />
                </div>
                <Button variant="outline" onClick={() => setModal({ type: "category" })}>
                  <Plus className="size-4" />
                  Add category
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredCategories.map((category) => (
                <ManagerRow
                  key={category.id}
                  title={category.title}
                  subtitle={`${category.count || 0} items`}
                  badge={category.isActive ? "Available" : "Unavailable"}
                  badgeVariant={category.isActive ? "success" : "secondary"}
                  onEdit={() => setModal({ type: "category", category })}
                  onDelete={() => setModal({ type: "delete-category", category })}
                />
              ))}
              {!filteredCategories.length ? (
                <EmptyState
                  title={categories.length ? "No categories match your search." : "No categories yet."}
                  actionLabel={categories.length ? undefined : "Create category"}
                  onAction={categories.length ? undefined : () => setModal({ type: "category" })}
                />
              ) : null}
            </CardContent>
          </Card>
        ) : null}

      </div>

      {modal?.type === "item" ? (
        <Modal title={modal.item ? "Edit item" : "Add item"} onClose={() => setModal(null)}>
          <ItemForm
            item={modal.item}
            categories={categories}
            saving={saving}
            onCancel={() => setModal(null)}
            onSave={(form, imageFile) => handleSaveItem(form, modal.item, imageFile)}
          />
        </Modal>
      ) : null}

      {modal?.type === "category" ? (
        <Modal title={modal.category ? "Edit category" : "Add category"} onClose={() => setModal(null)}>
          <CategoryForm
            category={modal.category}
            saving={saving}
            onCancel={() => setModal(null)}
            onSave={(form) => handleSaveCategory(form, modal.category)}
          />
        </Modal>
      ) : null}

      {modal?.type === "delete-item" ? (
        <ConfirmDelete
          title="Delete item?"
          name={modal.item.name}
          disabled={modal.item.orderCount > 0}
          message={
            modal.item.orderCount > 0
              ? "This item already has orders. Hide it instead of deleting."
              : "This removes the item from the menu database."
          }
          saving={saving}
          onCancel={() => setModal(null)}
          onConfirm={() => handleDeleteItem(modal.item)}
        />
      ) : null}

      {modal?.type === "delete-category" ? (
        <ConfirmDelete
          title="Delete category?"
          name={modal.category.title}
          disabled={modal.category.count > 0}
          message={
            modal.category.count > 0
              ? "Move or delete items in this category first."
              : "This removes the category from the database."
          }
          saving={saving}
          onCancel={() => setModal(null)}
          onConfirm={() => handleDeleteCategory(modal.category)}
        />
      ) : null}

    </AdminShell>
  );
}

function StatCard({ label, value, detail, icon: Icon }) {
  return (
    <Card className="border-[#E4DAC9] bg-white">
      <CardHeader className="flex-row items-start justify-between pb-2">
        <div>
          <CardDescription>{label}</CardDescription>
          <CardTitle className="mt-2 font-display text-3xl">{value}</CardTitle>
        </div>
        <div className="flex size-10 items-center justify-center rounded-lg bg-[#F6F1E8] text-[#8B1E1E]">
          <Icon className="size-5" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[#756D62]">{detail}</p>
      </CardContent>
    </Card>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E4DAC9] px-5 py-4">
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-md text-[#756D62] hover:bg-[#F6F1E8] hover:text-[#2B2B2B]"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[78vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function ItemForm({ item, categories, saving, onCancel, onSave }) {
  const previewObjectUrlRef = useRef("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(item?.image || "");
  const [imageError, setImageError] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [priceError, setPriceError] = useState("");
  const [form, setForm] = useState(() => ({
    ...emptyItemForm,
    ...item,
    price: item?.price === undefined ? "" : String(item.price),
    pricingMode: item?.variants?.length ? "variants" : "single",
    variants: (item?.variants || []).map((variant, index) => ({
      ...variant,
      price: String(variant.price),
      clientId: variant.id || `saved-${index}`,
    })),
  }));

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const setPricingMode = (pricingMode) => {
    setForm((prev) => ({
      ...prev,
      pricingMode,
      variants: pricingMode === "variants" && prev.variants.length < 2
        ? [
            { clientId: `new-${Date.now()}-1`, label: "", price: "", isActive: true },
            { clientId: `new-${Date.now()}-2`, label: "", price: "", isActive: true },
          ]
        : prev.variants,
    }));
  };

  const updateVariant = (clientId, key, value) => {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((variant) => (
        variant.clientId === clientId ? { ...variant, [key]: value } : variant
      )),
    }));
  };

  const addVariant = () => {
    setForm((prev) => prev.variants.length >= 10 ? prev : ({
      ...prev,
      variants: [...prev.variants, {
        clientId: `new-${Date.now()}-${prev.variants.length}`,
        label: "",
        price: "",
        isActive: true,
      }],
    }));
  };

  const removeVariant = (clientId) => {
    setForm((prev) => prev.variants.length <= 2 ? prev : ({
      ...prev,
      variants: prev.variants.filter((variant) => variant.clientId !== clientId),
    }));
  };

  const applyFirstChoicePrice = () => {
    setForm((prev) => {
      const sharedPrice = prev.variants.find((variant) => isValidEuroPrice(variant.price))?.price;
      if (!sharedPrice) return prev;
      return {
        ...prev,
        variants: prev.variants.map((variant) => ({ ...variant, price: sharedPrice })),
      };
    });
    setPriceError("");
  };

  useEffect(() => () => {
    if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current);
  }, []);

  const selectImage = (file) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setImageError("Only JPG, PNG, or WEBP images are allowed.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setImageError("Image must be 3MB or smaller.");
      return;
    }

    if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current);
    const previewUrl = URL.createObjectURL(file);
    previewObjectUrlRef.current = previewUrl;
    setImageFile(file);
    setImagePreview(previewUrl);
    setImageError("");
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!form.categoryId) {
          setCategoryError("Select a category.");
          return;
        }
        const prices = form.pricingMode === "variants" ? form.variants.map((variant) => variant.price) : [form.price];
        if (prices.some((price) => !isValidEuroPrice(price))) {
          setPriceError("Enter a price from EUR 0.01 to EUR 10,000.00.");
          return;
        }
        onSave(form, imageFile);
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Dish name" required>
          <input className={inputClass} value={form.name} onChange={(event) => update("name", event.target.value)} required />
        </Field>
        <Field label="Pricing" required>
          <div className="grid grid-cols-2 rounded-md border border-[#E4DAC9] bg-[#F6F1E8] p-1">
            <button type="button" onClick={() => setPricingMode("single")} className={`rounded px-3 py-1.5 text-sm font-semibold ${form.pricingMode === "single" ? "bg-white text-[#8B1E1E] shadow-sm" : "text-[#756D62]"}`}>Single price</button>
            <button type="button" onClick={() => setPricingMode("variants")} className={`rounded px-3 py-1.5 text-sm font-semibold ${form.pricingMode === "variants" ? "bg-white text-[#8B1E1E] shadow-sm" : "text-[#756D62]"}`}>Has choices</button>
          </div>
        </Field>
        {form.pricingMode === "single" ? (
          <Field label="Price (EUR)" required>
            <EuroInput value={form.price} onChange={(value) => { update("price", value); setPriceError(""); }} ariaLabel="Price in euro" error={priceError} required />
            {priceError ? <p className="text-xs font-medium text-red-700">{priceError}</p> : null}
          </Field>
        ) : (
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-sm font-medium text-[#2B2B2B]">Dish choices <RequiredMark /></span>
                <p className="mt-0.5 text-xs text-[#756D62]">Customers must choose one before adding the dish.</p>
              </div>
              <div className="flex flex-wrap justify-end gap-3">
                <button type="button" onClick={applyFirstChoicePrice} className="text-xs font-semibold text-[#756D62] hover:text-[#8B1E1E]">Same price for all</button>
                <button type="button" onClick={addVariant} disabled={form.variants.length >= 10} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8B1E1E] disabled:opacity-40">
                  <Plus className="size-4" /> Add choice
                </button>
              </div>
            </div>
            {form.variants.map((variant, index) => (
              <div key={variant.clientId} className={`grid grid-cols-[minmax(0,1fr)_36px] gap-2 rounded-md border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(110px,0.65fr)_auto_36px] sm:items-center ${variant.isActive === false ? "border-[#E4DAC9] bg-[#F4F0E9] opacity-70" : "border-[#E4DAC9] bg-[#FDFAF4]"}`}>
                <input className={inputClass} value={variant.label} maxLength={60} onChange={(event) => updateVariant(variant.clientId, "label", event.target.value)} placeholder={`Choice ${index + 1}, e.g. Chicken`} aria-label={`Dish choice ${index + 1} label`} required />
                <EuroInput className="col-start-1 row-start-2 sm:col-start-2 sm:row-start-1" value={variant.price} onChange={(value) => { updateVariant(variant.clientId, "price", value); setPriceError(""); }} ariaLabel={`Dish choice ${index + 1} price in euro`} error={priceError} required />
                <label className="col-start-1 row-start-3 inline-flex min-h-9 cursor-pointer items-center gap-2 text-xs font-semibold text-[#4F493F] sm:col-start-3 sm:row-start-1">
                  <input type="checkbox" checked={variant.isActive !== false} onChange={(event) => updateVariant(variant.clientId, "isActive", event.target.checked)} className="size-4 accent-[#8B1E1E]" />
                  Available
                </label>
                <button type="button" onClick={() => removeVariant(variant.clientId)} disabled={form.variants.length <= 2} className="col-start-2 row-span-3 row-start-1 inline-flex size-9 items-center justify-center self-center rounded-md border border-[#E4DAC9] text-[#8B1E1E] disabled:cursor-not-allowed disabled:opacity-30 sm:col-start-4 sm:row-span-1" aria-label={`Remove dish choice ${index + 1}`}>
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            {priceError ? <p className="text-xs font-medium text-red-700">{priceError}</p> : null}
            <p className="text-xs text-[#756D62]">Use 2 to 10 choices such as Chicken / Pork / Duck / Prawn or Small / Large.</p>
          </div>
        )}
        <div className="space-y-1.5 text-sm font-medium text-[#2B2B2B]">
          <span>Category <RequiredMark /></span>
          <FormSelect
            value={form.categoryId}
            placeholder="Select category"
            options={categories.map((category) => ({ value: category.id, label: category.title }))}
            onChange={(value) => {
              update("categoryId", value);
              setCategoryError("");
            }}
            searchable
            error={categoryError}
          />
          {categoryError ? <p className="text-xs font-medium text-red-700">{categoryError}</p> : null}
        </div>
        <div className="space-y-1.5 text-sm font-medium text-[#2B2B2B] md:col-span-2">
          <span>Dish photo</span>
          <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-[#E4DAC9] bg-[#FDFAF4]">
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt={form.name || "Dish preview"} className="size-full object-cover" />
              ) : (
                <ImageIcon className="size-8 text-[#A89E91]" />
              )}
            </div>
            <div className="flex flex-col justify-center gap-2">
              <label className="inline-flex h-9 w-fit cursor-pointer items-center justify-center gap-2 rounded-md border border-[#E4DAC9] bg-white px-3 text-sm font-semibold text-[#2B2B2B] shadow-xs hover:bg-[#F6F1E8]">
                <Upload className="size-4" />
                Choose image
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={saving}
                  onChange={(event) => {
                    selectImage(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
              <p className="text-xs text-[#756D62]">JPG, PNG, or WEBP, up to 3MB.</p>
              {imageError ? <p className="text-xs font-medium text-red-700">{imageError}</p> : null}
            </div>
          </div>
        </div>
      </div>
      <Field label="Description">
        <textarea className={`${inputClass} min-h-24 resize-y`} value={form.description || ""} onChange={(event) => update("description", event.target.value)} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Toggle label="Available" checked={form.isActive} onChange={(value) => update("isActive", value)} />
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-[#E4DAC9] bg-[#FDFAF4] px-3 py-2.5">
          <input
            type="checkbox"
            checked={Boolean(form.isSpicy)}
            onChange={(event) => update("isSpicy", event.target.checked)}
            className="size-4 shrink-0 accent-[#9D2023]"
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-[#2B2B2B]">Spicy dish</span>
            <span className="block text-xs text-[#756D62]">Show a spicy marker to customers.</span>
          </span>
        </label>
      </div>
      <FormActions saving={saving} submitLabel={item ? "Save item" : "Create item"} onCancel={onCancel} />
    </form>
  );
}

function CategoryForm({ category, saving, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({ ...emptyCategoryForm, ...category }));

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(form);
      }}
    >
      <Field label="Category title">
        <input
          className={inputClass}
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          required
        />
      </Field>
      <Toggle
        label="Available"
        checked={form.isActive}
        onChange={(value) => setForm((prev) => ({ ...prev, isActive: value }))}
      />
      <FormActions saving={saving} submitLabel={category ? "Save category" : "Create category"} onCancel={onCancel} />
    </form>
  );
}

function ConfirmDelete({ title, name, message, disabled = false, saving, onCancel, onConfirm }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="space-y-5">
        <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">{name}</p>
            <p className="mt-1 text-sm">{message}</p>
          </div>
        </div>
        <FormActions
          disabled={disabled}
          saving={saving}
          submitLabel="Delete"
          onCancel={onCancel}
          onSubmit={onConfirm}
          destructive
        />
      </div>
    </Modal>
  );
}

function FormSelect({ value, placeholder, options, onChange, searchable = false, error = "" }) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = options.find((option) => option.value === value);
  const normalizedSearch = search.trim().toLowerCase();
  const visibleOptions = normalizedSearch
    ? options.filter((option) => option.label.toLowerCase().includes(normalizedSearch))
    : options;

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsidePress = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          if (open) setSearch("");
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex h-10 w-full items-center justify-between gap-3 rounded-md border bg-white px-3 text-left text-sm font-normal outline-none transition-colors focus:ring-2 focus:ring-[#8B1E1E]/10 ${
          error ? "border-red-600 focus:border-red-600" : "border-[#E4DAC9] focus:border-[#8B1E1E]"
        }`}
      >
        <span className={`min-w-0 truncate ${selected ? "text-[#2B2B2B]" : "text-[#A89E91]"}`}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown className={`size-4 shrink-0 text-[#756D62] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-[#E4DAC9] bg-white shadow-lg">
          {searchable ? (
            <div className="border-b border-[#EFE7DA] p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#756D62]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-9 w-full rounded-md border border-[#E4DAC9] bg-[#FDFAF4] pl-8 pr-3 text-sm font-normal outline-none focus:border-[#8B1E1E]"
                  placeholder="Search categories"
                  aria-label="Search categories"
                />
              </div>
            </div>
          ) : null}
          <div className="max-h-52 overflow-y-auto p-1" role="listbox">
            {visibleOptions.length ? visibleOptions.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value || "empty"}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`flex min-h-10 w-full items-center justify-between gap-3 rounded px-3 py-2 text-left text-sm font-normal ${
                    isSelected ? "bg-[#F6F1E8] font-semibold text-[#8B1E1E]" : "text-[#2B2B2B] active:bg-[#F6F1E8]"
                  }`}
                >
                  <span>{option.label}</span>
                  {isSelected ? <Check className="size-4 shrink-0" /> : null}
                </button>
              );
            }) : (
              <p className="px-3 py-4 text-center text-xs font-normal text-[#756D62]">No categories found.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EuroInput({ value, onChange, ariaLabel, className = "", error = "", required = false }) {
  const [focused, setFocused] = useState(false);
  const numericValue = Number(value);
  const displayValue = focused || value === "" || value === null || value === undefined
    ? String(value ?? "")
    : Number.isFinite(numericValue) ? euroInputFormatter.format(numericValue) : String(value);

  return (
    <div className={`relative ${className}`}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-[#756D62]" aria-hidden="true">€</span>
      <input
        className={`${inputClass} pl-8 font-medium tabular-nums ${error ? "border-red-600 focus:border-red-600" : ""}`}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        maxLength={12}
        value={displayValue}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          if (isValidEuroPrice(value)) onChange(Number(value).toFixed(2));
        }}
        onChange={(event) => onChange(sanitizeEuroInput(event.target.value))}
        aria-label={ariaLabel}
        required={required}
      />
    </div>
  );
}

function RequiredMark() {
  return <span className="font-semibold text-red-700" aria-hidden="true">*</span>;
}

function Field({ label, children, required = false }) {
  return (
    <label className="block space-y-1.5 text-sm font-medium text-[#2B2B2B]">
      <span>{label}{required ? <> <RequiredMark /></> : null}</span>
      {children}
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  const Icon = checked ? Eye : EyeOff;

  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-semibold ${
        checked
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-[#E4DAC9] bg-white text-[#756D62]"
      }`}
    >
      <span>{label}</span>
      <Icon className="size-4" />
    </button>
  );
}

function FormActions({ disabled = false, saving, submitLabel, onCancel, onSubmit, destructive = false }) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-[#E4DAC9] pt-4 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      <Button
        type={onSubmit ? "button" : "submit"}
        variant={destructive ? "destructive" : "default"}
        disabled={disabled || saving}
        onClick={onSubmit}
      >
        {saving ? "Saving..." : submitLabel}
      </Button>
    </div>
  );
}

function ManagerRow({ title, subtitle, badge, badgeVariant, onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#E4DAC9] p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{title}</p>
        <p className="truncate text-sm text-[#756D62]">{subtitle}</p>
      </div>
      <Badge variant={badgeVariant}>{badge}</Badge>
      <Button variant="outline" size="icon-sm" onClick={onEdit} aria-label={`Edit ${title}`}>
        <Edit3 className="size-4" />
      </Button>
      <Button variant="destructive" size="icon-sm" onClick={onDelete} aria-label={`Delete ${title}`}>
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

function EmptyState({ title, actionLabel, onAction }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center rounded-lg border border-dashed border-[#E4DAC9] bg-[#FDFAF4] p-6 text-center">
      <p className="font-semibold text-[#2B2B2B]">{title}</p>
      {actionLabel ? (
        <Button className="mt-3" onClick={onAction}>
          <Plus className="size-4" />
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

function MenuItemsTableSkeleton({ rows = 10 }) {
  return (
    <div className="overflow-x-auto" role="status" aria-label="Loading menu items">
      <div className="min-w-[820px] animate-pulse" aria-hidden="true">
        <div className="grid grid-cols-[2.2fr_1fr_1fr_0.8fr_1.4fr] gap-4 border-b border-[#E4DAC9] px-3 py-3">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="h-3 rounded bg-[#E8DFC8]" />
          ))}
        </div>
        <div className="divide-y divide-[#EFE7DA]">
          {Array.from({ length: rows }, (_, row) => (
            <div key={row} className="grid min-h-[88px] grid-cols-[2.2fr_1fr_1fr_0.8fr_1.4fr] items-center gap-4 px-3 py-4">
              <div className="flex items-center gap-3">
                <div className="size-14 shrink-0 rounded-lg bg-[#E8DFC8]" />
                <div className="w-full space-y-2">
                  <div className="h-4 w-2/3 rounded bg-[#E8DFC8]" />
                  <div className="h-3 w-4/5 rounded bg-[#F0E8DC]" />
                </div>
              </div>
              <div className="h-4 w-3/4 rounded bg-[#F0E8DC]" />
              <div className="h-4 w-20 rounded bg-[#E8DFC8]" />
              <div className="h-6 w-20 rounded bg-[#E6F2EA]" />
              <div className="flex justify-end gap-2">
                <div className="h-9 w-20 rounded-md bg-[#F0E8DC]" />
                <div className="h-9 w-20 rounded-md bg-[#F4DDDA]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
