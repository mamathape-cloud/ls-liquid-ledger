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
import { useAuth } from "@/hooks/useAuth";

type BankForm = z.infer<typeof bankDetailsSchema>;

export default function EmployeeProfilePage() {
  const { user } = useAuth();
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

  useEffect(() => {
    if (!user) return;
    fetch(`/api/users/${user.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.user?.bankDetails) reset(d.user.bankDetails);
      });
  }, [user, reset]);

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
    setMessage("Payment details updated successfully");
  };

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>
      <Card>
        <h2 className="mb-4 font-semibold">Payment Details</h2>
        <p className="mb-4 text-sm text-slate-500">
          Add your UPI ID and/or bank account details for reimbursements.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}
          <Button type="submit" disabled={isSubmitting}>Save Details</Button>
        </form>
      </Card>
    </div>
  );
}
