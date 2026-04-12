import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAccountTransactions, getAccountBalances } from "@/lib/gocardless";
import { categorizeTransaction } from "@/lib/categorizer";
import { detectRecurringTransactions } from "@/lib/recurring-detector";
import { checkBudgetAlerts } from "@/lib/notifications";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const activeConnections = await prisma.bankConnection.findMany({
      where: { status: "ACTIVE" },
      include: {
        accounts: true,
        user: { select: { id: true } },
      },
    });

    let totalSynced = 0;

    for (const connection of activeConnections) {
      for (const account of connection.accounts) {
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
          const transactions = txData.transactions?.booked || [];

          for (const tx of transactions) {
            const externalId =
              tx.transactionId ||
              tx.internalTransactionId ||
              `${tx.bookingDate}-${tx.transactionAmount?.amount}-${tx.remittanceInformationUnstructured}`;

            const existing = await prisma.transaction.findFirst({
              where: { externalId, accountId: account.id },
            });

            if (existing) continue;

            const amount = parseFloat(tx.transactionAmount?.amount || "0");
            const description =
              tx.remittanceInformationUnstructured ||
              tx.remittanceInformationUnstructuredArray?.join(" ") ||
              "Transaction";
            const merchantName = tx.creditorName || tx.debtorName || null;

            const categoryId = await categorizeTransaction(
              connection.userId,
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
        } catch (e) {
          console.error(`Cron sync error for account ${account.id}:`, e);
        }
      }

      await prisma.bankConnection.update({
        where: { id: connection.id },
        data: { lastSyncAt: new Date() },
      });

      await detectRecurringTransactions(connection.userId);
      await checkBudgetAlerts(connection.userId);
    }

    return NextResponse.json({ synced: totalSynced });
  } catch (error) {
    console.error("Cron sync error:", error);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
