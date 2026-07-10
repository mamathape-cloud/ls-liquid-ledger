"use client";

import { useEffect, useState } from "react";
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
import { PageHeader } from "@/components/layout/ThunderModules";
import { formatStatus } from "@/lib/utils";
import { canManageRole } from "@/lib/auth-client";

type UserForm = z.infer<typeof userCreateSchema>;
type UserEditForm = z.infer<typeof userUpdateSchema>;

interface RoleOption {
  _id: string;
  name: string;
  slug: string;
}

const defaultCreateValues: UserForm = {
  name: "",
  phone: "",
  password: "",
  roleSlug: ROLES.EMPLOYEE,
  status: "ACTIVE",
};

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858 3.029a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [formError, setFormError] = useState("");
  const [editUser, setEditUser] = useState<Record<string, unknown> | null>(null);
  const [deleteUser, setDeleteUser] = useState<Record<string, unknown> | null>(null);
  const [resetResult, setResetResult] = useState<{
    name: string;
    phone: string;
    newPassword: string;
  } | null>(null);
  const [editError, setEditError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetch("/api/roles?active=true&limit=100")
      .then((r) => r.json())
      .then((d) => setRoles(d.data || []));
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UserForm>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: defaultCreateValues,
  });

  const phoneField = register("phone");
  const passwordField = register("password");

  const editForm = useForm<UserEditForm>({
    resolver: zodResolver(userUpdateSchema),
  });

  const allowedRoles = roles.filter((r) =>
    user ? canManageRole(user.roleSlug, r.slug) : false
  );

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
    reset(defaultCreateValues);
    setShowPassword(false);
    setRefreshKey((k) => k + 1);
  };

  const openEdit = (row: Record<string, unknown>) => {
    setEditError("");
    setEditUser(row);
    editForm.reset({
      name: String(row.name),
      roleSlug: String(row.roleSlug || row.role),
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
        name: json.user?.name || String(row.name),
        phone: json.user?.phone || String(row.phone),
        newPassword: json.user?.newPassword,
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteUser) return;
    await fetch(`/api/users/${deleteUser._id}`, { method: "DELETE" });
    setDeleteUser(null);
    setRefreshKey((k) => k + 1);
  };

  const isSystemAdminRow = (row: Record<string, unknown>) =>
    String(row.roleSlug || row.role) === ROLES.SYSTEM_ADMIN;

  return (
    <div className="space-y-6">
      <PageHeader title="User Management" />

      <Card>
        <h2 className="mb-4 font-semibold">Create User</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
          <div>
            <Label required>Name</Label>
            <Input {...register("name")} />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <Label required>Phone</Label>
            <Input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={10}
              placeholder="10-digit number"
              name={phoneField.name}
              ref={phoneField.ref}
              onBlur={phoneField.onBlur}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                e.target.value = digits;
                setValue("phone", digits, { shouldValidate: true, shouldDirty: true });
              }}
            />
            {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
          </div>
          <div>
            <Label required>Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="pr-11"
                name={passwordField.name}
                ref={passwordField.ref}
                onBlur={passwordField.onBlur}
                onChange={passwordField.onChange}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOffIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
          </div>
          <div>
            <Label required>Role</Label>
            <Select {...register("roleSlug")}>
              {allowedRoles.map((r) => (
                <option key={r.slug} value={r.slug}>{r.name}</option>
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
              key: "roleSlug",
              label: "All Roles",
              options: roles.map((r) => ({ label: r.name, value: r.slug })),
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
            { key: "roleSlug", header: "Role", render: (r) => formatStatus(String(r.roleSlug || r.role)) },
            { key: "status", header: "Status" },
            {
              key: "actions",
              header: "Actions",
              render: (r) =>
                isSystemAdminRow(r) ? (
                  <span className="text-sm text-slate-400">—</span>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
                      Edit
                    </Button>
                    <Button variant="secondary" onClick={(e) => { e.stopPropagation(); resetPassword(r); }}>
                      Reset Password
                    </Button>
                    <Button variant="danger" onClick={(e) => { e.stopPropagation(); setDeleteUser(r); }}>
                      Delete
                    </Button>
                  </div>
                ),
            },
          ]}
        />
      </Card>

      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Edit User">
        <form onSubmit={editForm.handleSubmit(saveEdit)} className="space-y-4">
          <div>
            <Label required>Name</Label>
            <Input {...editForm.register("name")} />
            {editForm.formState.errors.name && (
              <p className="mt-1 text-sm text-red-600">{editForm.formState.errors.name.message}</p>
            )}
          </div>
          <div>
            <Label required>Role</Label>
            <Select {...editForm.register("roleSlug")}>
              {allowedRoles.map((r) => (
                <option key={r.slug} value={r.slug}>{r.name}</option>
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
