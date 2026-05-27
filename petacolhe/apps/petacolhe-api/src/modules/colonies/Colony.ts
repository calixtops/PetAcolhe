export type PetSpecies = 'cat' | 'dog' | 'other';
export type PetNeuterStatus = 'none' | 'partial' | 'in_progress' | 'complete';
export type ColonyNeed =
  | 'food' | 'medicine' | 'vet' | 'castration' | 'transport' | 'shelter' | 'volunteer';

export const COLONY_NEEDS: ColonyNeed[] = [
  'food', 'medicine', 'vet', 'castration', 'transport', 'shelter', 'volunteer',
];

export interface PetColony {
  id: string;
  title: string;
  description: string | null;
  lng: number;
  lat: number;
  imageUrl: string | null;
  species: PetSpecies;
  estimatedCount: number;
  neuterStatus: PetNeuterStatus;
  caretakerName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  feedingSchedule: string | null;
  needs: ColonyNeed[];
  createdAt: Date;
}
