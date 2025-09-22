
export interface ImageFile {
  base64: string;
  mimeType: string;
}

export interface Character {
  id: number;
  name: string;
  image: ImageFile | null;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface HistoryItem {
  id: string;
  image: ImageFile;
  prompt: string;
  createdAt: string;
}
