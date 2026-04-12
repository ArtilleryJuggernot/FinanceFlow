import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseCSV, parseOFX, parseXLSX, type CSVMapping } from "@/lib/csv-parser";
import { categorizeTransaction } from "@/lib/categorizer";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const accountId = formData.get("accountId") as string;
    const mappingStr = formData.get("mapping") as string;
    const autoCreateAccount = formData.get("autoCreateAccount") === "true";

    if (!file) {
      return NextResponse.json(
        { error: "Fichier requis" },
        { status: 400 }
      );
    }

    const filename = file.name.toLowerCase();
    let parsedTransactions;
    let resolvedAccountId = accountId;
    let accountCreated = false;

    if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
      const buffer = await file.arrayBuffer();
      const result = parseXLSX(buffer);
      parsedTransactions = result.transactions;

      // Auto-create account from XLSX metadata if no accountId given
      if ((!resolvedAccountId || autoCreateAccount) && result.accountInfo) {
        const existingAccount = await prisma.account.findFirst({
          where: {
            userId: session.user.id,
            name: { contains: result.accountInfo.number || result.accountInfo.name },
          },
        });

        if (existingAccount) {
          resolvedAccountId = existingAccount.id;
          // Update balance from file
          await prisma.account.update({
            where: { id: existingAccount.id },
            data: { balance: result.accountInfo.balance },
          });
        } else {
          const newAccount = await prisma.account.create({
            data: {
              userId: session.user.id,
              name: result.accountInfo.name
                ? `CA - ${result.accountInfo.name}`
                : `Crédit Agricole ${result.accountInfo.number}`,
              balance: result.accountInfo.balance,
              currency: "EUR",
              type: "checking",
              isManual: true,
              iban: null,
            },
          });
          resolvedAccountId = newAccount.id;
          accountCreated = true;
        }
      }
    } else if (filename.endsWith(".ofx") || filename.endsWith(".qfx")) {
      const content = await file.text();
      parsedTransactions = parseOFX(content);
    } else {
      const content = await file.text();
      if (!mappingStr) {
        return NextResponse.json(
          { error: "Mapping requis pour les fichiers CSV" },
          { status: 400 }
        );
      }
      const mapping: CSVMapping = JSON.parse(mappingStr);
      parsedTransactions = parseCSV(content, mapping);
    }

    if (!resolvedAccountId) {
      return NextResponse.json(
        { error: "Compte requis. Sélectionnez un compte ou importez un fichier XLSX bancaire." },
        { status: 400 }
      );
    }

    const account = await prisma.account.findFirst({
      where: { id: resolvedAccountId, userId: session.user.id },
    });

    if (!account) {
      return NextResponse.json({ error: "Compte non trouvé" }, { status: 404 });
    }

    let imported = 0;
    let skipped = 0;

    for (const tx of parsedTransactions) {
      const existing = await prisma.transaction.findFirst({
        where: { hash: tx.hash, accountId: resolvedAccountId },
      });

      if (existing) {
        skipped++;
        continue;
      }

      const categoryId = await categorizeTransaction(
        session.user.id,
        tx.description,
        tx.merchantName,
        tx.amount
      );

      await prisma.transaction.create({
        data: {
          accountId: resolvedAccountId,
          date: new Date(tx.date),
          amount: tx.amount,
          currency: tx.currency,
          description: tx.description,
          merchantName: tx.merchantName,
          hash: tx.hash,
          categoryId,
        },
      });

      imported++;
    }

    await prisma.importLog.create({
      data: {
        userId: session.user.id,
        filename: file.name,
        format: filename.endsWith(".xlsx") || filename.endsWith(".xls")
          ? "XLSX"
          : filename.endsWith(".ofx") || filename.endsWith(".qfx")
            ? "OFX"
            : "CSV",
        transactionCount: imported,
      },
    });

    return NextResponse.json({
      imported,
      skipped,
      total: parsedTransactions.length,
      accountId: resolvedAccountId,
      accountCreated,
    });
  } catch (error) {
    console.error("Import error:", error);
    const message = error instanceof Error ? error.message : "Erreur lors de l'import";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
