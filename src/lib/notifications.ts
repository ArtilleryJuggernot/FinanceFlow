import prisma from "./prisma";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.startsWith("your-")
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  sendEmail = false
) {
  const notification = await prisma.notification.create({
    data: { userId, type, title, message },
  });

  if (sendEmail && resend) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (user) {
        await resend.emails.send({
          from: "FinanceFlow <notifications@financeflow.app>",
          to: user.email,
          subject: title,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 20px;">FinanceFlow</h1>
              </div>
              <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                <h2 style="color: #111827; margin-top: 0;">${title}</h2>
                <p style="color: #6b7280;">${message}</p>
                <a href="${process.env.NEXTAUTH_URL}" style="display: inline-block; background: #4f46e5; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; margin-top: 10px;">
                  Voir dans l'application
                </a>
              </div>
            </div>
          `,
        });
      }
    } catch (e) {
      console.error("Email send error:", e);
    }
  }

  return notification;
}

export async function checkBudgetAlerts(userId: string) {
  const { startOfMonth, endOfMonth } = await import("date-fns");
  const now = new Date();

  const budgets = await prisma.budget.findMany({
    where: { userId },
    include: { category: true },
  });

  for (const budget of budgets) {
    const result = await prisma.transaction.aggregate({
      where: {
        categoryId: budget.categoryId,
        account: { userId },
        amount: { lt: 0 },
        date: { gte: startOfMonth(now), lte: endOfMonth(now) },
      },
      _sum: { amount: true },
    });

    const spent = Math.abs(result._sum.amount || 0);
    const ratio = spent / budget.amount;

    if (ratio >= 1) {
      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          type: "budget_exceeded",
          message: { contains: budget.category.name },
          createdAt: { gte: startOfMonth(now) },
        },
      });

      if (!existing) {
        await createNotification(
          userId,
          "budget_exceeded",
          "Budget dépassé !",
          `Vous avez dépensé ${spent.toFixed(2)}€ sur un budget de ${budget.amount.toFixed(2)}€ pour "${budget.category.name}".`,
          true
        );
      }
    } else if (ratio >= budget.alertThreshold) {
      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          type: "budget_warning",
          message: { contains: budget.category.name },
          createdAt: { gte: startOfMonth(now) },
        },
      });

      if (!existing) {
        await createNotification(
          userId,
          "budget_warning",
          "Attention budget",
          `Vous avez utilisé ${Math.round(ratio * 100)}% de votre budget "${budget.category.name}" (${spent.toFixed(2)}€ / ${budget.amount.toFixed(2)}€).`,
          false
        );
      }
    }
  }
}
