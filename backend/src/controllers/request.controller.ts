import type { Request, Response, NextFunction } from 'express';
import { RequestService } from '../services/request.service.js';
import { serializeBigInt } from '../utils/serializer.js';
import { RequestPriority, RequestStatus } from '@prisma/client';

// Helper local para comprobar permisos de almacén / administración
const isWarehouseStaff = (roles: string[] = []): boolean => {
  return roles.includes('ADMINISTRADOR') || roles.includes('ALMACENISTA');
};

export const getRequests = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, cycle } = req.query;

    const filter: { status?: RequestStatus; userId?: number; cycle?: string } =
      {};

    if (
      typeof status === 'string' &&
      Object.values(RequestStatus).includes(status as RequestStatus)
    ) {
      filter.status = status as RequestStatus;
    }
    if (typeof cycle === 'string' && cycle.trim() !== '') {
      filter.cycle = cycle.trim();
    }

    const userRoles = req.user?.roles ?? [];
    if (!isWarehouseStaff(userRoles) && req.user?.id) {
      // Los solicitantes o personal no-almacén solo ven sus propias solicitudes
      filter.userId = req.user.id;
    }

    const requests = await RequestService.listRequests(filter);

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(requests),
    });
  } catch (error) {
    next(error);
  }
};

export const getRequestById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id) {
      res
        .status(400)
        .json({ status: 'BAD_REQUEST', message: 'ID no proporcionado' });
      return;
    }

    const request = await RequestService.getRequestById(BigInt(id));

    if (!request) {
      res.status(404).json({
        status: 'NOT_FOUND',
        message: 'Solicitud no encontrada',
      });
      return;
    }

    // CONTROL DE ACCESO: Si no es Almacén/Admin, solo puede verla si es el autor
    const userRoles = req.user?.roles ?? [];
    if (
      !isWarehouseStaff(userRoles) &&
      req.user?.id !== Number(request.userId)
    ) {
      res.status(403).json({
        status: 'FORBIDDEN',
        message: 'No tienes autorización para acceder a esta solicitud.',
      });
      return;
    }

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(request),
    });
  } catch (error) {
    next(error);
  }
};

export const createRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res
        .status(401)
        .json({ status: 'UNAUTHORIZED', message: 'Usuario no autenticado' });
      return;
    }

    const userRoles = req.user?.roles ?? [];
    const canCreate =
      userRoles.includes('SOLICITANTE') ||
      userRoles.includes('ADMINISTRADOR') ||
      userRoles.includes('ALMACENISTA') ||
      userRoles.includes('ANALISTA_LABORATORIO') ||
      userRoles.includes('COMPRAS');

    if (!canCreate) {
      res.status(403).json({
        status: 'FORBIDDEN',
        message: 'No posees permisos de solicitante para crear requisiciones.',
      });
      return;
    }

    const { priority, departmentSection, justification, items, notes } =
      req.body;

    if (
      !priority ||
      !Object.values(RequestPriority).includes(priority as RequestPriority)
    ) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: `priority inválido. Debe ser uno de: ${Object.values(RequestPriority).join(', ')}`,
      });
      return;
    }
    if (!departmentSection || String(departmentSection).trim().length < 2) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message:
          'departmentSection es obligatorio y debe tener al menos 2 caracteres',
      });
      return;
    }
    if (!justification || String(justification).trim().length < 5) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message:
          'justification es obligatorio y debe tener al menos 5 caracteres',
      });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'Debe incluir al menos un producto a solicitar',
      });
      return;
    }

    const formattedItems = items.map((it: any) => {
      if (
        !it.productId ||
        !Number.isFinite(Number(it.requestedQuantity)) ||
        Number(it.requestedQuantity) <= 0
      ) {
        throw new Error(
          'Cada ítem requiere productId y requestedQuantity mayor que 0'
        );
      }
      return {
        productId: BigInt(it.productId),
        quantityRequested: Number(it.requestedQuantity),
      };
    });

    const newRequest = await RequestService.createRequest({
      userId: req.user.id,
      priority: priority as RequestPriority,
      departmentSection: String(departmentSection).trim(),
      justification: String(justification).trim(),
      notes: notes ? String(notes) : null,
      items: formattedItems,
    });

    res.status(201).json({
      status: 'SUCCESS',
      message: 'Solicitud enviada exitosamente',
      data: serializeBigInt(newRequest),
    });
  } catch (error) {
    next(error);
  }
};

export const approveRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id) {
      res
        .status(400)
        .json({ status: 'BAD_REQUEST', message: 'ID no proporcionado' });
      return;
    }

    if (!req.user?.id) {
      res
        .status(401)
        .json({ status: 'UNAUTHORIZED', message: 'Usuario no autenticado' });
      return;
    }

    // CONTROL ESTRICTO: Solo Almacén o Administrador pueden aprobar
    const userRoles = req.user?.roles ?? [];
    if (!isWarehouseStaff(userRoles)) {
      res.status(403).json({
        status: 'FORBIDDEN',
        message:
          'Acceso denegado: Solo el personal de Almacén o Administración puede aprobar requisiciones.',
      });
      return;
    }

    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'Debe especificar las cantidades aprobadas para los ítems',
      });
      return;
    }

    const formattedItems = items.map((it: any) => ({
      itemId: BigInt(it.itemId),
      quantityApproved: Number(it.quantityApproved),
    }));

    const approved = await RequestService.approveRequest({
      requestId: BigInt(id),
      approvedById: req.user.id,
      items: formattedItems,
    });

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Solicitud aprobada exitosamente',
      data: serializeBigInt(approved),
    });
  } catch (error) {
    next(error);
  }
};

export const rejectRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id) {
      res
        .status(400)
        .json({ status: 'BAD_REQUEST', message: 'ID no proporcionado' });
      return;
    }

    if (!req.user?.id) {
      res
        .status(401)
        .json({ status: 'UNAUTHORIZED', message: 'Usuario no autenticado' });
      return;
    }

    // CONTROL ESTRICTO: Solo Almacén o Administrador pueden rechazar
    const userRoles = req.user?.roles ?? [];
    if (!isWarehouseStaff(userRoles)) {
      res.status(403).json({
        status: 'FORBIDDEN',
        message:
          'Acceso denegado: Solo el personal de Almacén o Administración puede rechazar requisiciones.',
      });
      return;
    }

    const reason = req.body.reason ?? req.body.notes;

    if (!reason || String(reason).trim().length < 5) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'El motivo de rechazo debe tener al menos 5 caracteres',
      });
      return;
    }

    const rejected = await RequestService.rejectRequest(
      BigInt(id),
      req.user.id,
      String(reason).trim()
    );

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Solicitud rechazada',
      data: serializeBigInt(rejected),
    });
  } catch (error) {
    next(error);
  }
};

export const dispatchRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id) {
      res
        .status(400)
        .json({ status: 'BAD_REQUEST', message: 'ID no proporcionado' });
      return;
    }

    if (!req.user?.id) {
      res
        .status(401)
        .json({ status: 'UNAUTHORIZED', message: 'Usuario no autenticado' });
      return;
    }

    // CONTROL ESTRICTO: Solo Almacén o Administrador pueden despachar y descontar stock
    const userRoles = req.user?.roles ?? [];
    if (!isWarehouseStaff(userRoles)) {
      res.status(403).json({
        status: 'FORBIDDEN',
        message:
          'Acceso denegado: Solo el personal de Almacén o Administración puede despachar materiales.',
      });
      return;
    }

    const { items, notes, dispatchNotes } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'Debe proporcionar la distribución de lotes por ítem',
      });
      return;
    }

    const formattedItems = items.map((it: any) => {
      const itemId = Number(it.itemId);
      if (!Number.isSafeInteger(itemId) || itemId <= 0) {
        throw new Error('itemId debe ser un entero positivo');
      }

      const rawAllocations = it.allocations
        ? it.allocations
        : [{ batchId: it.batchId, quantity: it.dispatchedQuantity }];
      const allocations = rawAllocations.map((allocation: any) => {
        const batchId = Number(allocation.batchId);
        const quantity = Number(
          allocation.quantity ?? allocation.dispatchedQuantity
        );
        if (!Number.isSafeInteger(batchId) || batchId <= 0) {
          throw new Error('batchId debe ser un entero positivo');
        }
        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw new Error('La cantidad a despachar debe ser mayor que 0');
        }
        return { batchId: BigInt(batchId), quantity };
      });

      return { itemId: BigInt(itemId), allocations };
    });

    const dispatched = await RequestService.dispatchRequest({
      requestId: BigInt(id),
      dispatchedById: req.user.id,
      notes: dispatchNotes
        ? String(dispatchNotes)
        : notes
          ? String(notes)
          : null,
      items: formattedItems,
    });

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Solicitud despachada y stock rebajado correctamente',
      data: serializeBigInt(dispatched),
    });
  } catch (error) {
    next(error);
  }
};
