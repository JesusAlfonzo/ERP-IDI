import { prisma } from '../config/prisma.js';
import { RequestStatus } from '@prisma/client';

export interface CaracasTime {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  hours: number;
  minutes: number;
  seconds: number;
  isoWeeklyCycle: string;
}

export function getCaracasTime(date: Date = new Date()): CaracasTime {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  const year = parseInt(map.year ?? '0', 10);
  const month = parseInt(map.month ?? '1', 10);
  const day = parseInt(map.day ?? '1', 10);
  let hours = parseInt(map.hour ?? '0', 10);
  if (hours === 24) hours = 0;
  const minutes = parseInt(map.minute ?? '0', 10);
  const seconds = parseInt(map.second ?? '0', 10);

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek = map.weekday ? (weekdayMap[map.weekday] ?? 0) : 0;

  // Cálculo del ciclo ISO semanal basado en fecha Caracas
  const localDate = new Date(year, month - 1, day);
  const tempDate = new Date(localDate.getTime());
  tempDate.setHours(0, 0, 0, 0);
  tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7));
  const week1 = new Date(tempDate.getFullYear(), 0, 4);
  const weekNumber =
    1 +
    Math.round(
      ((tempDate.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    );
  const isoWeeklyCycle = `${tempDate.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;

  return {
    year,
    month,
    day,
    dayOfWeek,
    hours,
    minutes,
    seconds,
    isoWeeklyCycle,
  };
}

export class RequestWindowService {
  static async getConfig() {
    let config = await prisma.requestWindowConfig.findFirst();
    if (!config) {
      config = await prisma.requestWindowConfig.create({
        data: {
          startDay: 1, // Lunes
          startHour: 5, // 05:00 AM
          startMinute: 0,
          endDay: 3, // Miércoles
          endHour: 16, // 04:00 PM
          endMinute: 0,
          isSuspended: false,
          maxWeeklyRequestsPerUser: 1,
          timezone: 'America/Caracas',
        },
      });
    }
    return config;
  }

  static async updateConfig(data: {
    startDay?: number;
    startHour?: number;
    startMinute?: number;
    endDay?: number;
    endHour?: number;
    endMinute?: number;
    isSuspended?: boolean;
    maxWeeklyRequestsPerUser?: number;
    timezone?: string;
  }) {
    const current = await this.getConfig();
    return prisma.requestWindowConfig.update({
      where: { id: current.id },
      data: {
        ...(data.startDay !== undefined ? { startDay: data.startDay } : {}),
        ...(data.startHour !== undefined ? { startHour: data.startHour } : {}),
        ...(data.startMinute !== undefined
          ? { startMinute: data.startMinute }
          : {}),
        ...(data.endDay !== undefined ? { endDay: data.endDay } : {}),
        ...(data.endHour !== undefined ? { endHour: data.endHour } : {}),
        ...(data.endMinute !== undefined ? { endMinute: data.endMinute } : {}),
        ...(data.isSuspended !== undefined
          ? { isSuspended: data.isSuspended }
          : {}),
        ...(data.maxWeeklyRequestsPerUser !== undefined
          ? { maxWeeklyRequestsPerUser: data.maxWeeklyRequestsPerUser }
          : {}),
        ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
      },
    });
  }

  static isWindowOpen(
    config: {
      startDay: number;
      startHour: number;
      startMinute: number;
      endDay: number;
      endHour: number;
      endMinute: number;
      isSuspended: boolean;
    },
    caracasTime: CaracasTime = getCaracasTime()
  ): boolean {
    if (config.isSuspended) {
      return false;
    }

    const currentMinute =
      caracasTime.dayOfWeek * 1440 +
      caracasTime.hours * 60 +
      caracasTime.minutes;
    const startMinute =
      config.startDay * 1440 + config.startHour * 60 + config.startMinute;
    const endMinute =
      config.endDay * 1440 + config.endHour * 60 + config.endMinute;

    if (startMinute <= endMinute) {
      return currentMinute >= startMinute && currentMinute <= endMinute;
    }

    // Ventana que cruza el fin de semana (ej: Viernes a Lunes)
    return currentMinute >= startMinute || currentMinute <= endMinute;
  }

  static async getWindowStatus(user?: { id?: number; roles?: string[] }) {
    const config = await this.getConfig();
    const caracasTime = getCaracasTime();
    const isOpen = this.isWindowOpen(config, caracasTime);
    const roles = user?.roles ?? [];
    const isPrivileged =
      roles.includes('ADMINISTRADOR') || roles.includes('ALMACENISTA');

    let weeklyQuotaUsed = 0;
    let hasQuota = true;

    if (user?.id) {
      weeklyQuotaUsed = await prisma.request.count({
        where: {
          userId: user.id,
          weeklyTokenCycle: caracasTime.isoWeeklyCycle,
          status: { not: RequestStatus.RECHAZADA },
        },
      });
      hasQuota = weeklyQuotaUsed < config.maxWeeklyRequestsPerUser;
    }

    let message = '';
    if (config.isSuspended) {
      message = 'Ventana de solicitudes suspendida temporalmente por administración.';
    } else if (isOpen) {
      message = 'Ventana semanal abierta hasta Miércoles 04:00 PM';
    } else {
      message = 'Ventana cerrada - Abre el próximo Lunes a las 05:00 AM';
    }

    const canCreate = isPrivileged || (isOpen && hasQuota);

    return {
      isOpen,
      isSuspended: config.isSuspended,
      hasQuota: isPrivileged ? true : hasQuota,
      weeklyQuotaUsed,
      maxWeeklyRequests: config.maxWeeklyRequestsPerUser,
      currentCycle: caracasTime.isoWeeklyCycle,
      message,
      canCreate,
      isAdminOrWarehouse: isPrivileged,
      config: {
        startDay: config.startDay,
        startHour: config.startHour,
        startMinute: config.startMinute,
        endDay: config.endDay,
        endHour: config.endHour,
        endMinute: config.endMinute,
        isSuspended: config.isSuspended,
      },
    };
  }

  static async validateCanCreate(user: {
    id: number;
    roles: string[];
  }): Promise<{ cycle: string }> {
    const roles = user.roles ?? [];
    const isPrivileged =
      roles.includes('ADMINISTRADOR') || roles.includes('ALMACENISTA');
    const caracasTime = getCaracasTime();

    if (isPrivileged) {
      return { cycle: caracasTime.isoWeeklyCycle };
    }

    const config = await this.getConfig();

    if (config.isSuspended) {
      throw new Error(
        'La ventana de recepción de solicitudes se encuentra suspendida temporalmente por administración.'
      );
    }

    const isOpen = this.isWindowOpen(config, caracasTime);
    if (!isOpen) {
      throw new Error(
        'La ventana para recepción de solicitudes se encuentra cerrada. Horario institucional: Lunes 05:00 AM a Miércoles 04:00 PM.'
      );
    }

    const weeklyQuotaUsed = await prisma.request.count({
      where: {
        userId: user.id,
        weeklyTokenCycle: caracasTime.isoWeeklyCycle,
        status: { not: RequestStatus.RECHAZADA },
      },
    });

    if (weeklyQuotaUsed >= config.maxWeeklyRequestsPerUser) {
      throw new Error(
        'Ya utilizaste tu cupo de solicitud correspondiente a esta semana.'
      );
    }

    return { cycle: caracasTime.isoWeeklyCycle };
  }
}
