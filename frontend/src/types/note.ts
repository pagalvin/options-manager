export interface Note {
  id: number;
  date_created: string;
  date_modified: string;
  key_date?: string;
  symbol?: string;
  note_type: string;
  title: string;
  body: string;
}

export interface NoteType {
  note_type: string;
}
