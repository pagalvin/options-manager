export interface Note {
  id: number;
  date_created: string;
  date_modified: string;
  key_date?: string | null;
  symbol?: string | null;
  note_type: string;
  title: string;
  body: string;
}