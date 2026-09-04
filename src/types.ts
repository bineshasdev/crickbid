export type PlayerRole = "batsman" | "bowler" | "allrounder" | "keeper";

export type PlayerStatus = "available" | "in_auction" | "sold" | "unsold";

export type ClubStatus = "pending" | "approved" | "rejected";

export type AuctionStatus = "not_started" | "live" | "paused" | "completed";

export type UserRole = "coordinator" | "manager" | "admin";

export interface AppUser {
  uid: string;
  mobile: string;
  name: string;
  role: UserRole;
  /** set only for managers, references tournaments/{tid}/clubs/{clubId} */
  clubMemberships?: Record<string, string>; // tournamentId -> clubId
  createdAt: number;
}

export interface Tournament {
  id: string;
  name: string;
  createdBy: string; // uid of coordinator
  defaultBasePrice: number;
  defaultBudget: number;
  teamSize: number; // players each club must fill before the auction can finish
  registrationOpen: boolean;
  auctionStatus: AuctionStatus;
  createdAt: number;
}

export interface Club {
  id: string;
  tournamentId: string;
  name: string;
  logoUrl?: string;
  managerName: string;
  managerMobile: string;
  managerUid: string;
  budget: number;
  remainingPoints: number;
  status: ClubStatus;
  createdAt: number;
}

export interface Player {
  id: string;
  tournamentId: string;
  name: string;
  mobile: string;
  role: PlayerRole;
  homeClub?: string; // the club/team the player represents outside the auction
  profileImageUrl?: string;
  basePrice: number;
  status: PlayerStatus;
  soldToClubId?: string;
  soldPrice?: number;
  order: number; // shuffle order used to draw players randomly
  createdAt: number;
}

export interface AuctionState {
  status: AuctionStatus;
  currentPlayerId: string | null;
  currentBid: number;
  currentBidClubId: string | null;
  currentBidClubName: string | null;
  updatedAt: number;
}

/**
 * A coordinator's reusable roster of clubs (`users/{coordinatorUid}/clubPool`),
 * so the same real-world club/manager doesn't need re-entering for every
 * new tournament.
 */
export interface ClubPoolEntry {
  id: string;
  name: string;
  logoUrl?: string;
  managerUid: string;
  managerName: string;
  managerMobile: string;
  createdAt: number;
}

/**
 * A coordinator's reusable roster of players (`users/{coordinatorUid}/playerPool`),
 * so the same real-world player doesn't need re-entering for every new
 * tournament — imported once (e.g. from Excel) and pulled into whichever
 * tournaments they play in.
 */
export interface PlayerPoolEntry {
  id: string;
  name: string;
  mobile: string;
  role: PlayerRole;
  homeClub?: string;
  basePrice: number;
  profileImageUrl?: string;
  createdAt: number;
}

export interface Bid {
  id: string;
  playerId: string;
  clubId: string;
  clubName: string;
  amount: number;
  createdAt: number;
}

export const ROLE_LABELS: Record<PlayerRole, string> = {
  batsman: "Batsman",
  bowler: "Bowler",
  allrounder: "All-Rounder",
  keeper: "Wicket Keeper Batsman",
};
