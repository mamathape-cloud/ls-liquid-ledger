"use client";

import { useState } from "react";
import { DataTable } from "@/components/DataTable";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { ProofLinks } from "@/components/ProofLinks";
import { formatINR, formatDate, formatStatus } from "@/lib/utils";
import { CLAIM_STATUSES } from "@/lib/constants";

export default function FinanceDisbursePage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [paymentRef, setPaymentRef] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const disburse = async () => {
    setError("");
    setSuccess("");
    if (!selected.length || !paymentRef.trim()) {
      setError("Select claims and enter payment reference");
      return;
    }
    const res = await fetch("/api/claims/disburse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claimIds: selected, paymentRef }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.message || "Disbursement failed");
      return;
    }
    setSuccess(`Marked ${json.updated} claim(s) as disbursed`);
    setSelected([]);
    setPaymentRef("");
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Disburse Payments</h1>
      <Card>
        <p className="mb-4 text-sm text-slate-500">
          Select director-approved claims and mark them as disbursed after payment is processed.
        </p>

        <DataTable
          endpoint="/api/claims"
          refreshKey={refreshKey}
          extraParams={{ "filter.status": CLAIM_STATUSES.DIRECTOR_APPROVED }}
          columns={[
            {
              key: "select",
              header: "Select",
              render: (r) => (
                <input
                  type="checkbox"
                  checked={selected.includes(String(r._id))}
                  onChange={() => toggle(String(r._id))}
                  onClick={(e) => e.stopPropagation()}
                />
              ),
            },
            { key: "claimId", header: "Claim ID" },
            { key: "employeeName", header: "Employee" },
            { key: "eventName", header: "Event" },
            { key: "amount", header: "Amount", render: (r) => formatINR(Number(r.amount)) },
            { key: "claimDate", header: "Date", render: (r) => formatDate(String(r.claimDate)) },
            {
              key: "proofFiles",
              header: "Proof",
              render: (r) => <ProofLinks files={r.proofFiles} />,
            },
            { key: "status", header: "Status", render: (r) => formatStatus(String(r.status)) },
          ]}
        />

        <div className="mt-4 max-w-md">
          <Label>Payment Reference</Label>
          <Input
            value={paymentRef}
            onChange={(e) => setPaymentRef(e.target.value)}
            placeholder="UTR / transaction ID"
          />
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {success && <p className="mt-2 text-sm text-green-600">{success}</p>}
        <Button className="mt-4" onClick={disburse}>
          Mark Selected as Disbursed ({selected.length})
        </Button>
      </Card>
    </div>
  );
}
