export interface Note {
  id?: string;
  titulo: string;
  contenido: string;
  categoria?: string;
  pinned?: boolean;
  archived?: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
}
