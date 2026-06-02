export interface Plant {
  id: string;
  owner_id: string;
  species: string;
  nickname: string | null;
  photo_url: string | null;
  date_acquired: string | null; // ISO date string
  created_at: string;
  updated_at: string;
  caretakers?: Caretaker[];
}

export interface Caretaker {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface WateringLog {
  id: string;
  plant_id: string;
  watered_by: string | null;
  watered_at: string;
  notes: string | null;
  amount_ml: number | null;
  profiles?: { full_name: string | null; email: string | null };
}

export interface FertilizeLog {
  id: string;
  plant_id: string;
  fertilized_by: string | null;
  fertilized_at: string;
  notes: string | null;
  fertilizer_name: string | null;
  profiles?: { full_name: string | null; email: string | null };
}

export interface CareLog {
  id: string;
  plant_id: string;
  logged_by: string | null;
  logged_at: string;
  note: string;
  care_type: string | null;
  profiles?: { full_name: string | null; email: string | null };
}
