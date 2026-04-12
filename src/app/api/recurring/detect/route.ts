import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { detectRecurringTransactions } from "@/lib/recurring-detector";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const recurring = await detectRecurringTransactions(session.user.id);

    return NextResponse.json({ detected: recurring.length, items: recurring });
  } catch (error) {
    console.error("Detect recurring error:", error);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
