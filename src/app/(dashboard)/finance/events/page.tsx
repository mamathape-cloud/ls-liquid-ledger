"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventSchema } from "@/lib/validators";
import { z } from "zod";
import { DataTable } from "@/components/DataTable";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { BUDGET_TYPES } from "@/lib/constants";
import { formatINR, formatDate, formatStatus } from "@/lib/utils";

type EventForm = z.input<typeof eventSchema>;

interface EmployeeOption {
  _id: string;
  name: string;
}

interface AssignedEmployee {
  employeeId: string;
  preApprovedBudget: number;
  name?: string;
}

export default function FinanceEventsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [formError, setFormError] = useState("");
  const [manageEvent, setManageEvent] = useState<Record<string, unknown> | null>(null);
  const [assignedList, setAssignedList] = useState<AssignedEmployee[]>([]);
  const [addEmployeeId, setAddEmployeeId] = useState("");
  const [addBudget, setAddBudget] = useState("");
  const [addError, setAddError] = useState("");
  const [editAssignment, setEditAssignment] = useState<AssignedEmployee | null>(null);
  const [editBudget, setEditBudget] = useState("");
  const [deleteAssignment, setDeleteAssignment] = useState<AssignedEmployee | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      budgetType: BUDGET_TYPES.PER_EMPLOYEE,
      assignedEmployees: [{ employeeId: "", preApprovedBudget: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "assignedEmployees",
  });

  const budgetType = watch("budgetType");
  const watchedAssignments = watch("assignedEmployees");

  useEffect(() => {
    fetch("/api/users?filter.role=EMPLOYEE&limit=100")
      .then((r) => r.json())
      .then((d) => setEmployees(d.data || []));
  }, []);

  const loadEventDetails = useCallback(async (eventId: string) => {
    const res = await fetch(`/api/events/${eventId}`);
    const json = await res.json();
    const event = json.event;
    const list = (event.assignedEmployees || []).map(
      (a: { employeeId: { _id: string; name: string } | string; preApprovedBudget: number }) => ({
        employeeId: typeof a.employeeId === "object" ? a.employeeId._id : a.employeeId,
        name: typeof a.employeeId === "object" ? a.employeeId.name : "",
        preApprovedBudget: a.preApprovedBudget,
      })
    );
    setAssignedList(list);
  }, []);

  const openManage = async (row: Record<string, unknown>) => {
    setManageEvent(row);
    setAddEmployeeId("");
    setAddBudget("");
    setAddError("");
    await loadEventDetails(String(row._id));
  };

  const getAvailableEmployees = (selectedIds: string[], excludeId?: string) => {
    const used = new Set(selectedIds.filter(Boolean));
    return employees.filter((e) => !used.has(e._id) || e._id === excludeId);
  };

  const formAvailableForIndex = (index: number) => {
    const selectedIds = watchedAssignments
      ?.map((a, i) => (i !== index ? a.employeeId : ""))
      .filter(Boolean) as string[];
    const current = watchedAssignments?.[index]?.employeeId;
    return getAvailableEmployees(selectedIds, current);
  };

  const onSubmit = async (data: EventForm) => {
    setFormError("");
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      setFormError(json.message || "Failed to create event");
      return;
    }
    reset();
    setRefreshKey((k) => k + 1);
  };

  const addEmployeeToEvent = async () => {
    if (!manageEvent) return;
    setAddError("");
    const res = await fetch(`/api/events/${manageEvent._id}/employees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: addEmployeeId,
        preApprovedBudget: Number(addBudget),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setAddError(json.message || "Failed to add employee");
      return;
    }
    setAddEmployeeId("");
    setAddBudget("");
    await loadEventDetails(String(manageEvent._id));
    setRefreshKey((k) => k + 1);
  };

  const saveEditAssignment = async () => {
    if (!manageEvent || !editAssignment) return;
    await fetch(`/api/events/${manageEvent._id}/employees`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: editAssignment.employeeId,
        preApprovedBudget: Number(editBudget),
      }),
    });
    setEditAssignment(null);
    await loadEventDetails(String(manageEvent._id));
    setRefreshKey((k) => k + 1);
  };

  const confirmRemoveAssignment = async () => {
    if (!manageEvent || !deleteAssignment) return;
    await fetch(
      `/api/events/${manageEvent._id}/employees?employeeId=${deleteAssignment.employeeId}`,
      { method: "DELETE" }
    );
    setDeleteAssignment(null);
    await loadEventDetails(String(manageEvent._id));
    setRefreshKey((k) => k + 1);
  };

  const manageAvailable = getAvailableEmployees(assignedList.map((a) => a.employeeId));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Events</h1>

      <Card>
        <h2 className="mb-4 font-semibold">Create Event</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Event Name</Label>
              <Input {...register("name")} />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>
            <div>
              <Label>Budget Type</Label>
              <Select {...register("budgetType")}>
                <option value={BUDGET_TYPES.PER_EMPLOYEE}>Per Employee</option>
                <option value={BUDGET_TYPES.PER_EVENT}>Per Event</option>
              </Select>
            </div>
            <div>
              <Label>Start Date</Label>
              <Input type="date" {...register("startDate")} />
              {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>}
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" {...register("endDate")} />
              {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>}
            </div>
            {budgetType === BUDGET_TYPES.PER_EVENT && (
              <div>
                <Label>Event Budget (INR)</Label>
                <Input type="number" step="0.01" {...register("eventBudget")} />
                {errors.eventBudget && <p className="mt-1 text-sm text-red-600">{errors.eventBudget.message}</p>}
              </div>
            )}
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Textarea {...register("description")} />
            </div>
          </div>

          <div>
            <Label>Assigned Employees & Pre-approved Budgets</Label>
            {fields.map((field, index) => (
              <div key={field.id} className="mt-2 flex flex-wrap gap-2">
                <Select className="min-w-[200px]" {...register(`assignedEmployees.${index}.employeeId`)}>
                  <option value="">Select employee</option>
                  {formAvailableForIndex(index).map((e) => (
                    <option key={e._id} value={e._id}>{e.name}</option>
                  ))}
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  className="w-40"
                  placeholder="Budget"
                  {...register(`assignedEmployees.${index}.preApprovedBudget`)}
                />
                {fields.length > 1 && (
                  <Button type="button" variant="ghost" onClick={() => remove(index)}>Remove</Button>
                )}
              </div>
            ))}
            {errors.assignedEmployees && (
              <p className="mt-1 text-sm text-red-600">{errors.assignedEmployees.message}</p>
            )}
            <Button
              type="button"
              variant="secondary"
              className="mt-2"
              onClick={() => append({ employeeId: "", preApprovedBudget: 0 })}
            >
              Add Employee
            </Button>
          </div>

          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <Button type="submit" disabled={isSubmitting}>Create Event</Button>
        </form>
      </Card>

      <Card>
        <DataTable
          endpoint="/api/events"
          exportTable="events"
          refreshKey={refreshKey}
          filters={[
            {
              key: "status",
              label: "All Status",
              options: [
                { label: "Active", value: "ACTIVE" },
                { label: "Closed", value: "CLOSED" },
              ],
            },
          ]}
          columns={[
            { key: "name", header: "Event" },
            {
              key: "budgetType",
              header: "Budget Type",
              render: (r) => formatStatus(String(r.budgetType)),
            },
            {
              key: "eventBudget",
              header: "Event Budget",
              render: (r) => (r.eventBudget ? formatINR(Number(r.eventBudget)) : "-"),
            },
            { key: "startDate", header: "Start", render: (r) => formatDate(String(r.startDate)) },
            { key: "endDate", header: "End", render: (r) => formatDate(String(r.endDate)) },
            { key: "status", header: "Status" },
            {
              key: "actions",
              header: "Actions",
              render: (r) =>
                r.budgetType === BUDGET_TYPES.PER_EMPLOYEE ? (
                  <Button variant="secondary" onClick={(e) => { e.stopPropagation(); openManage(r); }}>
                    Manage Employees
                  </Button>
                ) : null,
            },
          ]}
        />
      </Card>

      <Modal
        open={!!manageEvent}
        onClose={() => setManageEvent(null)}
        title={`Manage Employees — ${String(manageEvent?.name || "")}`}
      >
        <div className="max-h-[70vh] overflow-y-auto">
          <table className="mb-4 w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="pb-2">Employee</th>
                <th className="pb-2">Budget</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignedList.map((a) => (
                <tr key={a.employeeId} className="border-t">
                  <td className="py-2">{a.name || a.employeeId}</td>
                  <td className="py-2">{formatINR(a.preApprovedBudget)}</td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setEditAssignment(a);
                          setEditBudget(String(a.preApprovedBudget));
                        }}
                      >
                        Edit
                      </Button>
                      <Button variant="danger" onClick={() => setDeleteAssignment(a)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t pt-4">
            <Label>Add Employee</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              <Select
                className="min-w-[180px]"
                value={addEmployeeId}
                onChange={(e) => setAddEmployeeId(e.target.value)}
              >
                <option value="">Select employee</option>
                {manageAvailable.map((e) => (
                  <option key={e._id} value={e._id}>{e.name}</option>
                ))}
              </Select>
              <Input
                type="number"
                step="0.01"
                className="w-32"
                placeholder="Budget"
                value={addBudget}
                onChange={(e) => setAddBudget(e.target.value)}
              />
              <Button variant="secondary" onClick={addEmployeeToEvent}>Add</Button>
            </div>
            {addError && <p className="mt-1 text-sm text-red-600">{addError}</p>}
          </div>
        </div>
        <Button className="mt-4 w-full" variant="ghost" onClick={() => setManageEvent(null)}>
          Close
        </Button>
      </Modal>

      <Modal open={!!editAssignment} onClose={() => setEditAssignment(null)} title="Edit Budget">
        <Label>Pre-approved Budget (INR)</Label>
        <Input
          type="number"
          step="0.01"
          value={editBudget}
          onChange={(e) => setEditBudget(e.target.value)}
        />
        <div className="mt-4 flex gap-2">
          <Button onClick={saveEditAssignment}>Save</Button>
          <Button variant="ghost" onClick={() => setEditAssignment(null)}>Cancel</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteAssignment}
        title="Remove Employee"
        message={`Remove ${deleteAssignment?.name || "this employee"} from the event?`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={confirmRemoveAssignment}
        onCancel={() => setDeleteAssignment(null)}
      />
    </div>
  );
}
