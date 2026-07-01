"use client";

import { useState } from "react";
import { DataTable } from "@/components/DataTable";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/layout/ThunderModules";
import { formatStatus } from "@/lib/utils";
import { downloadFile } from "@/lib/download";

export default function AllProfilesPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [exporting, setExporting] = useState<"csv" | "xlsx" | null>(null);

  const exportProfiles = async (format: "csv" | "xlsx") => {
    setExporting(format);
    try {
      await downloadFile(`/api/profiles?format=${format}`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="All Profiles">
        <Button
          variant="secondary"
          disabled={!!exporting}
          onClick={() => exportProfiles("csv")}
        >
          {exporting === "csv" ? "Exporting..." : "Export CSV"}
        </Button>
        <Button
          variant="secondary"
          disabled={!!exporting}
          onClick={() => exportProfiles("xlsx")}
        >
          {exporting === "xlsx" ? "Exporting..." : "Export Excel"}
        </Button>
      </PageHeader>

      <Card>
        <DataTable
          endpoint="/api/profiles"
          refreshKey={refreshKey}
          filters={[
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
            {
              key: "roleSlug",
              header: "Role",
              render: (r) => formatStatus(String(r.roleSlug)),
            },
            { key: "status", header: "Status" },
            {
              key: "upiId",
              header: "UPI ID",
              render: (r) => String((r.bankDetails as { upiId?: string })?.upiId || "—"),
            },
            {
              key: "accountName",
              header: "Account Name",
              render: (r) => String((r.bankDetails as { accountName?: string })?.accountName || "—"),
            },
            {
              key: "accountNumber",
              header: "Account No.",
              render: (r) => String((r.bankDetails as { accountNumber?: string })?.accountNumber || "—"),
            },
            {
              key: "ifsc",
              header: "IFSC",
              render: (r) => String((r.bankDetails as { ifsc?: string })?.ifsc || "—"),
            },
          ]}
        />
      </Card>
    </div>
  );
}
