"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Edit3,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  Upload,
  Utensils,
  X,
} from "lucide-react";

import AdminShell from "@/app/admin/_components/AdminShell";
import AdminToast from "@/app/admin/_components/AdminToast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const emptyCategoryForm = {
  title: "",
  isActive: true,
};

const emptyTagForm = {
  label: "",
  description: "",
};

const emptyItemForm = {
  name: "",
  description: "",
  price: "",
  image: "",
  categoryId: "",
  tagId: "",
  isActive: true,
};

const inputClass =
  "w-full rounded-md border border-[#E4DAC9] bg-white px-3 py-2 text-sm text-[#2B2B2B] outline-none transition-colors placeholder:text-[#A89E91] focus:border-[#8B1E1E] focus:ring-2 focus:ring-[#8B1E1E]/10";

const menuSections = new Set(["items", "categories", "tags"]);

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
  return Promise.all([
    fetch("/api/admin/menu/items").then(readApi),
    fetch("/api/admin/menu/categories").then(readApi),
    fetch("/api/admin/menu/tags").then(readApi),
  ]);
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-CY", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

export default function AdminMenuPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [tagQuery, setTagQuery] = useState("");
  const [activeSection, setActiveSection] = useState("items");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const toastIdRef = useRef(0);

  const showToast = (message, tone = "success") => {
    toastIdRef.current += 1;
    setToast({ message, tone, id: toastIdRef.current });
  };

  const loadMenuData = async () => {
    setLoading(true);
    try {
      const [nextItems, nextCategories, nextTags] = await fetchMenuData();
      setItems(nextItems);
      setCategories(nextCategories);
      setTags(nextTags);
    } catch (error) {
      showToast(error.message || "Could not load menu data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    fetchMenuData()
      .then(([nextItems, nextCategories, nextTags]) => {
        if (!active) return;
        setItems(nextItems);
        setCategories(nextCategories);
        setTags(nextTags);
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
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

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

  const filteredItems = useMemo(() => {
    const search = query.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch = !search
        || item.name.toLowerCase().includes(search)
        || item.categoryTitle?.toLowerCase().includes(search)
        || item.tagLabel?.toLowerCase().includes(search);
      const matchesCategory = categoryFilter === "all" || item.categoryId === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [categoryFilter, items, query]);

  const filteredCategories = useMemo(() => {
    const search = categoryQuery.trim().toLowerCase();
    if (!search) return categories;

    return categories.filter((category) => (
      category.title.toLowerCase().includes(search)
      || category.slug?.toLowerCase().includes(search)
    ));
  }, [categories, categoryQuery]);

  const filteredTags = useMemo(() => {
    const search = tagQuery.trim().toLowerCase();
    if (!search) return tags;

    return tags.filter((tag) => (
      tag.label.toLowerCase().includes(search)
      || tag.description?.toLowerCase().includes(search)
    ));
  }, [tagQuery, tags]);

  const availableCount = items.filter((item) => item.isActive).length;

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

  const handleSaveTag = async (form, tag) => {
    setSaving(true);
    try {
      const data = await fetch(tag ? `/api/admin/menu/tags/${tag.id}` : "/api/admin/menu/tags", {
        method: tag ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }).then(readApi);

      setTags((prev) => (
        tag
          ? prev.map((entry) => (entry.id === data.id ? data : entry))
          : [...prev, data].sort((a, b) => a.label.localeCompare(b.label))
      ));
      setItems((prev) => prev.map((item) => (
        item.tagId === data.id ? { ...item, tagLabel: data.label } : item
      )));
      setModal(null);
      showToast(tag ? "Tag updated." : "Tag created.");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTag = async (tag) => {
    setSaving(true);
    try {
      await fetch(`/api/admin/menu/tags/${tag.id}`, { method: "DELETE" }).then(readApi);
      setTags((prev) => prev.filter((entry) => entry.id !== tag.id));
      setItems((prev) => prev.map((item) => (
        item.tagId === tag.id ? { ...item, tagId: null, tagLabel: null } : item
      )));
      setModal(null);
      showToast("Tag deleted.");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveItem = async (form, item) => {
    setSaving(true);
    try {
      const data = await fetch(item ? `/api/admin/menu/items/${item.id}` : "/api/admin/menu/items", {
        method: item ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          tagId: form.tagId || null,
          deliverable: true,
          isFeatured: false,
        }),
      }).then(readApi);

      setItems((prev) => (
        item
          ? prev.map((entry) => (entry.id === data.id ? data : entry))
          : [data, ...prev]
      ));
      setModal(null);
      showToast(item ? "Item updated." : "Item created.");
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
      description="Manage dishes, delivery visibility, categories, and customer-facing menu tags."
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
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Menu summary">
          <StatCard label="Menu items" value={items.length} detail="Stored in the menu database" icon={Utensils} />
          <StatCard label="Available items" value={availableCount} detail={`${items.length - availableCount} unavailable`} icon={Check} />
          <StatCard label="Categories" value={categories.length} detail="No description fields needed" icon={ImageIcon} />
          <StatCard label="Tags" value={tags.length} detail="Selectable on menu items" icon={Tag} />
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
                    onChange={(event) => setQuery(event.target.value)}
                    className="h-9 w-full rounded-md border border-[#E4DAC9] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#8B1E1E] sm:w-64"
                    placeholder="Search items"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="h-9 rounded-md border border-[#E4DAC9] bg-white px-3 text-sm outline-none focus:border-[#8B1E1E]"
                >
                  <option value="all">All categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.title}</option>
                  ))}
                </select>
                <Button variant="outline" onClick={loadMenuData} disabled={loading}>
                  <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <EmptyState title="Loading menu items..." />
              ) : filteredItems.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[940px] text-left text-sm">
                    <thead className="border-b border-[#E4DAC9] text-xs uppercase text-[#756D62]">
                      <tr>
                        <th className="px-3 py-3 font-semibold">Item</th>
                        <th className="px-3 py-3 font-semibold">Category</th>
                        <th className="px-3 py-3 font-semibold">Tag</th>
                        <th className="px-3 py-3 font-semibold">Price</th>
                        <th className="px-3 py-3 font-semibold">Status</th>
                        <th className="px-3 py-3 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EFE7DA]">
                      {filteredItems.map((item) => (
                        <tr
                          key={item.id}
                          className={`align-top transition-colors ${
                            item.isActive
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
                          <td className="px-3 py-4">
                            {item.tagLabel ? <Badge variant="warning">{item.tagLabel}</Badge> : <span className="text-[#756D62]">-</span>}
                          </td>
                          <td className="px-3 py-4 font-semibold">{formatMoney(item.price)}</td>
                          <td className="px-3 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              <Badge variant={item.isActive ? "success" : "secondary"}>
                                {item.isActive ? "Available" : "Unavailable"}
                              </Badge>
                            </div>
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
                      ))}
                    </tbody>
                  </table>
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

        {activeSection === "tags" ? (
          <Card id="tags" className="border-[#E4DAC9] bg-white">
            <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="font-display text-xl">Tags</CardTitle>
                <CardDescription>Create labels, then select them when adding an item.</CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#756D62]" />
                  <input
                    value={tagQuery}
                    onChange={(event) => setTagQuery(event.target.value)}
                    className="h-9 w-full rounded-md border border-[#E4DAC9] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#8B1E1E] sm:w-56"
                    placeholder="Search tags"
                  />
                </div>
                <Button variant="outline" onClick={() => setModal({ type: "tag" })}>
                  <Plus className="size-4" />
                  Add tag
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredTags.map((tag) => (
                <ManagerRow
                  key={tag.id}
                  title={tag.label}
                  subtitle={tag.description || `${tag.count || 0} items`}
                  badge={`${tag.count || 0} items`}
                  badgeVariant="warning"
                  onEdit={() => setModal({ type: "tag", tag })}
                  onDelete={() => setModal({ type: "delete-tag", tag })}
                />
              ))}
              {!filteredTags.length ? (
                <EmptyState
                  title={tags.length ? "No tags match your search." : "No tags yet."}
                  actionLabel={tags.length ? undefined : "Create tag"}
                  onAction={tags.length ? undefined : () => setModal({ type: "tag" })}
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
            tags={tags}
            saving={saving}
            onCancel={() => setModal(null)}
            onSave={(form) => handleSaveItem(form, modal.item)}
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

      {modal?.type === "tag" ? (
        <Modal title={modal.tag ? "Edit tag" : "Add tag"} onClose={() => setModal(null)}>
          <TagForm
            tag={modal.tag}
            saving={saving}
            onCancel={() => setModal(null)}
            onSave={(form) => handleSaveTag(form, modal.tag)}
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

      {modal?.type === "delete-tag" ? (
        <ConfirmDelete
          title="Delete tag?"
          name={modal.tag.label}
          message="Items using this tag will keep working and lose the tag."
          saving={saving}
          onCancel={() => setModal(null)}
          onConfirm={() => handleDeleteTag(modal.tag)}
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

function ItemForm({ item, categories, tags, saving, onCancel, onSave }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [form, setForm] = useState(() => ({
    ...emptyItemForm,
    ...item,
    price: item?.price === undefined ? "" : String(item.price),
    tagId: item?.tagId || "",
  }));

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const uploadImage = async (file) => {
    if (!file) return;

    setUploading(true);
    setUploadError("");

    const body = new FormData();
    body.append("file", file);

    try {
      const data = await fetch("/api/admin/menu/uploads", {
        method: "POST",
        body,
      }).then(readApi);

      update("image", data.url);
    } catch (error) {
      setUploadError(error.message || "Could not upload image.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(form);
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Dish name">
          <input className={inputClass} value={form.name} onChange={(event) => update("name", event.target.value)} required />
        </Field>
        <Field label="Price">
          <input className={inputClass} type="number" min="0" step="0.01" value={form.price} onChange={(event) => update("price", event.target.value)} required />
        </Field>
        <Field label="Category">
          <select className={inputClass} value={form.categoryId} onChange={(event) => update("categoryId", event.target.value)} required>
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.title}</option>
            ))}
          </select>
        </Field>
        <Field label="Tag">
          <select className={inputClass} value={form.tagId || ""} onChange={(event) => update("tagId", event.target.value)}>
            <option value="">No tag</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>{tag.label}</option>
            ))}
          </select>
        </Field>
        <div className="space-y-1.5 text-sm font-medium text-[#2B2B2B] md:col-span-2">
          <span>Dish photo</span>
          <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-[#E4DAC9] bg-[#FDFAF4]">
              {form.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.image} alt={form.name || "Dish preview"} className="size-full object-cover" />
              ) : (
                <ImageIcon className="size-8 text-[#A89E91]" />
              )}
            </div>
            <div className="flex flex-col justify-center gap-2">
              <label className="inline-flex h-9 w-fit cursor-pointer items-center justify-center gap-2 rounded-md border border-[#E4DAC9] bg-white px-3 text-sm font-semibold text-[#2B2B2B] shadow-xs hover:bg-[#F6F1E8]">
                <Upload className={`size-4 ${uploading ? "animate-pulse" : ""}`} />
                {uploading ? "Uploading..." : "Upload image"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(event) => uploadImage(event.target.files?.[0])}
                />
              </label>
              <p className="text-xs text-[#756D62]">JPG, PNG, or WEBP, up to 3MB.</p>
              {uploadError ? <p className="text-xs font-medium text-red-700">{uploadError}</p> : null}
            </div>
          </div>
        </div>
      </div>
      <Field label="Description">
        <textarea className={`${inputClass} min-h-24 resize-y`} value={form.description || ""} onChange={(event) => update("description", event.target.value)} />
      </Field>
      <div className="max-w-xs">
        <Toggle label="Available" checked={form.isActive} onChange={(value) => update("isActive", value)} />
      </div>
      <FormActions saving={saving || uploading} submitLabel={item ? "Save item" : "Create item"} onCancel={onCancel} />
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

function TagForm({ tag, saving, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({ ...emptyTagForm, ...tag }));

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(form);
      }}
    >
      <Field label="Tag label">
        <input
          className={inputClass}
          value={form.label}
          onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
          required
        />
      </Field>
      <Field label="Description">
        <textarea
          className={`${inputClass} min-h-20 resize-y`}
          value={form.description || ""}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
        />
      </Field>
      <FormActions saving={saving} submitLabel={tag ? "Save tag" : "Create tag"} onCancel={onCancel} />
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

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5 text-sm font-medium text-[#2B2B2B]">
      <span>{label}</span>
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
