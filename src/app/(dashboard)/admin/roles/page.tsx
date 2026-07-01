"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { roleCreateSchema, roleUpdateSchema } from "@/lib/validators";
import { z } from "zod";
import { DataTable } from "@/components/DataTable";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ModuleCheckboxGrid } from "@/components/ModuleCheckboxGrid";
import { formatStatus } from "@/lib/utils";

type RoleForm = z.infer<typeof roleCreateSchema>;
type RoleEditForm = z.infer<typeof roleUpdateSchema>;

function slugify(name: string) {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export default function AdminRolesPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [formError, setFormError] = useState("");
  const [editRole, setEditRole] = useState<Record<string, unknown> | null>(null);
  const [deleteRole, setDeleteRole] = useState<Record<string, unknown> | null>(null);
  const [editError, setEditError] = useState("");
  const [createModules, setCreateModules] = useState<string[]>(["dashboard"]);
  const [editModules, setEditModules] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RoleForm>({
    resolver: zodResolver(roleCreateSchema),
    defaultValues: { active: true, modules: ["dashboard"] },
  });

  const editForm = useForm<RoleEditForm>({
    resolver: zodResolver(roleUpdateSchema),
  });

  const watchName = watch("name");

  const onSubmit = async (data: RoleForm) => {
    setFormError("");
    const res = await fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, modules: createModules }),
    });
    const json = await res.json();
    if (!res.ok) {
      setFormError(json.message || "Failed to create role");
      return;
    }
    reset({ name: "", slug: "", active: true, modules: ["dashboard"] });
    setCreateModules(["dashboard"]);
    setRefreshKey((k) => k + 1);
  };

  const openEdit = (row: Record<string, unknown>) => {
    setEditError("");
    setEditRole(row);
    const modules = (row.modules as string[]) || [];
    setEditModules(modules);
    editForm.reset({
      name: String(row.name),
      active: Boolean(row.active),
      modules,
    });
  };

  const saveEdit = async (data: RoleEditForm) => {
    if (!editRole) return;
    setEditError("");
    const res = await fetch(`/api/roles/${editRole._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, modules: editModules }),
    });
    const json = await res.json();
    if (!res.ok) {
      setEditError(json.message || "Failed to update role");
      return;
    }
    setEditRole(null);
    setRefreshKey((k) => k + 1);
  };

  const confirmDelete = async () => {
    if (!deleteRole) return;
    const res = await fetch(`/api/roles/${deleteRole._id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      setEditError(json.message || "Failed to delete role");
    }
    setDeleteRole(null);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Roles & Module Access</h1>

      <Card>
        <h2 className="mb-4 font-semibold">Create Role</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Role Name</Label>
              <Input
                {...register("name")}
                placeholder="e.g. Event Manager"
                onBlur={() => {
                  const currentSlug = watch("slug");
                  if (!currentSlug && watchName) {
                    setValue("slug", slugify(watchName));
                  }
                }}
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>
            <div>
              <Label>Slug</Label>
              <Input {...register("slug")} placeholder="EVENT_MANAGER" />
              {errors.slug && <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p>}
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Module Access</Label>
            <ModuleCheckboxGrid
              selected={createModules}
              onChange={(mods) => {
                setCreateModules(mods);
                setValue("modules", mods);
              }}
            />
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <Button type="submit" disabled={isSubmitting}>Create Role</Button>
        </form>
      </Card>

      <Card>
        <DataTable
          endpoint="/api/roles"
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
            { key: "slug", header: "Slug" },
            {
              key: "modules",
              header: "Modules",
              render: (r) => `${(r.modules as string[])?.length || 0} modules`,
            },
            {
              key: "isSystem",
              header: "System",
              render: (r) => (r.isSystem ? "Yes" : "No"),
            },
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
                  {!r.isSystem && (
                    <Button variant="danger" onClick={(e) => { e.stopPropagation(); setDeleteRole(r); }}>
                      Delete
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal open={!!editRole} onClose={() => setEditRole(null)} title="Edit Role">
        <form onSubmit={editForm.handleSubmit(saveEdit)} className="space-y-4">
          <div>
            <Label>Role Name</Label>
            <Input {...editForm.register("name")} />
            {editForm.formState.errors.name && (
              <p className="mt-1 text-sm text-red-600">{editForm.formState.errors.name.message}</p>
            )}
          </div>
          <p className="text-sm text-slate-500">Slug: {String(editRole?.slug)}</p>
          <div>
            <Label className="mb-2 block">Module Access</Label>
            <ModuleCheckboxGrid selected={editModules} onChange={setEditModules} />
          </div>
          <div>
            <Label>Status</Label>
            <select
              className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2"
              {...editForm.register("active", {
                setValueAs: (v) => v === "true" || v === true,
              })}
              defaultValue={editRole?.active ? "true" : "false"}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          {editError && <p className="text-sm text-red-600">{editError}</p>}
          <div className="flex gap-2">
            <Button type="submit">Save</Button>
            <Button type="button" variant="ghost" onClick={() => setEditRole(null)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteRole}
        title="Delete Role"
        message={`Delete role "${String(deleteRole?.name || "")}"? This cannot be undone if users are assigned.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteRole(null)}
      />
    </div>
  );
}
