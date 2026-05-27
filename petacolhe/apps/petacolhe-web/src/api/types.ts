export type Species = 'cat' | 'dog' | 'other';
export type NeuterStatus = 'none' | 'partial' | 'in_progress' | 'complete';
export type ColonyNeed =
  | 'food' | 'medicine' | 'vet' | 'castration' | 'transport' | 'shelter' | 'volunteer';
export type PartnerType = 'clinic' | 'ngo' | 'petshop' | 'volunteer' | 'donor' | 'other';
export type PartnerService =
  | 'castration' | 'vaccine' | 'consultation' | 'adoption'
  | 'food_donation' | 'shelter' | 'transport';

export interface Colony {
  id: string; title: string; description: string | null;
  lng: number; lat: number; imageUrl: string | null;
  species: Species; estimatedCount: number; neuterStatus: NeuterStatus;
  caretakerName: string | null; contactPhone: string | null; contactEmail: string | null;
  feedingSchedule: string | null; needs: ColonyNeed[]; createdAt: string;
}

export interface MissingAlert {
  id: string; title: string; description: string | null;
  lng: number; lat: number; imageUrl: string | null;
  species: Species; petName: string; lastSeenAt: string; isFound: boolean;
  contactPhone: string | null; contactEmail: string | null; reward: string | null;
  createdAt: string;
}

export interface Partner {
  id: string; title: string; description: string | null;
  lng: number; lat: number; imageUrl: string | null;
  partnerType: PartnerType; services: PartnerService[];
  contactEmail: string | null; contactPhone: string | null;
  website: string | null; freeServices: boolean; createdAt: string;
}

export interface Adoption {
  id: string; name: string; species: Species; ageMonths: number | null;
  description: string | null; imageUrl: string | null;
  isNeutered: boolean; isAdopted: boolean; isUrgent: boolean; city: string | null;
  contactEmail: string | null; contactPhone: string | null; createdAt: string;
}

export const SPECIES_LABEL: Record<Species, string> = { cat: 'Gato', dog: 'Cachorro', other: 'Outro' };
export const NEUTER_LABEL: Record<NeuterStatus, string> = {
  none: 'Sem castração', partial: 'Parcial', in_progress: 'Em andamento', complete: 'Completa',
};
export const NEED_LABEL: Record<ColonyNeed, string> = {
  food: 'Ração', medicine: 'Remédios', vet: 'Veterinário', castration: 'Castração',
  transport: 'Transporte', shelter: 'Abrigo', volunteer: 'Voluntário',
};
export const PARTNER_TYPE_LABEL: Record<PartnerType, string> = {
  clinic: 'Clínica', ngo: 'ONG', petshop: 'Pet Shop',
  volunteer: 'Voluntário', donor: 'Doador', other: 'Outro',
};
export const PARTNER_SERVICE_LABEL: Record<PartnerService, string> = {
  castration: 'Castração', vaccine: 'Vacinação', consultation: 'Consulta',
  adoption: 'Adoção', food_donation: 'Doação de ração',
  shelter: 'Abrigo', transport: 'Transporte',
};

export const NEUTER_COLOR: Record<NeuterStatus, string> = {
  none: '#c0392b', partial: '#e67e22', in_progress: '#f1c40f', complete: '#27ae60',
};
export const PARTNER_COLOR: Record<PartnerType, string> = {
  clinic: '#2980b9', ngo: '#8e44ad', petshop: '#16a085',
  volunteer: '#27ae60', donor: '#d35400', other: '#7f8c8d',
};

// ============= Forum =============
export type PostType =
  | 'update' | 'need' | 'photo' | 'question' | 'donation_offer' | 'action_done';

export interface ColonyPost {
  id: string; colonyId: string;
  authorName: string | null; authorContact: string | null;
  postType: PostType; body: string;
  photos: string[]; createdAt: string;
}

export const POST_TYPE_LABEL: Record<PostType, string> = {
  update: '💬 Atualização',
  need: '🚨 Necessidade urgente',
  photo: '📸 Foto',
  question: '❓ Pergunta',
  donation_offer: '🎁 Oferta de doação',
  action_done: '✅ Ação realizada',
};

export const POST_TYPE_COLOR: Record<PostType, string> = {
  update: '#6b7c8c',
  need: '#c0392b',
  photo: '#16a085',
  question: '#2980b9',
  donation_offer: '#27ae60',
  action_done: '#27ae60',
};
