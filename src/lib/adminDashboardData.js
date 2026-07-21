import { prisma } from "@/lib/prisma";

const TIME_ZONE = "Asia/Nicosia";
const FINAL_RESERVATION_STATUSES = ["CANCELLED", "NO_SHOW"];

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function dateKey(date) {
  const parts = dateKeyFormatter.formatToParts(date);
  const read = (type) => parts.find((part) => part.type === type)?.value;
  return `${read("year")}-${read("month")}-${read("day")}`;
}

function shiftDateKey(key, days) {
  const [year, month, day] = key.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

function timeZoneOffsetMs(date) {
  const value = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    timeZoneName: "shortOffset",
  }).formatToParts(date).find((part) => part.type === "timeZoneName")?.value || "GMT";
  const match = value.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3] || 0);
  return (match[1] === "-" ? -minutes : minutes) * 60 * 1000;
}

function localMidnightUtc(key) {
  const [year, month, day] = key.split("-").map(Number);
  const wallClock = Date.UTC(year, month - 1, day);
  let result = new Date(wallClock);
  for (let index = 0; index < 2; index += 1) {
    result = new Date(wallClock - timeZoneOffsetMs(result));
  }
  return result;
}

function minutesBetween(start, end) {
  if (!start || !end) return null;
  const minutes = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  return minutes >= 0 ? minutes : null;
}

export async function getAdminDashboardData() {
  const todayKey = dateKey(new Date());
  const yesterdayKey = shiftDateKey(todayKey, -1);
  const firstChartKey = shiftDateKey(todayKey, -6);
  const todayStart = localMidnightUtc(todayKey);
  const tomorrowStart = localMidnightUtc(shiftDateKey(todayKey, 1));
  const chartStart = localMidnightUtc(firstChartKey);

  const [orders, recentOrders, todayReservations, upcomingReservations, statusGroups] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: chartStart, lt: tomorrowStart } },
      select: {
        id: true,
        status: true,
        total: true,
        prepTargetMins: true,
        confirmedAt: true,
        pickedUpAt: true,
        deliveredAt: true,
        createdAt: true,
        items: { select: { name: true, quantity: true, lineTotal: true } },
      },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        total: true,
        status: true,
        createdAt: true,
        items: { orderBy: { createdAt: "asc" }, select: { name: true, quantity: true } },
      },
    }),
    prisma.reservation.findMany({
      where: { date: { gte: todayStart, lt: tomorrowStart }, status: { notIn: FINAL_RESERVATION_STATUSES } },
      select: { partySize: true, status: true },
    }),
    prisma.reservation.findMany({
      where: { date: { gte: todayStart }, status: { in: ["PENDING", "CONFIRMED"] } },
      orderBy: [{ date: "asc" }, { time: "asc" }],
      take: 5,
      select: { id: true, customerName: true, partySize: true, date: true, time: true, status: true },
    }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const todayOrders = orders.filter((order) => dateKey(order.createdAt) === todayKey);
  const yesterdayOrders = orders.filter((order) => dateKey(order.createdAt) === yesterdayKey);
  const revenue = (entries) => entries
    .filter((order) => order.status !== "CANCELLED")
    .reduce((sum, order) => sum + Number(order.total), 0);
  const todayRevenue = revenue(todayOrders);
  const yesterdayRevenue = revenue(yesterdayOrders);

  const prepDurations = todayOrders
    .map((order) => ({ minutes: minutesBetween(order.confirmedAt, order.pickedUpAt), target: order.prepTargetMins }))
    .filter((entry) => entry.minutes !== null);
  const averagePrepMinutes = prepDurations.length
    ? Math.round(prepDurations.reduce((sum, entry) => sum + entry.minutes, 0) / prepDurations.length)
    : null;
  const measuredTargets = prepDurations.filter((entry) => Number.isInteger(entry.target) && entry.target > 0);
  const prepTargetRate = measuredTargets.length
    ? Math.round((measuredTargets.filter((entry) => entry.minutes <= entry.target).length / measuredTargets.length) * 100)
    : null;

  const chart = Array.from({ length: 7 }, (_, index) => {
    const key = shiftDateKey(firstChartKey, index);
    const dayOrders = orders.filter((order) => dateKey(order.createdAt) === key);
    return {
      key,
      day: new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`)),
      revenue: revenue(dayOrders),
      orders: dayOrders.length,
    };
  });

  const popularMap = new Map();
  for (const order of todayOrders) {
    if (order.status === "CANCELLED") continue;
    for (const item of order.items) {
      const current = popularMap.get(item.name) || { name: item.name, sold: 0, revenue: 0 };
      current.sold += item.quantity;
      current.revenue += Number(item.lineTotal);
      popularMap.set(item.name, current);
    }
  }
  const popularItems = [...popularMap.values()]
    .sort((left, right) => right.sold - left.sold || right.revenue - left.revenue)
    .slice(0, 5);

  const statusCounts = Object.fromEntries(statusGroups.map((entry) => [entry.status, entry._count._all]));
  const operationalStatus = {
    pending: statusCounts.PENDING || 0,
    kitchen: ["CONFIRMED", "PREPARING", "ASSIGNED", "PENDING_PICKUP"].reduce((sum, status) => sum + (statusCounts[status] || 0), 0),
    delivery: ["PICKED_UP", "EN_ROUTE"].reduce((sum, status) => sum + (statusCounts[status] || 0), 0),
    deliveredToday: todayOrders.filter((order) => order.status === "DELIVERED").length,
  };

  return {
    todayKey,
    todayRevenue,
    yesterdayRevenue,
    ordersToday: todayOrders.length,
    pendingToday: todayOrders.filter((order) => order.status === "PENDING").length,
    reservationsToday: todayReservations.length,
    seatsToday: todayReservations.reduce((sum, reservation) => sum + reservation.partySize, 0),
    averagePrepMinutes,
    measuredPrepOrders: prepDurations.length,
    prepTargetRate,
    deliveredToday: todayOrders.filter((order) => order.deliveredAt || order.status === "DELIVERED").length,
    cancelledToday: todayOrders.filter((order) => order.status === "CANCELLED").length,
    weekRevenue: chart.reduce((sum, entry) => sum + entry.revenue, 0),
    chart,
    popularItems,
    operationalStatus,
    recentOrders: recentOrders.map((order) => ({
      ...order,
      total: Number(order.total),
      createdAt: order.createdAt.toISOString(),
    })),
    upcomingReservations: upcomingReservations.map((reservation) => ({
      ...reservation,
      date: reservation.date.toISOString(),
    })),
  };
}
