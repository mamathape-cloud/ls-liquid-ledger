"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { categorySchema } from "@/lib/validators";
import { z } from "zod";
import { DataTable } from "@/components/DataTable";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type CategoryForm = z.infer<typeof categorySchema>;

export default function AdminCategoriesPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [formError, setFormError] = useState("");
  const [editCategory, setEditCategory] = useState<Record<string, unknown> | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<Record<string, unknown> | null>(null);
  const [editError, setEditError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: { active: true },
  });

  const editForm = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
  });

  const onSubmit = async (data: CategoryForm) => {
    setFormError("");
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      setFormError(json.message || "Failed to create category");
      return;
    }
    reset({ name: "", active: true });
    setRefreshKey((k) => k + 1);
  };

  const openEdit = (row: Record<string, unknown>) => {
    setEditError("");
    setEditCategory(row);
    editForm.reset({ name: String(row.name), active: Boolean(row.active) });
  };

  const saveEdit = async (data: CategoryForm) => {
    if (!editCategory) return;
    setEditError("");
    const res = await fetch(`/api/categories/${editCategory._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      setEditError(json.message || "Failed to update category");
      return;
    }
    setEditCategory(null);
    setRefreshKey((k) => k + 1);
  };

  const toggleActive = async (id: string, active: boolean) => {
    await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    setRefreshKey((k) => k + 1);
  };

  const confirmDelete = async () => {
    if (!deleteCategory) return;
    await fetch(`/api/categories/${deleteCategory._id}`, { method: "DELETE" });
    setDeleteCategory(null);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Claim Categories</h1>

      <Card>
        <h2 className="mb-4 font-semibold">Add Category</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-4">
          <div className="min-w-[240px] flex-1">
            <Label required>Category Name</Label>
            <Input {...register("name")} placeholder="e.g. Travel, Food" />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <Button type="submit" disabled={isSubmitting}>Add Category</Button>
        </form>
      </Card>

      <Card>
        <DataTable
          endpoint="/api/categories"
          exportTable="categories"
          refreshKey={refreshKey}
          filters={[
            {
              key: "active",
              label: "All",
              options: [
                { label: "Active", value: "true" },
                { label: "Inactive", value: "false" },
              ],
            },
          ]}
          columns={[
            { key: "name", header: "Name" },
            {
              key: "active",
              header: "Status",
              render: (r) => (r.active ? "Active" : "Inactive"),
            },
            {
              key: "actions",
              header: "Actions",
              render: (r) => (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
                    Edit
                  </Button>
                  <Button variant="secondary" onClick={(e) => { e.stopPropagation(); toggleActive(String(r._id), Boolean(r.active)); }}>
                    {r.active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button variant="danger" onClick={(e) => { e.stopPropagation(); setDeleteCategory(r); }}>
                    Delete
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal open={!!editCategory} onClose={() => setEditCategory(null)} title="Edit Category">
        <form onSubmit={editForm.handleSubmit(saveEdit)} className="space-y-4">
          <div>
            <Label required>Category Name</Label>
            <Input {...editForm.register("name")} />
            {editForm.formState.errors.name && (
              <p className="mt-1 text-sm text-red-600">{editForm.formState.errors.name.message}</p>
            )}
          </div>
          {editError && <p className="text-sm text-red-600">{editError}</p>}
          <div className="flex gap-2">
            <Button type="submit">Save</Button>
            <Button type="button" variant="ghost" onClick={() => setEditCategory(null)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteCategory}
        title="Delete Category"
        message={`Are you sure you want to deactivate "${String(deleteCategory?.name || "")}"? Existing claims using this category will remain unchanged.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteCategory(null)}
      />
    </div>
  );
}
