import { prisma } from '../config/prisma.js';

export class ExportService {
  /**
   * Genera el CSV de valorización de inventario actual por lote
   */
  static async exportInventoryValuationCSV(): Promise<string> {
    const batches = await prisma.stockBatch.findMany({
      where: { currentQuantity: { gt: 0 } },
      include: {
        product: {
          include: {
            category: true,
            baseUnit: true,
          },
        },
        location: true,
      },
      orderBy: { product: { name: 'asc' } },
    });

    const headers = [
      'SKU',
      'Producto',
      'Categoria',
      'Lote',
      'Ubicacion',
      'Cantidad Actual',
      'Unidad',
      'Costo Unitario (USD)',
      'Valor Total (USD)',
      'Estado',
      'Fecha Vencimiento',
    ];

    const rows = batches.map((b) => {
      const qty = Number(b.currentQuantity);
      const cost = Number(b.costPrice);
      const total = qty * cost;
      const expDate = b.expirationDate
        ? new Date(b.expirationDate).toISOString().split('T')[0]
        : 'N/A';

      return [
        `"${b.product.sku}"`,
        `"${b.product.name.replace(/"/g, '""')}"`,
        `"${b.product.category.name}"`,
        `"${b.lotNumber}"`,
        `"${b.location?.name ?? 'Sin asignar'}"`,
        qty,
        `"${b.product.baseUnit.abbreviation}"`,
        cost.toFixed(4),
        total.toFixed(2),
        `"${b.status}"`,
        `"${expDate}"`,
      ].join(';');
    });

    return '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  }

  /**
   * Genera el CSV del Kardex / Historial de movimientos
   */
  static async exportKardexCSV(): Promise<string> {
    const movements = await prisma.stockMovement.findMany({
      include: {
        createdBy: { select: { fullName: true, username: true } },
        items: {
          include: {
            batch: {
              include: {
                product: { select: { sku: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Referencia',
      'Tipo de Movimiento',
      'Fecha',
      'Responsable',
      'SKU',
      'Producto',
      'Lote',
      'Cantidad',
      'Costo Unitario (USD)',
      'Notas',
    ];

    const rows: string[] = [];

    for (const mov of movements) {
      const date = new Date(mov.createdAt)
        .toISOString()
        .replace('T', ' ')
        .substring(0, 19);
      const user = mov.createdBy
        ? `${mov.createdBy.fullName} (${mov.createdBy.username})`
        : 'Sistema';
      const notes = mov.notes ? mov.notes.replace(/"/g, '""') : '';

      for (const item of mov.items) {
        rows.push(
          [
            `"${mov.referenceNumber}"`,
            `"${mov.type}"`,
            `"${date}"`,
            `"${user}"`,
            `"${item.batch.product.sku}"`,
            `"${item.batch.product.name.replace(/"/g, '""')}"`,
            `"${item.batch.lotNumber}"`,
            Number(item.quantity),
            Number(item.unitCost).toFixed(4),
            `"${notes}"`,
          ].join(';')
        );
      }
    }

    return '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  }
}
