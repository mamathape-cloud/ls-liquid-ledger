"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { userCreateSchema, userUpdateSchema } from "@/lib/validators";
import { z } from "zod";
import { DataTable } from "@/components/DataTable";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ROLES } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { formatStatus } from "@/lib/utils";

type UserForm = z.infer<typeof userCreateSchema>;
type UserEditForm = z.infer<typeof userUpdateSchema>;

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [formError, setFormError] = useState("");
  const [editUser, setEditUser] = useState<Record<string, unknown> | null>(null);
  const [deleteUser, setDeleteUser] = useState<Record<string, unknown> | null>(null);
  const [resetResult, setResetResult] = useState<{
    name: string;
    phone: string;
    newPassword: string;
  } | null>(null);
  const [editError, setEditError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserForm>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: { role: ROLES.EMPLOYEE, status: "ACTIVE" },
  });

  const editForm = useForm<UserEditForm>({
    resolver: zodResolver(userUpdateSchema),
  });

  const allowedRoles =
    user?.role === ROLES.SYSTEM_ADMIN
      ? Object.values(ROLES)
      : [ROLES.DIRECTOR, ROLES.EMPLOYEE];

  const onSubmit = async (data: UserForm) => {
    setFormError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      setFormError(json.message || "Failed to create user");
      return;
    }
    reset();
    setRefreshKey((k) => k + 1);
  };

  const openEdit = (row: Record<string, unknown>) => {
    setEditError("");
    setEditUser(row);
    editForm.reset({
      name: String(row.name),
      role: row.role as UserEditForm["role"],
      status: row.status as UserEditForm["status"],
    });
  };

  const saveEdit = async (data: UserEditForm) => {
    if (!editUser) return;
    setEditError("");
    const res = await fetch(`/api/users/${editUser._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      setEditError(json.message || "Failed to update user");
      return;
    }
    setEditUser(null);
    setRefreshKey((k) => k + 1);
  };

  const resetPassword = async (row: Record<string, unknown>) => {
    const res = await fetch(`/api/users/${row._id}/reset-password`, {
      method: "POST",
    });
    const json = await res.json();
    if (res.ok) {
      setResetResult({
        name: json.name,
        phone: json.phone,
        newPassword: json.newPassword,
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteUser) return;
    await fetch(`/api/users/${deleteUser._id}`, { method: "DELETE" });
    setDeleteUser(null);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">User Management</h1>

      <Card>
        <h2 className="mb-4 font-semibold">Create User</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input {...register("name")} />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <Label>Phone</Label>
            <Input {...register("phone")} placeholder="10-digit number" />
            {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" {...register("password")} />
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
          </div>
          <div>
            <Label>Role</Label>
            <Select {...register("role")}>
              {allowedRoles.map((r) => (
                <option key={r} value={r}>{formatStatus(r)}</option>
              ))}
            </Select>
          </div>
          {formError && <p className="text-sm text-red-600 md:col-span-2">{formError}</p>}
          <div className="md:col-span-2">
            <Button type="submit" disabled={isSubmitting}>Create User</Button>
          </div>
        </form>
      </Card>

      <Card>
        <DataTable
          endpoint="/api/users"
          exportTable="users"
          refreshKey={refreshKey}
          filters={[
            {
              key: "role",
              label: "All Roles",
              options: Object.values(ROLES).map((r) => ({ label: formatStatus(r), value: r })),
            },
            {
              key: "status",
              label: "All Status",
              options: [
                { label: "Active", value: "ACTIVE" },
                { label: "Inactive", value: "INACTIVE" },
              ],
            },
          ]}
          columns={[
            { key: "name", header: "Name" },
            { key: "phone", header: "Phone" },
            { key: "role", header: "Role", render: (r) => formatStatus(String(r.role)) },
            { key: "status", header: "Status" },
            {
              key: "actions",
              header: "Actions",
              render: (r) => (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
                    Edit
                  </Button>
                  {user?.role === ROLES.SYSTEM_ADMIN && (
                    <Button variant="secondary" onClick={(e) => { e.stopPropagation(); resetPassword(r); }}>
                      Reset Password
                    </Button>
                  )}
                  {user?.role === ROLES.SYSTEM_ADMIN && (
                    <Button variant="danger" onClick={(e) => { e.stopPropagation(); setDeleteUser(r); }}>
                      Delete
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Edit User">
        <form onSubmit={editForm.handleSubmit(saveEdit)} className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input {...editForm.register("name")} />
            {editForm.formState.errors.name && (
              <p className="mt-1 text-sm text-red-600">{editForm.formState.errors.name.message}</p>
            )}
          </div>
          <div>
            <Label>Role</Label>
            <Select {...editForm.register("role")}>
              {allowedRoles.map((r) => (
                <option key={r} value={r}>{formatStatus(r)}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select {...editForm.register("status")}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </div>
          {editError && <p className="text-sm text-red-600">{editError}</p>}
          <div className="flex gap-2">
            <Button type="submit">Save Changes</Button>
            <Button type="button" variant="ghost" onClick={() => setEditUser(null)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!resetResult} onClose={() => setResetResult(null)} title="Password Reset Successful">
        <p className="text-sm text-slate-600">
          Password for <strong>{resetResult?.name}</strong> ({resetResult?.phone}) has been reset to:
        </p>
        <p className="mt-3 rounded-lg bg-[var(--primary-soft)] p-3 text-center font-mono text-lg font-bold text-[var(--primary)]">
          {resetResult?.newPassword}
        </p>
        <p className="mt-3 text-xs text-slate-500">Please share this password securely with the user.</p>
        <Button className="mt-4 w-full" onClick={() => setResetResult(null)}>OK</Button>
      </Modal>

      <ConfirmDialog
        open={!!deleteUser}
        title="Delete User"
        message={`Are you sure you want to deactivate ${String(deleteUser?.name || "this user")}? This action can be reversed by editing the user status.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteUser(null)}
      />
    </div>
  );
}
