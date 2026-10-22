"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PurchasingClientService } from "@/services/purchasing.service";
import { AuthService } from "@/services/auth.service";
import type { Supplier } from "@/types/purchasing";
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAdmin] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      AuthService.getCurrentUser()?.roles?.includes("ADMINISTRADOR") ?? false
    );
  });

  // Modal: Crear Proveedor
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    rifOrId: "",
    name: "",
    contactName: "",
    phone: "",
    email: "",
    address: "",
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createFeedback, setCreateFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  // Modal: Editar Proveedor
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editForm, setEditForm] = useState({
    rifOrId: "",
    name: "",
    contactName: "",
    phone: "",
    email: "",
    address: "",
    isActive: true,
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editFeedback, setEditFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  // Modal: Confirmar Eliminación
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  const loadSuppliers = useCallback(async () => {
    try {
      const data = await PurchasingClientService.getSuppliers();
      setSuppliers(data);
    } catch {
      // Manejado por interceptor global
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!AuthService.isAuthenticated()) {
      router.replace("/login");
      return;
    }

    PurchasingClientService.getSuppliers()
      .then((data) => {
        if (isMounted) setSuppliers(data);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  const filteredSuppliers = suppliers.filter((s) => {
    const term = search.toLowerCase();
    const rif = (s.rifOrId || s.rif || "").toLowerCase();
    const name = s.name.toLowerCase();
    const contact = (s.contactName || "").toLowerCase();
    return rif.includes(term) || name.includes(term) || contact.includes(term);
  });

  const handleCreateSupplier = async (e: FormEvent) => {
    e.preventDefault();
    setCreateFeedback(null);
    setCreateSubmitting(true);

    try {
      await PurchasingClientService.createSupplier({
        rifOrId: createForm.rifOrId.trim(),
        name: createForm.name.trim(),
        contactName: createForm.contactName.trim() || undefined,
        phone: createForm.phone.trim() || undefined,
        email: createForm.email.trim() || undefined,
        address: createForm.address.trim() || undefined,
      });

      setCreateFeedback({
        status: "success",
        message: "Proveedor registrado exitosamente.",
      });

      setCreateForm({
        rifOrId: "",
        name: "",
        contactName: "",
        phone: "",
        email: "",
        address: "",
      });

      await loadSuppliers();

      setTimeout(() => {
        setIsCreateModalOpen(false);
        setCreateFeedback(null);
      }, 1200);
    } catch (err: unknown) {
      setCreateFeedback({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Error al registrar el proveedor. Verifique que el RIF no esté duplicado.",
      });
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleOpenEditModal = (sup: Supplier) => {
    setEditingSupplier(sup);
    setEditForm({
      rifOrId: sup.rifOrId || sup.rif || "",
      name: sup.name,
      contactName: sup.contactName || "",
      phone: sup.phone || "",
      email: sup.email || "",
      address: sup.address || "",
      isActive: sup.isActive !== false,
    });
    setEditFeedback(null);
  };

  const handleUpdateSupplier = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    setEditFeedback(null);
    setEditSubmitting(true);

    try {
      await PurchasingClientService.updateSupplier(editingSupplier.id, {
        rifOrId: editForm.rifOrId.trim(),
        name: editForm.name.trim(),
        contactName: editForm.contactName.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        email: editForm.email.trim() || undefined,
        address: editForm.address.trim() || undefined,
        isActive: editForm.isActive,
      });

      setEditFeedback({
        status: "success",
        message: "Proveedor actualizado exitosamente.",
      });

      await loadSuppliers();

      setTimeout(() => {
        setEditingSupplier(null);
        setEditFeedback(null);
      }, 1000);
    } catch (err: unknown) {
      setEditFeedback({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Error al actualizar los datos del proveedor.",
      });
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleOpenDeleteModal = (sup: Supplier) => {
    setDeletingSupplier(sup);
    setDeleteFeedback(null);
  };

  const handleDeleteSupplier = async () => {
    if (!deletingSupplier) return;
    setDeleteFeedback(null);
    setDeleteSubmitting(true);

    try {
      await PurchasingClientService.deleteSupplier(deletingSupplier.id);
      setDeleteFeedback({
        status: "success",
        message: "Proveedor eliminado permanentemente del sistema.",
      });

      await loadSuppliers();

      setTimeout(() => {
        setDeletingSupplier(null);
        setDeleteFeedback(null);
      }, 1200);
    } catch (err: unknown) {
      setDeleteFeedback({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "No se puede eliminar el proveedor porque tiene órdenes de compra asociadas. Se recomienda inactivarlo.",
      });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            Directorio de Proveedores Comerciales
          </h1>
          <p className="text-xs text-muted-foreground">
            Registro, actualización y gestión técnica de proveedores y casas comerciales
          </p>
        </div>

        <Button
          onClick={() => {
            setIsCreateModalOpen(true);
            setCreateFeedback(null);
          }}
          className="gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Registrar Proveedor
        </Button>
      </div>

      {/* Barra de Filtros */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por RIF, Razón Social o Contacto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => void loadSuppliers()}
            title="Actualizar listado"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />
          </Button>
        </CardContent>
      </Card>

      {/* Tabla de Proveedores */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="py-3 px-4">RIF / ID Fiscal</TableHead>
                <TableHead className="py-3 px-4">Razón Social</TableHead>
                <TableHead className="py-3 px-4">Contacto Directo</TableHead>
                <TableHead className="py-3 px-4">Teléfono</TableHead>
                <TableHead className="py-3 px-4">Correo Electrónico</TableHead>
                <TableHead className="py-3 px-4">Dirección</TableHead>
                <TableHead className="py-3 px-4 text-center">Estado</TableHead>
                <TableHead className="py-3 px-4 text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                    Cargando directorio de proveedores...
                  </TableCell>
                </TableRow>
              ) : filteredSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    No se encontraron proveedores registrados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSuppliers.map((sup) => (
                  <TableRow
                    key={sup.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="py-3 px-4 font-mono font-bold text-foreground whitespace-nowrap">
                      {sup.rifOrId || sup.rif || "-"}
                    </TableCell>
                    <TableCell className="py-3 px-4 font-semibold text-foreground">
                      <button
                        onClick={() => router.push(`/purchasing/suppliers/${sup.id}`)}
                        className="text-left hover:text-primary hover:underline cursor-pointer"
                      >
                        {sup.name}
                      </button>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        {sup.contactName || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        {sup.phone || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        {sup.email || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-muted-foreground max-w-xs truncate">
                      <span
                        className="flex items-center gap-1.5"
                        title={sup.address || ""}
                      >
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        {sup.address || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center whitespace-nowrap">
                      <Badge variant={sup.isActive !== false ? "success" : "secondary"}>
                        {sup.isActive !== false ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/purchasing/suppliers/${sup.id}`)}
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          title="Ver Ficha Técnica y Órdenes"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditModal(sup)}
                          className="h-8 w-8 text-muted-foreground hover:text-amber-600"
                          title="Editar Proveedor"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDeleteModal(sup)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Eliminar Proveedor (Admin)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modal: Registrar Proveedor */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              <DialogTitle className="text-base font-bold text-foreground">
                Registrar Nuevo Proveedor
              </DialogTitle>
            </div>
          </DialogHeader>

          {createFeedback && (
            <Alert
              variant={createFeedback.status === "success" ? "default" : "destructive"}
              className={createFeedback.status === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : ""}
            >
              {createFeedback.status === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <AlertDescription>{createFeedback.message}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleCreateSupplier} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1 space-y-1.5">
                <Label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                  RIF / ID Fiscal *
                </Label>
                <Input
                  type="text"
                  value={createForm.rifOrId}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, rifOrId: e.target.value })
                  }
                  placeholder="J-12345678-9"
                  className="font-mono"
                  required
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                  Razón Social *
                </Label>
                <Input
                  type="text"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                  placeholder="Nombre comercial o empresa"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                  Persona de Contacto
                </Label>
                <Input
                  type="text"
                  value={createForm.contactName}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      contactName: e.target.value,
                    })
                  }
                  placeholder="Representante de ventas"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                  Teléfono
                </Label>
                <Input
                  type="text"
                  value={createForm.phone}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, phone: e.target.value })
                  }
                  placeholder="0212-0000000 / 0414-..."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                Correo Electrónico
              </Label>
              <Input
                type="email"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm({ ...createForm, email: e.target.value })
                }
                placeholder="ventas@proveedor.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                Dirección Fiscal o Almacén
              </Label>
              <Textarea
                rows={2}
                value={createForm.address}
                onChange={(e) =>
                  setCreateForm({ ...createForm, address: e.target.value })
                }
                placeholder="Ubicación física o ciudad..."
                className="resize-none"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createSubmitting}
                className="gap-2"
              >
                {createSubmitting && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {createSubmitting ? "Guardando..." : "Guardar Proveedor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Proveedor */}
      <Dialog
        open={Boolean(editingSupplier)}
        onOpenChange={(open) => {
          if (!open) setEditingSupplier(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-amber-600" />
              <DialogTitle className="text-base font-bold text-foreground">
                Editar Proveedor Comercial
              </DialogTitle>
            </div>
          </DialogHeader>

          {editFeedback && (
            <Alert
              variant={editFeedback.status === "success" ? "default" : "destructive"}
              className={editFeedback.status === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : ""}
            >
              {editFeedback.status === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <AlertDescription>{editFeedback.message}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleUpdateSupplier} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1 space-y-1.5">
                <Label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                  RIF / ID Fiscal *
                </Label>
                <Input
                  type="text"
                  value={editForm.rifOrId}
                  onChange={(e) =>
                    setEditForm({ ...editForm, rifOrId: e.target.value })
                  }
                  placeholder="J-12345678-9"
                  className="font-mono"
                  required
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                  Razón Social *
                </Label>
                <Input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  placeholder="Nombre comercial o empresa"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                  Persona de Contacto
                </Label>
                <Input
                  type="text"
                  value={editForm.contactName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, contactName: e.target.value })
                  }
                  placeholder="Representante"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                  Teléfono
                </Label>
                <Input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                  placeholder="0212-... / 0414-..."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                Correo Electrónico
              </Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
                placeholder="contacto@proveedor.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                Dirección Fiscal o Almacén
              </Label>
              <Textarea
                rows={2}
                value={editForm.address}
                onChange={(e) =>
                  setEditForm({ ...editForm, address: e.target.value })
                }
                placeholder="Ubicación..."
                className="resize-none"
              />
            </div>

            {/* Toggle de Estado Activo/Inactivo */}
            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Checkbox
                  checked={editForm.isActive}
                  onCheckedChange={(checked) =>
                    setEditForm({ ...editForm, isActive: checked === true })
                  }
                />
                <span className="text-xs font-medium text-foreground">
                  Proveedor Activo en el Catálogo de Compras
                </span>
              </label>
              <p className="text-[11px] text-muted-foreground pl-6">
                Si un proveedor tiene órdenes en el historial y no puede eliminarse, puede desactivarlo para que no aparezca en nuevas órdenes.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingSupplier(null)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={editSubmitting}
                className="gap-2"
              >
                {editSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {editSubmitting ? "Guardando Cambios..." : "Actualizar Proveedor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmación de Eliminación (Protección Referencial) */}
      <Dialog
        open={Boolean(deletingSupplier)}
        onOpenChange={(open) => {
          if (!open) setDeletingSupplier(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 text-destructive rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Eliminar Proveedor
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Confirmación con verificación de integridad referencial
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="text-xs text-muted-foreground space-y-3">
            <p>
              ¿Está seguro de que desea eliminar permanentemente al proveedor{" "}
              <strong className="text-foreground">
                {deletingSupplier?.name}
              </strong>{" "}
              (
              <span className="font-mono font-medium text-foreground">
                {deletingSupplier?.rifOrId || deletingSupplier?.rif}
              </span>
              )?
            </p>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] leading-relaxed">
              <strong>Aviso de Seguridad Institucional:</strong> El sistema verificará que este proveedor no posea Órdenes de Compra en el historial. Si existen órdenes registradas, la eliminación será rechazada por seguridad documental.
            </div>
          </div>

          {deleteFeedback && (
            <Alert
              variant={deleteFeedback.status === "success" ? "default" : "destructive"}
              className={deleteFeedback.status === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : ""}
            >
              {deleteFeedback.status === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <div className="space-y-1">
                <AlertDescription className="font-semibold">{deleteFeedback.message}</AlertDescription>
                {deleteFeedback.status === "error" && (
                  <button
                    type="button"
                    onClick={() => {
                      const sup = deletingSupplier;
                      setDeletingSupplier(null);
                      if (sup) handleOpenEditModal(sup);
                    }}
                    className="text-[11px] underline hover:text-destructive cursor-pointer"
                  >
                    Ir a editar para inactivarlo
                  </button>
                )}
              </div>
            </Alert>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingSupplier(null)}
              disabled={deleteSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteSupplier}
              disabled={deleteSubmitting}
              className="gap-2"
            >
              {deleteSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {deleteSubmitting ? "Verificando..." : "Confirmar Eliminación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
