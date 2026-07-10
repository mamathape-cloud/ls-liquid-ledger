"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { bankDetailsSchema } from "@/lib/validators";
import { z } from "zod";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/layout/ThunderModules";
import { useAuth } from "@/hooks/useAuth";

type BankForm = z.infer<typeof bankDetailsSchema>;

function hasPaymentDetails(details?: BankForm | null) {
  if (!details) return false;
  return Boolean(
    details.upiId?.trim() ||
      details.accountName?.trim() ||
      details.accountNumber?.trim() ||
      details.ifsc?.trim()
  );
}

export default function EmployeeProfilePage() {
  const { user } = useAuth();
  const [savedDetails, setSavedDetails] = useState<BankForm | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BankForm>({
    resolver: zodResolver(bankDetailsSchema),
  });

  const loadProfile = () => {
    if (!user) return;
    fetch(`/api/users/${user.id}`)
      .then((r) => r.json())
      .then((d) => {
        const details = d.user?.bankDetails || null;
        setSavedDetails(details);
        setShowForm(!hasPaymentDetails(details));
      });
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  const onSubmit = async (data: BankForm) => {
    if (!user) return;
    setMessage("");
    setError("");
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bankDetails: data }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.message || "Failed to update profile");
      return;
    }
    setSavedDetails(json.user?.bankDetails || data);
    setShowForm(false);
    setMessage("Payment details saved successfully");
  };

  const openEdit = () => {
    setError("");
    setMessage("");
    reset(savedDetails || { upiId: "", accountName: "", accountNumber: "", ifsc: "" });
    setShowForm(true);
  };

  const confirmDelete = async () => {
    if (!user) return;
    setError("");
    setMessage("");
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clearBankDetails: true }),
    });
    if (!res.ok) {
      const json = await res.json();
      setError(json.message || "Failed to delete payment details");
      return;
    }
    setSavedDetails(null);
    setShowForm(true);
    reset({ upiId: "", accountName: "", accountNumber: "", ifsc: "" });
    setDeleteOpen(false);
    setMessage("Payment details removed");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" />

      {hasPaymentDetails(savedDetails) && !showForm && (
        <Card>
          <h2 className="mb-4 font-semibold">Payment Details</h2>

          <div className="md:hidden">
            <div className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
              {[
                { label: "UPI ID", value: savedDetails?.upiId },
                { label: "Account Name", value: savedDetails?.accountName },
                { label: "Account Number", value: savedDetails?.accountNumber },
                { label: "IFSC", value: savedDetails?.ifsc },
              ].map((field) => (
                <div
                  key={field.label}
                  className="flex items-start justify-between gap-3 border-b border-[var(--border)] py-2.5 last:border-b-0"
                >
                  <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {field.label}
                  </span>
                  <span className="min-w-0 break-all text-right text-sm text-slate-900">
                    {field.value || "—"}
                  </span>
                </div>
              ))}
              <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
                <Button variant="secondary" onClick={() => setViewOpen(true)}>View</Button>
                <Button variant="secondary" onClick={openEdit}>Edit</Button>
                <Button variant="danger" onClick={() => setDeleteOpen(true)}>Delete</Button>
              </div>
            </div>
          </div>

          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">UPI ID</th>
                  <th className="px-4 py-3 font-semibold">Account Name</th>
                  <th className="px-4 py-3 font-semibold">Account Number</th>
                  <th className="px-4 py-3 font-semibold">IFSC</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-4 py-3">{savedDetails?.upiId || "—"}</td>
                  <td className="px-4 py-3">{savedDetails?.accountName || "—"}</td>
                  <td className="px-4 py-3">{savedDetails?.accountNumber || "—"}</td>
                  <td className="px-4 py-3">{savedDetails?.ifsc || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => setViewOpen(true)}>View</Button>
                      <Button variant="secondary" onClick={openEdit}>Edit</Button>
                      <Button variant="danger" onClick={() => setDeleteOpen(true)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showForm && (
        <Card>
          <h2 className="mb-4 font-semibold">
            {hasPaymentDetails(savedDetails) ? "Edit Payment Details" : "Add Payment Details"}
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            <span className="text-red-600">*</span> Provide UPI ID or complete bank details (account name, number, and IFSC).
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl space-y-4">
            <div>
              <Label>UPI ID</Label>
              <Input {...register("upiId")} placeholder="name@upi" />
              {errors.upiId && <p className="mt-1 text-sm text-red-600">{errors.upiId.message}</p>}
            </div>
            <div>
              <Label>Account Name</Label>
              <Input {...register("accountName")} />
              {errors.accountName && <p className="mt-1 text-sm text-red-600">{errors.accountName.message}</p>}
            </div>
            <div>
              <Label>Account Number</Label>
              <Input {...register("accountNumber")} />
              {errors.accountNumber && <p className="mt-1 text-sm text-red-600">{errors.accountNumber.message}</p>}
            </div>
            <div>
              <Label>IFSC</Label>
              <Input {...register("ifsc")} placeholder="e.g. SBIN0001234" />
              {errors.ifsc && <p className="mt-1 text-sm text-red-600">{errors.ifsc.message}</p>}
            </div>
            {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {hasPaymentDetails(savedDetails) ? "Save Changes" : "Save Details"}
              </Button>
              {hasPaymentDetails(savedDetails) && (
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              )}
            </div>
          </form>
        </Card>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-600">{message}</p>}

      <Modal open={viewOpen} onClose={() => setViewOpen(false)} title="Payment Details">
        <div className="space-y-3 text-sm">
          <p><span className="text-slate-500">UPI ID:</span> {savedDetails?.upiId || "—"}</p>
          <p><span className="text-slate-500">Account Name:</span> {savedDetails?.accountName || "—"}</p>
          <p><span className="text-slate-500">Account Number:</span> {savedDetails?.accountNumber || "—"}</p>
          <p><span className="text-slate-500">IFSC:</span> {savedDetails?.ifsc || "—"}</p>
        </div>
        <Button className="mt-4 w-full" variant="ghost" onClick={() => setViewOpen(false)}>Close</Button>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Payment Details"
        message="Remove your saved payment details? You can add them again later."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
