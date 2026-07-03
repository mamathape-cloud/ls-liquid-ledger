"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { DataTable } from "@/components/DataTable";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ProofLinks } from "@/components/ProofLinks";
import { ClaimStatusCell } from "@/components/ClaimStatusCell";
import { ClaimDetailModal } from "@/components/ClaimDetailModal";
import { PageHeader } from "@/components/layout/ThunderModules";
import { formatINR, formatDate, formatStatus } from "@/lib/utils";
import { CLAIM_STATUSES } from "@/lib/constants";

interface FormState {
  eventId: string;
  amount: string;
  claimDate: string;
  reason: string;
  categoryId: string;
}

export default function EmployeeClaimsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [events, setEvents] = useState<{ _id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>([]);
  const [proofFiles, setProofFiles] = useState<FileList | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [formError, setFormError] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [editClaim, setEditClaim] = useState<Record<string, unknown> | null>(null);
  const [deleteClaim, setDeleteClaim] = useState<Record<string, unknown> | null>(null);
  const [editProofFiles, setEditProofFiles] = useState<FileList | null>(null);
  const [editError, setEditError] = useState("");
  const [viewClaimId, setViewClaimId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [eventBudget, setEventBudget] = useState<{
    assignedBudget: number;
    claimedAmount: number;
    remaining: number;
  } | null>(null);

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<FormState>({
    defaultValues: { eventId: "", amount: "", claimDate: "", reason: "", categoryId: "" },
  });

  const editForm = useForm<FormState>();

  const reason = watch("reason");
  const selectedEventId = watch("eventId");

  useEffect(() => {
    if (!selectedEventId) {
      setEventBudget(null);
      return;
    }
    fetch(`/api/claims/event-budget?eventId=${selectedEventId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setEventBudget(d || null))
      .catch(() => setEventBudget(null));
  }, [selectedEventId, refreshKey]);

  useEffect(() => {
    fetch("/api/events?limit=100").then((r) => r.json()).then((d) => setEvents(d.data || []));
    fetch("/api/categories?limit=100").then((r) => r.json()).then((d) => setCategories(d.data || []));
  }, []);

  useEffect(() => {
    if (!reason || reason.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/claims/reasons?q=${encodeURIComponent(reason)}`)
        .then((r) => r.json())
        .then((d) => setSuggestions(d.suggestions || []));
    }, 300);
    return () => clearTimeout(timer);
  }, [reason]);

  const onSubmit = async (data: FormState) => {
    setFormError({});
    const fieldErrors: Record<string, string> = {};
    if (!data.eventId) fieldErrors.eventId = "Event is required";
    if (!data.amount || Number(data.amount) <= 0) fieldErrors.amount = "Valid amount is required";
    if (!data.claimDate) fieldErrors.claimDate = "Claim date is required";
    if (!data.reason.trim()) fieldErrors.reason = "Reason is required";
    if (!data.categoryId) fieldErrors.categoryId = "Category is required";
    if (!proofFiles?.length) fieldErrors.proofFiles = "At least one proof file is required";
    if (Object.keys(fieldErrors).length) {
      setFormError(fieldErrors);
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append("eventId", data.eventId);
    formData.append("amount", data.amount);
    formData.append("claimDate", data.claimDate);
    formData.append("reason", data.reason);
    formData.append("categoryId", data.categoryId);
    Array.from(proofFiles!).forEach((f) => formData.append("proofFiles", f));

    const res = await fetch("/api/claims", { method: "POST", body: formData });
    const json = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setFormError(json.errors || { form: json.message });
      return;
    }
    reset();
    setProofFiles(null);
    setRefreshKey((k) => k + 1);
  };

  const openEdit = (row: Record<string, unknown>) => {
    setEditError("");
    setEditClaim(row);
    setEditProofFiles(null);
    editForm.reset({
      eventId: String(row.eventId),
      amount: String(row.amount),
      claimDate: new Date(String(row.claimDate)).toISOString().split("T")[0],
      reason: String(row.reason),
      categoryId: String(row.categoryId),
    });
  };

  const saveEdit = async (data: FormState) => {
    if (!editClaim) return;
    setEditError("");
    const formData = new FormData();
    formData.append("amount", data.amount);
    formData.append("claimDate", data.claimDate);
    formData.append("reason", data.reason);
    formData.append("categoryId", data.categoryId);
    if (editProofFiles?.length) {
      Array.from(editProofFiles).forEach((f) => formData.append("proofFiles", f));
    }

    const res = await fetch(`/api/claims/${editClaim._id}`, {
      method: "PATCH",
      body: formData,
    });
    const json = await res.json();
    if (!res.ok) {
      setEditError(json.message || "Failed to update claim");
      return;
    }
    setEditClaim(null);
    setRefreshKey((k) => k + 1);
  };

  const confirmDelete = async () => {
    if (!deleteClaim) return;
    await fetch(`/api/claims/${deleteClaim._id}`, { method: "DELETE" });
    setDeleteClaim(null);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="My Claims" />

      <Card>
        <h2 className="mb-4 font-semibold">Submit New Claim</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Event</Label>
            <Select {...register("eventId")}>
              <option value="">Select event</option>
              {events.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
            </Select>
            {(formError.eventId || errors.eventId) && <p className="mt-1 text-sm text-red-600">{formError.eventId || errors.eventId?.message}</p>}
            {eventBudget && (
              <div className="mt-3 grid gap-2 rounded-xl bg-[var(--surface-muted)] p-3 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-slate-500">Event Amount Assigned</p>
                  <p className="font-semibold text-slate-900">{formatINR(eventBudget.assignedBudget)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Claimed Amount</p>
                  <p className="font-semibold text-slate-900">{formatINR(eventBudget.claimedAmount)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Remaining</p>
                  <p className={`font-semibold ${eventBudget.remaining < 0 ? "text-red-600" : "text-[var(--primary)]"}`}>
                    {formatINR(eventBudget.remaining)}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div>
            <Label>Category</Label>
            <Select {...register("categoryId")}>
              <option value="">Select category</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </Select>
            {(formError.categoryId || errors.categoryId) && <p className="mt-1 text-sm text-red-600">{formError.categoryId}</p>}
          </div>
          <div>
            <Label>Amount (INR)</Label>
            <Input type="number" step="0.01" {...register("amount")} />
            {formError.amount && <p className="mt-1 text-sm text-red-600">{formError.amount}</p>}
          </div>
          <div>
            <Label>Claim Date</Label>
            <Input type="date" {...register("claimDate")} />
            {formError.claimDate && <p className="mt-1 text-sm text-red-600">{formError.claimDate}</p>}
          </div>
          <div className="relative md:col-span-2">
            <Label>Reason / Purpose</Label>
            <Textarea {...register("reason")} placeholder="Describe the expense" />
            {suggestions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border bg-white shadow">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onClick={() => setValue("reason", s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {formError.reason && <p className="mt-1 text-sm text-red-600">{formError.reason}</p>}
          </div>
          <div className="md:col-span-2">
            <Label>Proof Attachments (PDF, DOCX, images)</Label>
            <Input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,image/*"
              onChange={(e) => setProofFiles(e.target.files)}
            />
            {formError.proofFiles && <p className="mt-1 text-sm text-red-600">{formError.proofFiles}</p>}
          </div>
          {formError.form && <p className="text-sm text-red-600 md:col-span-2">{formError.form}</p>}
          <div className="md:col-span-2">
            <Button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit Claim"}</Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="w-full sm:max-w-[180px]">
            <Label>From Date</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="w-full sm:max-w-[180px]">
            <Label>To Date</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
        <DataTable
          endpoint="/api/claims"
          exportTable="claims"
          refreshKey={refreshKey}
          extraParams={{
            ...(dateFrom ? { "filter.dateFrom": dateFrom } : {}),
            ...(dateTo ? { "filter.dateTo": dateTo } : {}),
          }}
          filters={[
            {
              key: "eventId",
              label: "All Events",
              options: events.map((e) => ({ label: e.name, value: e._id })),
            },
            {
              key: "status",
              label: "All Status",
              options: Object.values(CLAIM_STATUSES).map((s) => ({
                label: formatStatus(s),
                value: s,
              })),
            },
          ]}
          columns={[
            { key: "claimId", header: "Claim ID" },
            { key: "eventName", header: "Event" },
            { key: "amount", header: "Amount", render: (r) => formatINR(Number(r.amount)) },
            { key: "claimDate", header: "Date", render: (r) => formatDate(String(r.claimDate)) },
            { key: "categoryName", header: "Category" },
            {
              key: "proofFiles",
              header: "Proof",
              render: (r) => <ProofLinks files={r.proofFiles} truncateAt={15} />,
            },
            {
              key: "status",
              header: "Status",
              render: (r) => (
                <ClaimStatusCell
                  status={String(r.status)}
                  financeRejectionReason={r.financeRejectionReason as string | undefined}
                  directorRejectionReason={r.directorRejectionReason as string | undefined}
                />
              ),
            },
            {
              key: "actions",
              header: "Actions",
              render: (r) =>
                r.status === CLAIM_STATUSES.SUBMITTED ? (
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
                      Edit
                    </Button>
                    <Button variant="danger" onClick={(e) => { e.stopPropagation(); setDeleteClaim(r); }}>
                      Delete
                    </Button>
                  </div>
                ) : (
                  <Button variant="secondary" onClick={(e) => { e.stopPropagation(); setViewClaimId(String(r._id)); }}>
                    View
                  </Button>
                ),
            },
          ]}
        />
      </Card>

      <Modal open={!!editClaim} onClose={() => setEditClaim(null)} title={`Edit Claim ${String(editClaim?.claimId || "")}`}>
        <form onSubmit={editForm.handleSubmit(saveEdit)} className="space-y-4">
          <div>
            <Label>Amount (INR)</Label>
            <Input type="number" step="0.01" {...editForm.register("amount")} />
          </div>
          <div>
            <Label>Claim Date</Label>
            <Input type="date" {...editForm.register("claimDate")} />
          </div>
          <div>
            <Label>Category</Label>
            <Select {...editForm.register("categoryId")}>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Reason</Label>
            <Textarea {...editForm.register("reason")} />
          </div>
          <div>
            <Label>Add More Proof (optional)</Label>
            <Input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,image/*"
              onChange={(e) => setEditProofFiles(e.target.files)}
            />
            <div className="mt-2">
              <ProofLinks files={editClaim?.proofFiles} />
            </div>
          </div>
          {editError && <p className="text-sm text-red-600">{editError}</p>}
          <div className="flex gap-2">
            <Button type="submit">Save</Button>
            <Button type="button" variant="ghost" onClick={() => setEditClaim(null)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteClaim}
        title="Delete Claim"
        message={`Are you sure you want to delete claim ${String(deleteClaim?.claimId || "")}? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteClaim(null)}
      />

      <ClaimDetailModal
        claimId={viewClaimId}
        open={!!viewClaimId}
        onClose={() => setViewClaimId(null)}
      />
    </div>
  );
}
