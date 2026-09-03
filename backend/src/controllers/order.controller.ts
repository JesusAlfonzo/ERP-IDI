import type { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service.js';
import { serializeBigInt } from '../utils/serializer.js';

export const getOrders = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orders = await OrderService.listOrders();
    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(orders),
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'ID de orden no proporcionado',
      });
      return;
    }

    const order = await OrderService.getOrderById(BigInt(id));
    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(order),
    });
  } catch (error) {
    next(error);
  }
};

export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { supplierId, currencyId, notes, items } = req.body;

    if (!currencyId || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'Moneda e ítems son campos obligatorios',
      });
      return;
    }

    if (!req.user?.id) {
      res
        .status(401)
        .json({ status: 'UNAUTHORIZED', message: 'Usuario no autenticado' });
      return;
    }

    const formattedItems = items.map((item: any) => ({
      productId: BigInt(item.productId),
      unitId: Number(item.unitId),
      quantityOrdered: Number(item.quantityOrdered),
      unitPrice: Number(item.unitPrice),
    }));

    const order = await OrderService.createOrder({
      supplierId: supplierId ? Number(supplierId) : null,
      currencyId: Number(currencyId),
      notes: notes ? String(notes) : null,
      createdById: req.user.id,
      items: formattedItems,
    });

    res.status(201).json({
      status: 'SUCCESS',
      data: serializeBigInt(order),
    });
  } catch (error) {
    next(error);
  }
};

export const receiveOrder = async (
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
        .json({
          status: 'BAD_REQUEST',
          message: 'ID de orden no proporcionado',
        });
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
        message:
          'Debe proporcionar la lista de ítems a recibir con sus respectivos lotes',
      });
      return;
    }

    const formattedItems = items.map((item: any) => {
      if (
        !item.orderItemId ||
        !item.quantityReceived ||
        !item.lotNumber ||
        !item.expirationDate
      ) {
        throw new Error(
          'Cada ítem requiere orderItemId, quantityReceived, lotNumber y expirationDate'
        );
      }
      return {
        orderItemId: BigInt(item.orderItemId),
        quantityReceived: Number(item.quantityReceived),
        lotNumber: String(item.lotNumber),
        expirationDate: new Date(item.expirationDate),
        locationId: item.locationId ? Number(item.locationId) : 1,
      };
    });

    const updatedOrder = await OrderService.receiveOrder({
      orderId: BigInt(id),
      receivedById: req.user.id,
      notes: notes ? String(notes) : null,
      items: formattedItems,
    });

    res.status(200).json({
      status: 'SUCCESS',
      message:
        'Recepción de mercancía asentada en inventario satisfactoriamente',
      data: serializeBigInt(updatedOrder),
    });
  } catch (error) {
    next(error);
  }
};
