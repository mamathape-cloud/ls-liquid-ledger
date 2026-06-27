"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/layout/ThunderModules";
import { formatINR, formatStatus } from "@/lib/utils";
import { downloadFile } from "@/lib/download";

export default function ReportsPage() {
  const [summary, setSummary] = useState<{
    totalClaims: number;
    totalEvents: number;
    totalEmployees: number;
    totalBatches: number;
    totalAmount: number;
    byStatus: { _id: string; count: number; total: number }[];
  } | null>(null);
  const [reportType, setReportType] = useState("org");
  const [events, setEvents] = useState<{ _id: string; name: string }[]>([]);
  const [employees, setEmployees] = useState<{ _id: string; name: string }[]>([]);
  const [eventId, setEventId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [reportRows, setReportRows] = useState<Record<string, unknown>[]>([]);
  const [reportTotal, setReportTotal] = useState(0);
  const [reportLoaded, setReportLoaded] = useState(false);
  const [reportError, setReportError] = useState("");
  const [loadingReport, setLoadingReport] = useState(false);
  const [exporting, setExporting] = useState<"csv" | "xlsx" | null>(null);

  useEffect(() => {
    fetch("/api/reports?type=org")
      .then((r) => r.json())
      .then((d) => setSummary(d.summary));
    fetch("/api/events?limit=200")
      .then((r) => r.json())
      .then((d) => setEvents(d.data || []));
    fetch("/api/users?filter.role=EMPLOYEE&limit=200")
      .then((r) => r.json())
      .then((d) => setEmployees(d.data || []));
  }, []);

  const loadReport = async () => {
    setReportError("");
    setReportLoaded(false);
    setLoadingReport(true);

    try {
      if (reportType === "event" && !eventId) {
        setReportError("Please select an event");
        return;
      }
      if (reportType === "employee" && !employeeId) {
        setReportError("Please select an employee");
        return;
      }

      const params = new URLSearchParams({ type: reportType, detail: "true" });
      if (reportType === "event") params.set("eventId", eventId);
      if (reportType === "employee") params.set("employeeId", employeeId);

      const res = await fetch(`/api/reports?${params}`);
      const json = await res.json();

      if (!res.ok) {
        setReportError(json.message || "Failed to load report");
        return;
      }

      setReportRows(json.rows || []);
      setReportTotal(json.total ?? json.rows?.length ?? 0);
      setReportLoaded(true);
    } finally {
      setLoadingReport(false);
    }
  };

  const exportReport = async (format: "csv" | "xlsx") => {
    setReportError("");
    setExporting(format);

    try {
      if (reportType === "event" && !eventId) {
        setReportError("Please select an event");
        return;
      }
      if (reportType === "employee" && !employeeId) {
        setReportError("Please select an employee");
        return;
      }

      const params = new URLSearchParams({ type: reportType, format });
      if (reportType === "event") params.set("eventId", eventId);
      if (reportType === "employee") params.set("employeeId", employeeId);

      await downloadFile(`/api/reports?${params}`);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(null);
    }
  };

  const rowHeaders = useMemo(
    () => (reportRows.length ? Object.keys(reportRows[0]) : []),
    [reportRows]
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" />

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card><p className="text-sm text-slate-500">Total Claims</p><p className="text-xl font-bold sm:text-2xl">{summary.totalClaims}</p></Card>
          <Card><p className="text-sm text-slate-500">Total Events</p><p className="text-xl font-bold sm:text-2xl">{summary.totalEvents}</p></Card>
          <Card><p className="text-sm text-slate-500">Employees</p><p className="text-xl font-bold sm:text-2xl">{summary.totalEmployees}</p></Card>
          <Card><p className="text-sm text-slate-500">Total Amount</p><p className="text-xl font-bold sm:text-2xl">{formatINR(summary.totalAmount)}</p></Card>
        </div>
      )}

      {summary?.byStatus && (
        <Card>
          <h2 className="mb-4 font-semibold">Claims by Status</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Count</th>
                  <th className="pb-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {summary.byStatus.map((s) => (
                  <tr key={s._id} className="border-t">
                    <td className="py-2 pr-4">{formatStatus(s._id)}</td>
                    <td className="py-2 pr-4">{s.count}</td>
                    <td className="py-2">{formatINR(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-4 font-semibold">Export Reports</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label>Report Type</Label>
            <Select
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value);
                setReportLoaded(false);
                setReportRows([]);
              }}
            >
              <option value="org">Organisation (all claims)</option>
              <option value="event">Per Event</option>
              <option value="employee">Per Employee</option>
            </Select>
          </div>
          {reportType === "event" && (
            <div>
              <Label>Event</Label>
              <Select value={eventId} onChange={(e) => setEventId(e.target.value)}>
                <option value="">Select event</option>
                {events.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
              </Select>
            </div>
          )}
          {reportType === "employee" && (
            <div>
              <Label>Employee</Label>
              <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                <option value="">Select employee</option>
                {employees.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
              </Select>
            </div>
          )}
        </div>
        {reportError && <p className="mt-2 text-sm text-red-600">{reportError}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={loadReport} disabled={loadingReport}>
            {loadingReport ? "Loading..." : "Load Report"}
          </Button>
          {reportLoaded && (
            <>
              <Button
                variant="secondary"
                disabled={!!exporting}
                onClick={() => exportReport("csv")}
              >
                {exporting === "csv" ? "Exporting..." : "Export CSV"}
              </Button>
              <Button
                variant="secondary"
                disabled={!!exporting}
                onClick={() => exportReport("xlsx")}
              >
                {exporting === "xlsx" ? "Exporting..." : "Export Excel"}
              </Button>
            </>
          )}
        </div>

        {reportLoaded && (
          <div className="mt-6">
            <p className="mb-2 text-sm text-slate-600">
              {reportTotal} record{reportTotal === 1 ? "" : "s"} found
            </p>
            <div className="overflow-x-auto rounded-lg border">
              {reportRows.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">No records found.</p>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {rowHeaders.map((h) => (
                        <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-medium text-slate-600 sm:px-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportRows.map((row, idx) => (
                      <tr key={idx} className="border-t">
                        {rowHeaders.map((h) => (
                          <td key={h} className="whitespace-nowrap px-3 py-2 text-slate-900 sm:px-4">
                            {h === "Amount" && typeof row[h] === "number"
                              ? formatINR(row[h] as number)
                              : String(row[h] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
