export type ColonyPostType =
  | 'update'
  | 'need'
  | 'photo'
  | 'question'
  | 'donation_offer'
  | 'action_done';

export const COLONY_POST_TYPES: ColonyPostType[] = [
  'update', 'need', 'photo', 'question', 'donation_offer', 'action_done',
];

export interface ColonyPost {
  id: string;
  colonyId: string;
  authorName: string | null;
  authorContact: string | null;
  postType: ColonyPostType;
  body: string;
  photos: string[];
  createdAt: Date;
}
