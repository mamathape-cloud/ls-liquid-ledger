import type { ExpenseHead } from "@/types";

export function headTotal(head: ExpenseHead): number {
  if (head.subHeads?.length) {
    return head.subHeads.reduce((sum, sh) => sum + (sh.amount || 0), 0);
  }
  return head.amount || 0;
}

export function planGrandTotal(heads: ExpenseHead[]): number {
  return heads.reduce((sum, head) => sum + headTotal(head), 0);
}

export function normalizeExpenseHeads(
  heads: ExpenseHead[]
): { name: string; amount?: number; subHeads: { name: string; amount: number }[] }[] {
  return heads.map((head) => {
    const subHeads = (head.subHeads || []).map((sh) => ({
      name: sh.name.trim(),
      amount: sh.amount ?? 0,
    }));
    if (subHeads.length > 0) {
      return { name: head.name.trim(), subHeads };
    }
    return {
      name: head.name.trim(),
      amount: head.amount ?? 0,
      subHeads: [],
    };
  });
}

export function flattenExpensePlanRows(
  eventName: string,
  heads: ExpenseHead[]
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (const head of heads) {
    if (head.subHeads?.length) {
      for (const sub of head.subHeads) {
        rows.push({
          Type: "Other Expense",
          Event: eventName,
          Head: head.name,
          "Sub-Head": sub.name,
          Amount: sub.amount,
        });
      }
    } else {
      rows.push({
        Type: "Other Expense",
        Event: eventName,
        Head: head.name,
        "Sub-Head": "",
        Amount: head.amount ?? 0,
      });
    }
  }
  return rows;
}

export interface SavedPlanRow {
  headIndex: number;
  subIndex: number | null;
  head: string;
  subHead: string;
  amount: number;
  headTotal: number;
}

export function planToTableRows(heads: ExpenseHead[]): SavedPlanRow[] {
  const rows: SavedPlanRow[] = [];
  heads.forEach((head, headIndex) => {
    if (head.subHeads?.length) {
      head.subHeads.forEach((sub, subIndex) => {
        rows.push({
          headIndex,
          subIndex,
          head: head.name,
          subHead: sub.name,
          amount: sub.amount ?? 0,
          headTotal: headTotal(head),
        });
      });
    } else {
      rows.push({
        headIndex,
        subIndex: null,
        head: head.name,
        subHead: "—",
        amount: head.amount ?? 0,
        headTotal: headTotal(head),
      });
    }
  });
  return rows;
}
