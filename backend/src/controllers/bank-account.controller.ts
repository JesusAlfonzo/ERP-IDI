import type { Request, Response, NextFunction } from 'express';
import { BankAccountService } from '../services/bank-account.service.js';
import { serializeBigInt } from '../utils/serializer.js';

export const getBankAccounts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const activeOnly = req.query.activeOnly === 'true';
    const accounts = await BankAccountService.listAccounts(activeOnly);
    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(accounts),
    });
  } catch (error) {
    next(error);
  }
};

export const getBankAccountById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id)) {
      res.status(400).json({ status: 'BAD_REQUEST', message: 'ID de cuenta inválido' });
      return;
    }

    const account = await BankAccountService.getAccountById(id);
    if (!account) {
      res.status(404).json({ status: 'NOT_FOUND', message: 'Cuenta bancaria no encontrada' });
      return;
    }

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(account),
    });
  } catch (error) {
    next(error);
  }
};

export const createBankAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { bankName, accountNumber, type, currency, holderName, holderId, isActive } =
      req.body;

    if (!bankName || !type || !currency || !holderName || !holderId) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message:
          'bankName, type, currency, holderName y holderId son campos obligatorios',
      });
      return;
    }

    const account = await BankAccountService.createAccount({
      bankName: String(bankName),
      accountNumber: accountNumber ? String(accountNumber) : null,
      type: String(type),
      currency: String(currency),
      holderName: String(holderName),
      holderId: String(holderId),
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    res.status(201).json({
      status: 'SUCCESS',
      message: 'Cuenta bancaria institucional creada exitosamente',
      data: serializeBigInt(account),
    });
  } catch (error) {
    next(error);
  }
};

export const updateBankAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id)) {
      res.status(400).json({ status: 'BAD_REQUEST', message: 'ID de cuenta inválido' });
      return;
    }

    const account = await BankAccountService.updateAccount(id, req.body);

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Cuenta bancaria institucional actualizada exitosamente',
      data: serializeBigInt(account),
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBankAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userRoles = req.user?.roles ?? [];
    if (!userRoles.includes('ADMINISTRADOR')) {
      res.status(403).json({
        status: 'FORBIDDEN',
        message: 'Acceso denegado: Solo el Administrador puede eliminar cuentas bancarias.',
      });
      return;
    }

    const id = Number(req.params.id);
    if (!id || isNaN(id)) {
      res.status(400).json({ status: 'BAD_REQUEST', message: 'ID de cuenta inválido' });
      return;
    }

    await BankAccountService.deleteAccount(id);

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Cuenta bancaria eliminada o desactivada exitosamente',
    });
  } catch (error) {
    next(error);
  }
};
