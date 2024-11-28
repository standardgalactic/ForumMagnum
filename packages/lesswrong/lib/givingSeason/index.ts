import { DatabasePublicSetting } from "../publicSettings";

export const ACTIVE_DONATION_ELECTION = "givingSeason24";
export const DONATION_ELECTION_NUM_WINNERS = 3;
export const DONATION_ELECTION_SHOW_LEADERBOARD_CUTOFF = 100;
export const DONATION_ELECTION_AGE_CUTOFF = new Date("2024-10-22");

export const donationElectionVotingOpenSetting = new DatabasePublicSetting<boolean>('donationElectionVotingOpen', true);
