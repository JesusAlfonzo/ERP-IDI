import type { Request, Response, NextFunction } from 'express';
import { ResearchService } from '../services/research.service.js';
import { serializeBigInt } from '../utils/serializer.js';
import {
  ResearchProjectType,
  ResearchProjectStatus,
  ResearchMemberRole,
  ResearchInvestorType,
  ResearchTransferDirection,
  ResearchTrialStatus,
  ResearchFindingType,
  RepeatReason,
} from '@prisma/client';

// ==========================================
// 1. PROYECTOS DE INVESTIGACIÓN Y DOCENCIA
// ==========================================

export const getProjects = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, type, search } = req.query;

    const projects = await ResearchService.listProjects({
      status:
        typeof status === 'string' &&
        Object.values(ResearchProjectStatus).includes(status as ResearchProjectStatus)
          ? (status as ResearchProjectStatus)
          : undefined,
      type:
        typeof type === 'string' &&
        Object.values(ResearchProjectType).includes(type as ResearchProjectType)
          ? (type as ResearchProjectType)
          : undefined,
      search: typeof search === 'string' ? search.trim() : undefined,
    });

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(projects),
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const project = await ResearchService.getProjectById(Number(req.params.id));
    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(project),
    });
  } catch (error) {
    next(error);
  }
};

export const createProject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ status: 'UNAUTHORIZED', message: 'Usuario no autenticado' });
      return;
    }

    const { code, title, description, researchLine, type, status, startDate, endDate, principalInvestigatorId } = req.body;

    if (!title || !type) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'title y type son obligatorios',
      });
      return;
    }

    const project = await ResearchService.createProject({
      code: code ? String(code) : undefined,
      title: String(title),
      description: description ? String(description) : null,
      researchLine: researchLine ? String(researchLine) : null,
      type: type as ResearchProjectType,
      status: status ? (status as ResearchProjectStatus) : undefined,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      principalInvestigatorId: principalInvestigatorId ? Number(principalInvestigatorId) : req.user.id,
    });

    res.status(201).json({
      status: 'SUCCESS',
      message: 'Proyecto de investigación registrado exitosamente',
      data: serializeBigInt(project),
    });
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, description, researchLine, type, status, startDate, endDate } = req.body;

    const project = await ResearchService.updateProject(Number(req.params.id), {
      title: title ? String(title) : undefined,
      description: description !== undefined ? String(description) : undefined,
      researchLine: researchLine !== undefined ? String(researchLine) : undefined,
      type: type ? (type as ResearchProjectType) : undefined,
      status: status ? (status as ResearchProjectStatus) : undefined,
      startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
      endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
    });

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Proyecto de investigación actualizado exitosamente',
      data: serializeBigInt(project),
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. MIEMBROS DE PROYECTOS
// ==========================================

export const addProjectMember = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const projectId = Number(req.params.id);
    const { userId, role, canRequestMaterials, canRecordTrials } = req.body;

    if (!userId || !role) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'userId y role son obligatorios',
      });
      return;
    }

    const member = await ResearchService.addMember(projectId, {
      userId: Number(userId),
      role: role as ResearchMemberRole,
      canRequestMaterials: canRequestMaterials !== undefined ? Boolean(canRequestMaterials) : true,
      canRecordTrials: canRecordTrials !== undefined ? Boolean(canRecordTrials) : true,
    });

    res.status(201).json({
      status: 'SUCCESS',
      message: 'Miembro asignado al proyecto exitosamente',
      data: serializeBigInt(member),
    });
  } catch (error) {
    next(error);
  }
};

export const updateProjectMember = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const projectId = Number(req.params.id);
    const memberId = Number(req.params.memberId);
    const { role, canRequestMaterials, canRecordTrials, isActive } = req.body;

    const member = await ResearchService.updateMember(projectId, memberId, {
      role: role ? (role as ResearchMemberRole) : undefined,
      canRequestMaterials: canRequestMaterials !== undefined ? Boolean(canRequestMaterials) : undefined,
      canRecordTrials: canRecordTrials !== undefined ? Boolean(canRecordTrials) : undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : undefined,
    });

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Permisos del miembro actualizados exitosamente',
      data: serializeBigInt(member),
    });
  } catch (error) {
    next(error);
  }
};

export const removeProjectMember = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const projectId = Number(req.params.id);
    const memberId = Number(req.params.memberId);

    await ResearchService.removeMember(projectId, memberId);

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Miembro removido del proyecto exitosamente',
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. INVERSORES Y APORTES FINANCIEROS
// ==========================================

export const getInvestors = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { investorType, search } = req.query;

    const investors = await ResearchService.listInvestors({
      investorType:
        typeof investorType === 'string' &&
        Object.values(ResearchInvestorType).includes(investorType as ResearchInvestorType)
          ? (investorType as ResearchInvestorType)
          : undefined,
      search: typeof search === 'string' ? search.trim() : undefined,
    });

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(investors),
    });
  } catch (error) {
    next(error);
  }
};

export const getInvestorById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const investor = await ResearchService.getInvestorById(Number(req.params.id));
    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(investor),
    });
  } catch (error) {
    next(error);
  }
};

export const createInvestor = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, taxIdOrCode, investorType, contactName, contactEmail } = req.body;

    if (!name || !investorType) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'name e investorType son obligatorios',
      });
      return;
    }

    const investor = await ResearchService.createInvestor({
      name: String(name),
      taxIdOrCode: taxIdOrCode ? String(taxIdOrCode) : null,
      investorType: investorType as ResearchInvestorType,
      contactName: contactName ? String(contactName) : null,
      contactEmail: contactEmail ? String(contactEmail) : null,
    });

    res.status(201).json({
      status: 'SUCCESS',
      message: 'Inversor / Ente registrado exitosamente',
      data: serializeBigInt(investor),
    });
  } catch (error) {
    next(error);
  }
};

export const getInvestments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { projectId, investorId } = req.query;

    const investments = await ResearchService.listInvestments({
      projectId: projectId ? Number(projectId) : undefined,
      investorId: investorId ? Number(investorId) : undefined,
    });

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(investments),
    });
  } catch (error) {
    next(error);
  }
};

export const recordInvestment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { projectId, investorId, amount, currency, investmentDate, purposeNotes } = req.body;

    if (!projectId || !investorId || amount === undefined) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'projectId, investorId y amount son obligatorios',
      });
      return;
    }

    const investment = await ResearchService.recordInvestment({
      projectId: Number(projectId),
      investorId: Number(investorId),
      amount: Number(amount),
      currency: currency ? String(currency) : 'USD',
      investmentDate: investmentDate ? new Date(investmentDate) : new Date(),
      purposeNotes: purposeNotes ? String(purposeNotes) : null,
    });

    res.status(201).json({
      status: 'SUCCESS',
      message: 'Inversión monetaria registrada y fondos del proyecto actualizados',
      data: serializeBigInt(investment),
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. DONACIONES EN ESPECIE
// ==========================================

export const getDonations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { projectId, investorId } = req.query;

    const donations = await ResearchService.listDonations({
      projectId: projectId ? Number(projectId) : undefined,
      investorId: investorId ? Number(investorId) : undefined,
    });

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(donations),
    });
  } catch (error) {
    next(error);
  }
};

export const recordDonation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ status: 'UNAUTHORIZED', message: 'Usuario no autenticado' });
      return;
    }

    const { projectId, investorId, donationDate, locationId, fridgeId, notes, items } = req.body;

    if (!projectId || !investorId || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'projectId, investorId e items son obligatorios',
      });
      return;
    }

    const donation = await ResearchService.recordDonation({
      projectId: Number(projectId),
      investorId: Number(investorId),
      receivedById: req.user.id,
      donationDate: donationDate ? new Date(donationDate) : new Date(),
      locationId: locationId ? Number(locationId) : undefined,
      fridgeId: fridgeId ? Number(fridgeId) : null,
      notes: notes ? String(notes) : null,
      items: items.map((i: any) => ({
        productId: BigInt(i.productId),
        quantity: Number(i.quantity),
        lotNumber: String(i.lotNumber),
        expirationDate: i.expirationDate ? new Date(i.expirationDate) : null,
        estimatedUnitValue: Number(i.estimatedUnitValue || 0),
        unitCode: i.unitCode ? String(i.unitCode) : undefined,
      })),
    });

    res.status(201).json({
      status: 'SUCCESS',
      message: 'Donación en especie ingresada al inventario del proyecto exitosamente',
      data: serializeBigInt(donation),
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 5. CESIONES Y TRASPASOS DE STOCK
// ==========================================

export const getStockTransfers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { projectId } = req.query;

    const transfers = await ResearchService.listStockTransfers({
      projectId: projectId ? Number(projectId) : undefined,
    });

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(transfers),
    });
  } catch (error) {
    next(error);
  }
};

export const transferStock = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ status: 'UNAUTHORIZED', message: 'Usuario no autenticado' });
      return;
    }

    const { sourceUnitId, projectId, transferredUses, direction, reason } = req.body;

    if (!sourceUnitId || !projectId || !transferredUses || !direction || !reason) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'sourceUnitId, projectId, transferredUses, direction y reason son obligatorios',
      });
      return;
    }

    const transfer = await ResearchService.transferStock({
      sourceUnitId: BigInt(sourceUnitId),
      projectId: Number(projectId),
      authorizedById: req.user.id,
      transferredUses: Number(transferredUses),
      direction: direction as ResearchTransferDirection,
      reason: String(reason),
    });

    res.status(201).json({
      status: 'SUCCESS',
      message: 'Traspaso de stock ejecutado exitosamente',
      data: serializeBigInt(transfer),
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 6. ENSAYOS EXPERIMENTALES
// ==========================================

export const getTrials = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { projectId, status, search } = req.query;

    const trials = await ResearchService.listTrials({
      projectId: projectId ? Number(projectId) : undefined,
      status:
        typeof status === 'string' &&
        Object.values(ResearchTrialStatus).includes(status as ResearchTrialStatus)
          ? (status as ResearchTrialStatus)
          : undefined,
      search: typeof search === 'string' ? search.trim() : undefined,
    });

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(trials),
    });
  } catch (error) {
    next(error);
  }
};

export const getTrialById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const trial = await ResearchService.getTrialById(Number(req.params.id));
    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(trial),
    });
  } catch (error) {
    next(error);
  }
};

export const createTrial = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ status: 'UNAUTHORIZED', message: 'Usuario no autenticado' });
      return;
    }

    const { projectId, trialDate, title, objective, notes } = req.body;

    if (!projectId || !title) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'projectId y title son obligatorios',
      });
      return;
    }

    const trial = await ResearchService.createTrial({
      projectId: Number(projectId),
      executedById: req.user.id,
      trialDate: trialDate ? new Date(trialDate) : new Date(),
      title: String(title),
      objective: objective ? String(objective) : null,
      notes: notes ? String(notes) : null,
    });

    res.status(201).json({
      status: 'SUCCESS',
      message: 'Ensayo experimental abierto exitosamente',
      data: serializeBigInt(trial),
    });
  } catch (error) {
    next(error);
  }
};

export const recordTrialExecution = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { totalSamplesTested, notes, consumptions } = req.body;

    if (!Array.isArray(consumptions) || consumptions.length === 0) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'consumptions debe ser una lista de reactivos consumidos',
      });
      return;
    }

    const completedTrial = await ResearchService.recordTrialExecution(
      Number(req.params.id),
      {
        totalSamplesTested: Number(totalSamplesTested || 0),
        notes: notes ? String(notes) : null,
        consumptions: consumptions.map((c: any) => ({
          labReagentUnitId: BigInt(c.labReagentUnitId),
          externalCalibratorUnitId: c.externalCalibratorUnitId
            ? BigInt(c.externalCalibratorUnitId)
            : null,
          sampleUses: Number(c.sampleUses || 0),
          repeatUses: Number(c.repeatUses || 0),
          repeatReason: c.repeatReason ? (c.repeatReason as RepeatReason) : null,
          calibratorUses: Number(c.calibratorUses || 0),
          calibratorNotes: c.calibratorNotes ? String(c.calibratorNotes) : null,
          controlUses: Number(c.controlUses || 0),
          wasteUses: Number(c.wasteUses || 0),
          isPrimaryKitDepleted: Boolean(c.isPrimaryKitDepleted),
          primaryKitPhysicalRemainingUses:
            c.primaryKitPhysicalRemainingUses !== undefined &&
            c.primaryKitPhysicalRemainingUses !== null
              ? Number(c.primaryKitPhysicalRemainingUses)
              : null,
          isExternalCalibratorDepleted: Boolean(c.isExternalCalibratorDepleted),
          externalCalibratorPhysicalRemainingUses:
            c.externalCalibratorPhysicalRemainingUses !== undefined &&
            c.externalCalibratorPhysicalRemainingUses !== null
              ? Number(c.externalCalibratorPhysicalRemainingUses)
              : null,
        })),
      }
    );

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Ensayo experimental ejecutado, reactivos blindados consumidos y auditoría registrada',
      data: serializeBigInt(completedTrial),
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 7. RESULTADOS OBTENIDOS E HITOS (FINDINGS)
// ==========================================

export const getFindings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { projectId, trialId, findingType, isPublished, search } = req.query;

    const findings = await ResearchService.listFindings({
      projectId: projectId ? Number(projectId) : undefined,
      trialId: trialId ? Number(trialId) : undefined,
      findingType:
        typeof findingType === 'string' &&
        Object.values(ResearchFindingType).includes(findingType as ResearchFindingType)
          ? (findingType as ResearchFindingType)
          : undefined,
      isPublished: isPublished !== undefined ? isPublished === 'true' : undefined,
      search: typeof search === 'string' ? search.trim() : undefined,
    });

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(findings),
    });
  } catch (error) {
    next(error);
  }
};

export const getFindingById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const finding = await ResearchService.getFindingById(Number(req.params.id));
    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(finding),
    });
  } catch (error) {
    next(error);
  }
};

export const createFinding = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ status: 'UNAUTHORIZED', message: 'Usuario no autenticado' });
      return;
    }

    const { projectId, trialId, title, findingType, summary, conclusion, attachmentUrl, isPublished } = req.body;

    if (!projectId || !title || !findingType || !summary) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'projectId, title, findingType y summary son obligatorios',
      });
      return;
    }

    const finding = await ResearchService.createFinding({
      projectId: Number(projectId),
      trialId: trialId ? Number(trialId) : null,
      recordedById: req.user.id,
      title: String(title),
      findingType: findingType as ResearchFindingType,
      summary: String(summary),
      conclusion: conclusion ? String(conclusion) : null,
      attachmentUrl: attachmentUrl ? String(attachmentUrl) : null,
      isPublished: Boolean(isPublished),
    });

    res.status(201).json({
      status: 'SUCCESS',
      message: 'Resultado o hito de investigación registrado exitosamente',
      data: serializeBigInt(finding),
    });
  } catch (error) {
    next(error);
  }
};

export const updateFinding = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, findingType, summary, conclusion, attachmentUrl, isPublished } = req.body;

    const finding = await ResearchService.updateFinding(Number(req.params.id), {
      title: title ? String(title) : undefined,
      findingType: findingType ? (findingType as ResearchFindingType) : undefined,
      summary: summary ? String(summary) : undefined,
      conclusion: conclusion !== undefined ? String(conclusion) : undefined,
      attachmentUrl: attachmentUrl !== undefined ? String(attachmentUrl) : undefined,
      isPublished: isPublished !== undefined ? Boolean(isPublished) : undefined,
    });

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Resultado o hito actualizado exitosamente',
      data: serializeBigInt(finding),
    });
  } catch (error) {
    next(error);
  }
};
