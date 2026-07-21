import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/adminSessionToken";

export async function getCurrentAdminSession() {
  const cookieStore = await cookies();
  return verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function getCurrentAdminAccount() {
  const session = await getCurrentAdminSession();
  if (!session) return null;

  if (session.role === "DRIVER") {
    const driver = await prisma.driverAccount.findFirst({
      where: { id: session.userId, status: "ACTIVE" },
      select: { id: true, name: true, username: true },
    });
    return driver ? { ...driver, role: "DRIVER" } : null;
  }

  return prisma.adminUser.findFirst({
    where: {
      id: session.userId,
      role: "ADMIN",
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });
}

export const getCurrentAdminUser = getCurrentAdminAccount;
