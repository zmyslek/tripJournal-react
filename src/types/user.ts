import { createUserFromSession } from "../domain/user/User.ts";
import { getStoredUserProfile, saveStoredUserProfile } from "../infrastructure/user/LocalUserProfileRepository.ts";

export type {
    AuthProvider,
    StoredUserProfile,
    UserRecord
} from "../domain/user/User.ts";

export { USER_PROFILE_CACHE_KEY, clearStoredUserProfile, getStoredUserProfile, saveStoredUserProfile } from "../infrastructure/user/LocalUserProfileRepository.ts";

export const getCachedUserRecord = getStoredUserProfile;
export const saveCachedUserRecord = saveStoredUserProfile;
export const createStoredUserProfileFromSession = createUserFromSession;
export const createUserRecordFromAuth = createUserFromSession;
