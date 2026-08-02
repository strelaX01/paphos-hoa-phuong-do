import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { ADMIN_SESSION_COOKIE } from "@/lib/adminSessionToken";
import { getStoredAdminSession } from "@/lib/adminSessionStore";

export async function getCurrentAdminSession() {
  const cookieStore = await cookies();
  return getStoredAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function getAdminAccountForToken(token, options) {
  const session = await getStoredAdminSession(token, options);
  if (!session) return null;

  if (session.role === "DRIVER") {
    const driver = await prisma.driverAccount.findFirst({
      where: { id: session.userId, status: "ACTIVE" },
      select: { id: true, name: true, username: true, mustChangePassword: true },
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
  }).then((admin) => admin ? { ...admin, mustChangePassword: false } : null);
}

export async function getCurrentAdminAccount() {
  const cookieStore = await cookies();
  return getAdminAccountForToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export const getCurrentAdminUser = getCurrentAdminAccount;
