export interface Plant {
  id: string;
  owner_id: string;
  species: string;
  nickname: string | null;
  photo_url: string | null;
  date_acquired: string | null;
  watering_interval_days: number | null;
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
  amount_ml: number | null;
  profiles?: { full_name: string | null; email: string | null };
}

export interface CareLog {
  id: string;
  plant_id: string;
  logged_by: string | null;
  logged_at: string;
  note: string;
  care_type: string | null;
  photo_url: string | null;
  profiles?: { full_name: string | null; email: string | null };
}

export type PropagationStage = 'cutting' | 'rooting' | 'rooted' | 'potted' | 'established' | 'failed';
export type PropagationMethod = 'leaf' | 'stem' | 'offset' | 'division' | 'water';

export interface Propagation {
  id: string;
  plant_id: string | null;
  source_species: string | null;
  owner_id: string;
  method: PropagationMethod;
  current_stage: PropagationStage;
  date_taken: string;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
  plants?: { species: string; nickname: string | null };
}

export interface PropagationUpdate {
  id: string;
  propagation_id: string;
  stage: PropagationStage;
  notes: string | null;
  photo_url: string | null;
  logged_at: string;
  logged_by: string | null;
}
