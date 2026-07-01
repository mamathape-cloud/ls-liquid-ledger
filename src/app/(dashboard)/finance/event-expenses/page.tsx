"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/layout/ThunderModules";
import { formatINR } from "@/lib/utils";
import { headTotal, planGrandTotal, planToTableRows } from "@/lib/event-expenses";
import type { ExpenseHead } from "@/types";

interface EventOption {
  _id: string;
  name: string;
}

const emptyHead = (): ExpenseHead => ({
  name: "",
  amount: 0,
  subHeads: [],
});

export default function EventExpensesPage() {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [eventId, setEventId] = useState("");
  const [planHeads, setPlanHeads] = useState<ExpenseHead[]>([]);
  const [draft, setDraft] = useState<ExpenseHead>(emptyHead());
  const [editingHeadIndex, setEditingHeadIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/event-expenses?listEvents=true")
      .then((r) => r.json())
      .then((d) => setEvents(d.data || []));
  }, []);

  const loadPlan = (id: string) => {
    if (!id) {
      setPlanHeads([]);
      return;
    }
    setLoading(true);
    setError("");
    fetch(`/api/event-expenses?eventId=${id}`)
      .then((r) => r.json())
      .then((d) => {
        setPlanHeads(
          (d.plan?.heads || []).map((h: ExpenseHead) => ({
            name: h.name,
            amount: h.amount ?? 0,
            subHeads: h.subHeads || [],
          }))
        );
      })
      .catch(() => setError("Failed to load expense plan"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    resetDraft();
    loadPlan(eventId);
  }, [eventId]);

  const resetDraft = () => {
    setDraft(emptyHead());
    setEditingHeadIndex(null);
  };

  const persistPlan = async (heads: ExpenseHead[]) => {
    const res = await fetch("/api/event-expenses", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, heads }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Failed to save");
    setPlanHeads(json.plan.heads);
    return json;
  };

  const validateDraft = () => {
    if (!draft.name.trim()) {
      setError("Head name is required");
      return false;
    }
    if (draft.subHeads.length === 0 && (draft.amount === undefined || draft.amount < 0)) {
      setError("Amount is required when there are no sub-heads");
      return false;
    }
    if (draft.subHeads.some((s) => !s.name.trim())) {
      setError("All sub-head names are required");
      return false;
    }
    return true;
  };

  const addOrUpdateHead = () => {
    setError("");
    if (!validateDraft()) return;

    const normalized: ExpenseHead = {
      name: draft.name.trim(),
      amount: draft.subHeads.length ? undefined : draft.amount,
      subHeads: draft.subHeads.map((s) => ({ name: s.name.trim(), amount: s.amount })),
    };

    if (editingHeadIndex !== null) {
      setPlanHeads((prev) =>
        prev.map((h, i) => (i === editingHeadIndex ? normalized : h))
      );
    } else {
      setPlanHeads((prev) => [...prev, normalized]);
    }
    resetDraft();
    setSuccess("Head added to plan. Click Save Plan to persist.");
  };

  const editHead = (headIndex: number) => {
    const head = planHeads[headIndex];
    if (!head) return;
    setDraft({
      name: head.name,
      amount: head.amount ?? 0,
      subHeads: head.subHeads.map((s) => ({ ...s })),
    });
    setEditingHeadIndex(headIndex);
    setSuccess("");
  };

  const deleteHead = async (headIndex: number) => {
    setError("");
    setSuccess("");
    const next = planHeads.filter((_, i) => i !== headIndex);
    setPlanHeads(next);
    if (editingHeadIndex === headIndex) resetDraft();

    if (!eventId) return;
    setSaving(true);
    try {
      if (next.length === 0) {
        await persistPlan([]);
      } else {
        await persistPlan(next);
      }
      setSuccess("Head removed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
      loadPlan(eventId);
    } finally {
      setSaving(false);
    }
  };

  const savePlan = async () => {
    if (!eventId) {
      setError("Select an event");
      return;
    }
    if (!planHeads.length) {
      setError("Add at least one head before saving");
      return;
    }
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await persistPlan(planHeads);
      setSuccess("Expense plan saved");
      resetDraft();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const updateDraft = (patch: Partial<ExpenseHead>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const addSubHead = () => {
    setDraft((prev) => ({
      ...prev,
      subHeads: [...prev.subHeads, { name: "", amount: 0 }],
    }));
  };

  const updateSubHead = (
    subIndex: number,
    patch: Partial<{ name: string; amount: number }>
  ) => {
    setDraft((prev) => ({
      ...prev,
      subHeads: prev.subHeads.map((sh, si) =>
        si === subIndex ? { ...sh, ...patch } : sh
      ),
    }));
  };

  const removeSubHead = (subIndex: number) => {
    setDraft((prev) => ({
      ...prev,
      subHeads: prev.subHeads.filter((_, si) => si !== subIndex),
    }));
  };

  const tableRows = useMemo(() => planToTableRows(planHeads), [planHeads]);
  const grandTotal = planGrandTotal(planHeads);

  return (
    <div className="space-y-6">
      <PageHeader title="Event Expenses" />
      <p className="text-sm text-slate-500">Plan expense heads and sub-heads per event</p>

      <Card>
        <div className="space-y-4">
          <div>
            <Label>Event</Label>
            <Select
              value={eventId}
              onChange={(e) => {
                setEventId(e.target.value);
                setSuccess("");
              }}
            >
              <option value="">Select event</option>
              {events.map((ev) => (
                <option key={ev._id} value={ev._id}>{ev.name}</option>
              ))}
            </Select>
          </div>

          {loading && <p className="text-sm text-slate-500">Loading plan...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-700">{success}</p>}

          {eventId && !loading && (
            <>
              <div className="rounded-2xl border border-[var(--border)] p-4">
                <h2 className="mb-3 font-semibold">
                  {editingHeadIndex !== null ? "Edit Head" : "Add Head"}
                </h2>
                <div className="mb-3 flex flex-wrap items-end gap-3">
                  <div className="min-w-[160px] flex-1">
                    <Label>Head</Label>
                    <Input
                      value={draft.name}
                      onChange={(e) => updateDraft({ name: e.target.value })}
                      placeholder="e.g. Travel"
                    />
                  </div>
                  {draft.subHeads.length === 0 && (
                    <div className="w-36">
                      <Label>Amount</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={draft.amount ?? 0}
                        onChange={(e) =>
                          updateDraft({ amount: Number(e.target.value) })
                        }
                      />
                    </div>
                  )}
                  <div className="text-sm font-semibold text-[var(--primary)]">
                    Total: {formatINR(headTotal(draft))}
                  </div>
                </div>

                <div className="space-y-2 border-t border-[var(--border)] pt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">Sub-heads</p>
                    <Button type="button" variant="secondary" onClick={addSubHead}>
                      Add sub-head
                    </Button>
                  </div>
                  {draft.subHeads.map((sub, subIndex) => (
                    <div key={subIndex} className="flex flex-wrap items-end gap-2">
                      <div className="min-w-[120px] flex-1">
                        <Input
                          value={sub.name}
                          onChange={(e) =>
                            updateSubHead(subIndex, { name: e.target.value })
                          }
                          placeholder="Flight, Train, Bus..."
                        />
                      </div>
                      <div className="w-32">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={sub.amount}
                          onChange={(e) =>
                            updateSubHead(subIndex, { amount: Number(e.target.value) })
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => removeSubHead(subIndex)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" onClick={addOrUpdateHead}>
                    {editingHeadIndex !== null ? "Update Head" : "Add Head"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={resetDraft}>
                    Cancel
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-lg font-bold text-[var(--primary)]">
                  Grand Total: {formatINR(grandTotal)}
                </p>
                <Button onClick={savePlan} disabled={saving}>
                  {saving ? "Saving..." : "Save Plan"}
                </Button>
              </div>

              <div>
                <h2 className="mb-3 font-semibold">Saved Plan</h2>
                <div className="overflow-x-auto rounded-lg border">
                  {tableRows.length === 0 ? (
                    <p className="p-4 text-sm text-slate-500">No heads in plan yet.</p>
                  ) : (
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-slate-600">Head</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-600">Sub-Head</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-600">Amount</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-600">Head Total</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableRows.map((row, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-3 py-2">{row.head}</td>
                            <td className="px-3 py-2">{row.subHead}</td>
                            <td className="px-3 py-2">{formatINR(row.amount)}</td>
                            <td className="px-3 py-2">{formatINR(row.headTotal)}</td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() => editHead(row.headIndex)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  variant="danger"
                                  onClick={() => deleteHead(row.headIndex)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
