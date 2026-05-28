export interface Note {
  id?: string;
  titulo: string;
  contenido: string;
  categoria?: string;
  pinned?: boolean;
  archived?: boolean;
  deleted?: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
}
