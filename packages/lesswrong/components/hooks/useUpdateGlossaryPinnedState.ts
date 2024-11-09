import { useUpdate } from "@/lib/crud/withUpdate";
import { useCurrentUser } from "../common/withUser";
import { useCallback, useState } from "react";
import { useTracking } from "@/lib/analyticsEvents";
import { useCookiesWithConsent } from "./useCookiesWithConsent";

export function useGlossaryPinnedState() {
  const { captureEvent } = useTracking();
  const currentUser = useCurrentUser();
  const [cookies, setCookie] = useCookiesWithConsent(['pinnedGlossary']);
  const PINNED_GLOSSARY_COOKIE = 'pinnedGlossary';

  const { mutate: updateUser } = useUpdate({
    collectionName: "Users",
    fragmentName: 'UsersCurrent',
  });

  // Initialize state based on currentUser or cookie
  const initialPinnedState = currentUser?.postGlossariesPinned ?? cookies[PINNED_GLOSSARY_COOKIE] === 'true';
  const [postGlossariesPinned, setPostGlossariesPinned] = useState(initialPinnedState);

  // TODO streamline this function so we don't repeat logic
  const togglePin = useCallback(async (source: string) => {
    if (currentUser) {
      const newValue = !currentUser.postGlossariesPinned;
      captureEvent('toggleGlossaryPin', { newValue, source });
      setPostGlossariesPinned(newValue);
      await updateUser({
        selector: { _id: currentUser._id },
        data: { postGlossariesPinned: newValue },
        optimisticResponse: {
          ...currentUser,
          postGlossariesPinned: newValue,
        },
      });
    } else {
      const cookieGlossaryPinned = cookies[PINNED_GLOSSARY_COOKIE] === 'true';
      const newValue = !cookieGlossaryPinned;
      captureEvent('toggleGlossaryPin', { newValue, source });
      setCookie(PINNED_GLOSSARY_COOKIE, newValue.toString(), { path: '/', expires: new Date('2038-01-19') });
      setPostGlossariesPinned(newValue);
    }
  }, [updateUser, currentUser, captureEvent, cookies, setCookie]);

  return {
    postGlossariesPinned,
    togglePin,
  };
}
