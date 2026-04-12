import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAccountTransactions, getAccountBalances } from "@/lib/gocardless";
import prisma from "@/lib/prisma";
import { categorizeTransaction } from "@/lib/categorizer";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const accountId = body.accountId;

    const whereClause = accountId
      ? { id: accountId, userId: session.user.id, isManual: false }
      : { userId: session.user.id, isManual: false };

    const accounts = await prisma.account.findMany({
      where: whereClause,
    });

    let totalSynced = 0;

    for (const account of accounts) {
      if (!account.externalId) continue;

      try {
        const balances = await getAccountBalances(account.externalId);
        const balance = balances.balances?.[0]?.balanceAmount?.amount
          ? parseFloat(balances.balances[0].balanceAmount.amount)
          : account.balance;

        await prisma.account.update({
          where: { id: account.id },
          data: { balance },
        });

        const txData = await getAccountTransactions(account.externalId);
        const transactions = [
          ...(txData.transactions?.booked || []),
        ];

        for (const tx of transactions) {
          const externalId =
            tx.transactionId || tx.internalTransactionId || `${tx.bookingDate}-${tx.transactionAmount?.amount}-${tx.remittanceInformationUnstructured}`;

          const existing = await prisma.transaction.findFirst({
            where: { externalId, accountId: account.id },
          });

          if (existing) continue;

          const amount = parseFloat(tx.transactionAmount?.amount || "0");
          const description =
            tx.remittanceInformationUnstructured ||
            tx.remittanceInformationUnstructuredArray?.join(" ") ||
            tx.creditorName ||
            tx.debtorName ||
            "Transaction";
          const merchantName = tx.creditorName || tx.debtorName || null;

          const categoryId = await categorizeTransaction(
            session.user.id,
            description,
            merchantName,
            amount
          );

          await prisma.transaction.create({
            data: {
              accountId: account.id,
              externalId,
              date: new Date(tx.bookingDate || tx.valueDate),
              amount,
              currency: tx.transactionAmount?.currency || "EUR",
              description,
              merchantName,
              categoryId,
            },
          });

          totalSynced++;
        }

        if (account.bankConnectionId) {
          await prisma.bankConnection.update({
            where: { id: account.bankConnectionId },
            data: { lastSyncAt: new Date() },
          });
        }
      } catch (e) {
        console.error(`Error syncing account ${account.id}:`, e);
      }
    }

    return NextResponse.json({ synced: totalSynced });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la synchronisation" },
      { status: 500 }
    );
  }
}
