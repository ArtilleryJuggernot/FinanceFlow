import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getInstitutions } from "@/lib/gocardless";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country") || "FR";

    const institutions = await getInstitutions(country);

    return NextResponse.json(institutions);
  } catch (error) {
    console.error("Institutions error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des banques" },
      { status: 500 }
    );
  }
}
