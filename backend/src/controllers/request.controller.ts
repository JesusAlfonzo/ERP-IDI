import type { Request, Response, NextFunction } from 'express';
import { RequestService } from '../services/request.service.js';
import { serializeBigInt } from '../utils/serializer.js';
import { RequestStatus } from '@prisma/client';

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
    const isStaff =
      userRoles.includes('ADMINISTRADOR') || userRoles.includes('ALMACENISTA');
    if (!isStaff && req.user?.id) {
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

    const { items, notes } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'Debe incluir al menos un producto a solicitar',
      });
      return;
    }

    const formattedItems = items.map((it: any) => ({
      productId: BigInt(it.productId),
      quantityRequested: Number(it.quantityRequested),
    }));

    const newRequest = await RequestService.createRequest({
      userId: req.user.id,
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

    const { notes } = req.body;

    const rejected = await RequestService.rejectRequest(
      BigInt(id),
      req.user.id,
      notes ? String(notes) : undefined
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

    const { items, notes } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'Debe proporcionar la distribución de lotes por ítem',
      });
      return;
    }

    const formattedItems = items.map((it: any) => ({
      itemId: BigInt(it.itemId),
      allocations: (it.allocations || []).map((al: any) => ({
        batchId: BigInt(al.batchId),
        quantity: Number(al.quantity),
      })),
    }));

    const dispatched = await RequestService.dispatchRequest({
      requestId: BigInt(id),
      dispatchedById: req.user.id,
      notes: notes ? String(notes) : null,
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
