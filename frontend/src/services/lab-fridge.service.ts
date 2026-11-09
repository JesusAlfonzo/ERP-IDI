/**
 * @deprecated Este servicio ha sido unificado dentro de `LabWorkflowService`.
 * Para nuevas implementaciones, importe y utilice `LabWorkflowService` desde `@/services/lab-workflow.service`.
 * Este archivo se mantiene como barrel de compatibilidad para evitar roturas de compilación.
 */
import { LabWorkflowService } from "@/services/lab-workflow.service";

export { LabWorkflowService };

/**
 * @deprecated Utilice `LabWorkflowService` en su lugar.
 */
export const LabFridgeService = LabWorkflowService;

export default LabWorkflowService;
