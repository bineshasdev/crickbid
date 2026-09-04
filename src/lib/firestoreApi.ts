import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import type {
  Club,
  ClubStatus,
  Player,
  PlayerRole,
  Tournament,
} from "../types";

// ---------- Tournaments ----------

export async function createTournament(
  createdBy: string,
  name: string,
  defaultBasePrice: number,
  defaultBudget: number,
  teamSize: number = 10
) {
  const ref = await addDoc(collection(db, "tournaments"), {
    name,
    createdBy,
    defaultBasePrice,
    defaultBudget,
    teamSize,
    registrationOpen: true,
    auctionStatus: "not_started",
    createdAt: serverTimestamp(),
  });
  // seed the auction state doc
  await setDoc(doc(db, "tournaments", ref.id, "auction", "state"), {
    status: "not_started",
    currentPlayerId: null,
    currentBid: 0,
    currentBidClubId: null,
    currentBidClubName: null,
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export function tournamentRef(tournamentId: string) {
  return doc(db, "tournaments", tournamentId);
}

export async function setRegistrationOpen(tournamentId: string, open: boolean) {
  await updateDoc(tournamentRef(tournamentId), { registrationOpen: open });
}

// ---------- Clubs ----------

export function clubsCollection(tournamentId: string) {
  return collection(db, "tournaments", tournamentId, "clubs");
}

export function clubRef(tournamentId: string, clubId: string) {
  return doc(db, "tournaments", tournamentId, "clubs", clubId);
}

export async function registerClub(
  tournamentId: string,
  managerUid: string,
  managerName: string,
  managerMobile: string,
  clubName: string,
  budget: number,
  logoUrl?: string
) {
  const ref = await addDoc(clubsCollection(tournamentId), {
    tournamentId,
    name: clubName,
    logoUrl: logoUrl ?? null,
    managerName,
    managerMobile,
    managerUid,
    budget,
    remainingPoints: budget,
    status: "pending" as ClubStatus,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Creates the Firestore profile doc for a login the coordinator created. */
export async function createUserProfile(
  uid: string,
  mobile: string,
  name: string,
  role: "coordinator" | "manager"
) {
  await setDoc(doc(db, "users", uid), {
    uid,
    mobile: mobile.replace(/\D/g, ""),
    name,
    role,
    createdAt: serverTimestamp(),
  });
}

/** Coordinator action: adds a club directly, already approved — no invite link needed. */
export async function addClubByCoordinator(
  tournamentId: string,
  managerUid: string,
  managerName: string,
  managerMobile: string,
  clubName: string,
  budget: number,
  logoUrl?: string
) {
  const ref = await addDoc(clubsCollection(tournamentId), {
    tournamentId,
    name: clubName,
    logoUrl: logoUrl ?? null,
    managerName,
    managerMobile,
    managerUid,
    budget,
    remainingPoints: budget,
    status: "approved" as ClubStatus,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function setClubStatus(
  tournamentId: string,
  clubId: string,
  status: ClubStatus
) {
  await updateDoc(clubRef(tournamentId, clubId), { status });
}

export async function myClubInTournament(tournamentId: string, uid: string) {
  const q = query(clubsCollection(tournamentId), where("managerUid", "==", uid));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Club;
}

/** Reassigns or edits the manager on a club already added to a tournament. */
export async function updateClubManager(
  tournamentId: string,
  clubId: string,
  managerUid: string,
  managerName: string,
  managerMobile: string
) {
  await updateDoc(clubRef(tournamentId, clubId), {
    managerUid,
    managerName,
    managerMobile,
  });
}

// ---------- Club pool (a coordinator's reusable club/manager roster) ----------

export function clubPoolCollection(coordinatorUid: string) {
  return collection(db, "users", coordinatorUid, "clubPool");
}

/** Adds a new pool entry, or refreshes an existing one's manager details. */
export async function upsertClubPoolEntry(
  coordinatorUid: string,
  fields: {
    name: string;
    logoUrl?: string;
    managerUid: string;
    managerName: string;
    managerMobile: string;
  },
  poolId?: string
) {
  const data = { ...fields, logoUrl: fields.logoUrl ?? null };
  if (poolId) {
    await updateDoc(doc(clubPoolCollection(coordinatorUid), poolId), data);
    return poolId;
  }
  const ref = await addDoc(clubPoolCollection(coordinatorUid), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Every manager-role user in the system, for picking an already-registered manager. */
export function managerUsersQuery() {
  return query(collection(db, "users"), where("role", "==", "manager"));
}

// ---------- Players ----------

export function playersCollection(tournamentId: string) {
  return collection(db, "tournaments", tournamentId, "players");
}

export function playerRef(tournamentId: string, playerId: string) {
  return doc(db, "tournaments", tournamentId, "players", playerId);
}

export async function addPlayer(
  tournamentId: string,
  name: string,
  mobile: string,
  role: PlayerRole,
  basePrice: number,
  homeClub?: string,
  profileImageUrl?: string
) {
  await addDoc(playersCollection(tournamentId), {
    tournamentId,
    name,
    mobile,
    role,
    homeClub: homeClub ?? null,
    profileImageUrl: profileImageUrl ?? null,
    basePrice,
    status: "available",
    soldToClubId: null,
    soldPrice: null,
    order: Math.random(),
    createdAt: serverTimestamp(),
  });
}

export async function updatePlayer(
  tournamentId: string,
  playerId: string,
  fields: Partial<Player>
) {
  await updateDoc(playerRef(tournamentId, playerId), fields);
}

export async function deletePlayer(tournamentId: string, playerId: string) {
  await deleteDoc(playerRef(tournamentId, playerId));
}

// ---------- Player pool (a coordinator's reusable player roster) ----------

export function playerPoolCollection(coordinatorUid: string) {
  return collection(db, "users", coordinatorUid, "playerPool");
}

/**
 * Adds a new pool entry, or refreshes the existing one sharing this mobile
 * number — so re-importing the same sheet updates rather than duplicates.
 */
export async function upsertPlayerPoolEntry(
  coordinatorUid: string,
  fields: {
    name: string;
    mobile: string;
    role: PlayerRole;
    homeClub?: string;
    basePrice: number;
    profileImageUrl?: string;
  }
) {
  const data = {
    ...fields,
    homeClub: fields.homeClub ?? null,
    profileImageUrl: fields.profileImageUrl ?? null,
  };
  const pool = playerPoolCollection(coordinatorUid);
  if (fields.mobile) {
    const existing = await getDocs(query(pool, where("mobile", "==", fields.mobile)));
    if (!existing.empty) {
      await updateDoc(existing.docs[0].ref, data);
      return existing.docs[0].id;
    }
  }
  const ref = await addDoc(pool, { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

// ---------- Auction ----------

export function auctionStateRef(tournamentId: string) {
  return doc(db, "tournaments", tournamentId, "auction", "state");
}

export function bidsCollection(tournamentId: string) {
  return collection(db, "tournaments", tournamentId, "auction", "state", "bids");
}

/** Coordinator action: shuffles unsold/available players and pulls the first one up. */
export async function startAuction(tournamentId: string) {
  const playersSnap = await getDocs(playersCollection(tournamentId));
  const available = playersSnap.docs.filter(
    (d) => d.data().status === "available"
  );
  // re-shuffle the draw order
  await Promise.all(
    available.map((d) => updateDoc(d.ref, { order: Math.random() }))
  );
  await updateDoc(tournamentRef(tournamentId), { auctionStatus: "live" });
  await drawNextPlayer(tournamentId);
}

/**
 * Coordinator action: brings a random unsold/available player onto the
 * block. The auction isn't allowed to finish just because the draw pool ran
 * dry — as long as some approved club still hasn't filled its `teamSize`
 * roster, unsold players are automatically brought back up for a re-draw.
 * It only completes once every club is full, or there's truly no one left
 * to auction (no players available or unsold at all).
 */
export async function drawNextPlayer(tournamentId: string) {
  const [tournament, playersSnap, clubsSnap] = await Promise.all([
    getTournament(tournamentId),
    getDocs(playersCollection(tournamentId)),
    getDocs(query(clubsCollection(tournamentId), where("status", "==", "approved"))),
  ]);

  const teamSize = tournament?.teamSize ?? 10;
  const allPlayers = playersSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Player);
  const clubs = clubsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Club);

  const rosterCount = (clubId: string) =>
    allPlayers.filter((p) => p.status === "sold" && p.soldToClubId === clubId).length;
  const teamsFull = clubs.length > 0 && clubs.every((c) => rosterCount(c.id) >= teamSize);

  let available = allPlayers
    .filter((p) => p.status === "available")
    .sort((a, b) => a.order - b.order);

  if (!teamsFull && available.length === 0) {
    const unsold = allPlayers.filter((p) => p.status === "unsold");
    if (unsold.length > 0) {
      const relisted = unsold.map((p) => ({
        ...p,
        status: "available" as const,
        order: Math.random(),
      }));
      await Promise.all(
        relisted.map((p) =>
          updateDoc(playerRef(tournamentId, p.id), {
            status: "available",
            order: p.order,
          })
        )
      );
      available = relisted.sort((a, b) => a.order - b.order);
    }
  }

  const next = teamsFull ? null : (available[0] ?? null);

  if (next) {
    await updateDoc(playerRef(tournamentId, next.id), { status: "in_auction" });
  }

  await updateDoc(auctionStateRef(tournamentId), {
    status: next ? "live" : "completed",
    currentPlayerId: next?.id ?? null,
    currentBid: next?.basePrice ?? 0,
    currentBidClubId: null,
    currentBidClubName: null,
    updatedAt: serverTimestamp(),
  });

  if (!next) {
    await updateDoc(tournamentRef(tournamentId), { auctionStatus: "completed" });
  }
}

/** Manager action: raises the bid on the current player for their own club. */
export async function placeBid(
  tournamentId: string,
  amount: number,
  clubId: string,
  clubName: string,
  playerId: string
) {
  await updateDoc(auctionStateRef(tournamentId), {
    currentBid: amount,
    currentBidClubId: clubId,
    currentBidClubName: clubName,
    updatedAt: serverTimestamp(),
  });
  await addDoc(bidsCollection(tournamentId), {
    playerId,
    clubId,
    clubName,
    amount,
    createdAt: serverTimestamp(),
  });
}

/** Coordinator action: confirms the sale to the current highest bidder. */
export async function markSold(
  tournamentId: string,
  playerId: string,
  clubId: string,
  price: number
) {
  await runTransaction(db, async (tx) => {
    const clubDocRef = clubRef(tournamentId, clubId);
    const clubSnap = await tx.get(clubDocRef);
    if (!clubSnap.exists()) throw new Error("Club not found");
    const remaining = (clubSnap.data().remainingPoints as number) ?? 0;
    if (remaining < price) throw new Error("Club does not have enough points");

    tx.update(clubDocRef, { remainingPoints: increment(-price) });
    tx.update(playerRef(tournamentId, playerId), {
      status: "sold",
      soldToClubId: clubId,
      soldPrice: price,
    });
  });
  await drawNextPlayer(tournamentId);
}

/** Coordinator action: no club bought the player; they go back to the pool as unsold. */
export async function markUnsold(tournamentId: string, playerId: string) {
  await updateDoc(playerRef(tournamentId, playerId), { status: "unsold" });
  await drawNextPlayer(tournamentId);
}

/** Coordinator action: put an unsold player back up for auction. */
export async function relistPlayer(tournamentId: string, playerId: string) {
  await updateDoc(playerRef(tournamentId, playerId), {
    status: "available",
    order: Math.random(),
  });
}

export async function getTournament(tournamentId: string) {
  const snap = await getDoc(tournamentRef(tournamentId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Tournament) : null;
}
