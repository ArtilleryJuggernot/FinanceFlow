import { NextResponse } from "next/server";
import { getRequisition, getAccountDetails, getAccountBalances } from "@/lib/gocardless";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ref = searchParams.get("ref");

    if (!ref) {
      return NextResponse.redirect(new URL("/accounts?error=missing_ref", request.url));
    }

    const bankConnection = await prisma.bankConnection.findFirst({
      where: {
        requisitionId: {
          not: undefined,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!bankConnection) {
      return NextResponse.redirect(new URL("/accounts?error=not_found", request.url));
    }

    const requisition = await getRequisition(bankConnection.requisitionId);

    if (requisition.status !== "LN") {
      await prisma.bankConnection.update({
        where: { id: bankConnection.id },
        data: { status: "ERROR" },
      });
      return NextResponse.redirect(new URL("/accounts?error=auth_failed", request.url));
    }

    await prisma.bankConnection.update({
      where: { id: bankConnection.id },
      data: { status: "ACTIVE", lastSyncAt: new Date() },
    });

    for (const accountId of requisition.accounts) {
      try {
        const details = await getAccountDetails(accountId);
        const balances = await getAccountBalances(accountId);

        const balance = balances.balances?.[0]?.balanceAmount?.amount
          ? parseFloat(balances.balances[0].balanceAmount.amount)
          : 0;

        await prisma.account.upsert({
          where: {
            id: accountId,
          },
          create: {
            id: accountId,
            userId: bankConnection.userId,
            bankConnectionId: bankConnection.id,
            externalId: accountId,
            name: details.account?.name || details.account?.product || "Compte bancaire",
            iban: details.account?.iban || null,
            currency: details.account?.currency || "EUR",
            balance,
            type: details.account?.cashAccountType || "checking",
          },
          update: {
            balance,
            name: details.account?.name || details.account?.product || "Compte bancaire",
          },
        });
      } catch (e) {
        console.error(`Error syncing account ${accountId}:`, e);
      }
    }

    return NextResponse.redirect(new URL("/accounts?success=connected", request.url));
  } catch (error) {
    console.error("Bank callback error:", error);
    return NextResponse.redirect(new URL("/accounts?error=unknown", request.url));
  }
}
