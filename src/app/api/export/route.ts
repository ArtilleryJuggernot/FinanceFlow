import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const formatType = searchParams.get("format") || "csv";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const accountId = searchParams.get("accountId");
    const categoryId = searchParams.get("categoryId");

    const where: Record<string, unknown> = {
      account: { userId: session.user.id },
    };

    if (accountId) where.accountId = accountId;
    if (categoryId) where.categoryId = categoryId;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) (where.date as Record<string, unknown>).gte = new Date(dateFrom);
      if (dateTo) (where.date as Record<string, unknown>).lte = new Date(dateTo);
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: true,
        account: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    });

    if (formatType === "csv") {
      const headers = ["Date", "Compte", "Description", "Marchand", "Catégorie", "Montant", "Devise"];
      const rows = transactions.map((tx) => [
        format(new Date(tx.date), "dd/MM/yyyy", { locale: fr }),
        tx.account.name,
        `"${tx.description.replace(/"/g, '""')}"`,
        tx.merchantName || "",
        tx.category?.name || "Non catégorisé",
        tx.amount.toFixed(2).replace(".", ","),
        tx.currency,
      ]);

      const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="transactions_${format(new Date(), "yyyy-MM-dd")}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: "Format non supporté" }, { status: 400 });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Erreur lors de l'export" }, { status: 500 });
  }
}
