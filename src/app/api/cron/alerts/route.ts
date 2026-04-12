import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkBudgetAlerts } from "@/lib/notifications";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      select: { id: true },
    });

    for (const user of users) {
      await checkBudgetAlerts(user.id);
    }

    return NextResponse.json({ checked: users.length });
  } catch (error) {
    console.error("Cron alerts error:", error);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
