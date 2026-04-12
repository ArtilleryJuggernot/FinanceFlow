import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import {
  createAgreement,
  createRequisition,
} from "@/lib/gocardless";
import prisma from "@/lib/prisma";

const connectSchema = z.object({
  institutionId: z.string(),
  institutionName: z.string(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { institutionId, institutionName } = connectSchema.parse(body);

    const agreement = await createAgreement(institutionId);

    const redirectUrl = `${process.env.NEXTAUTH_URL}/api/bank/callback`;
    const reference = `user-${session.user.id}-${Date.now()}`;

    const requisition = await createRequisition(
      institutionId,
      redirectUrl,
      agreement.id,
      reference
    );

    await prisma.bankConnection.create({
      data: {
        userId: session.user.id,
        institutionId,
        institutionName,
        requisitionId: requisition.id,
        agreementId: agreement.id,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({ link: requisition.link });
  } catch (error) {
    console.error("Bank connect error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la connexion bancaire" },
      { status: 500 }
    );
  }
}
