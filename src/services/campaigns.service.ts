import api from '@/services/api.service';

/** Campaign state on the `treatment-crowdfund` contract and the API. */
export type CampaignStatus = 'active' | 'released' | 'refunded';

/** A patient's treatment campaign; donations are paid to the hospital. */
export interface TreatmentCampaign {
  id: string;
  /** Campaign id returned by the `create_campaign` contract call. */
  onChainCampaignId: string | null;
  patientAddress: string;
  /** Short public title, e.g. "Help Amina get a kidney transplant". */
  title: string;
  hospitalName: string;
  /** Hospital Stellar account that receives the donations. */
  hospitalAddress: string;
  hospitalVerified: boolean;
  story: string;
  goal: string;
  raised: string;
  currency: string;
  donorCount: number;
  /** ISO timestamp after which the campaign closes. */
  deadline: string;
  status: CampaignStatus;
  txHash?: string | null;
  createdAt: string;
}

/** A hospital the patient can raise funds for. */
export interface CampaignHospital {
  address: string;
  name: string;
  city?: string;
  verified: boolean;
}

export interface CreateCampaignPayload {
  title: string;
  hospitalAddress: string;
  goal: string;
  deadline: string;
  story: string;
}

/**
 * Fetch all treatment campaigns.
 * @returns Array of {@link TreatmentCampaign}.
 * @throws {ApiError} On network failure or non-2xx response.
 */
export const fetchCampaigns = () =>
  api.get<TreatmentCampaign[]>('/campaigns').then((r) => r.data);

/**
 * Fetch one treatment campaign.
 * @param id - Campaign id (UUID).
 * @returns The {@link TreatmentCampaign}.
 * @throws {ApiError} 404 when the campaign does not exist.
 */
export const fetchCampaign = (id: string) =>
  api.get<TreatmentCampaign>(`/campaigns/${id}`).then((r) => r.data);

/**
 * Hospitals a patient can choose as the campaign beneficiary. Only verified
 * hospitals are returned, because the contract refuses anyone else.
 * @throws {ApiError} On network failure or non-2xx response.
 */
export const fetchCampaignHospitals = () =>
  api.get<CampaignHospital[]>('/campaigns/hospitals').then((r) => r.data);

/**
 * Create a treatment campaign for the connected patient.
 * @param payload - Verified hospital, goal, deadline and the patient's story.
 * @returns The created {@link TreatmentCampaign}.
 * @throws {ApiError} When the hospital is not verified or the payload is invalid.
 */
export const createCampaign = (payload: CreateCampaignPayload) =>
  api.post<TreatmentCampaign>('/campaigns', payload).then((r) => r.data);
