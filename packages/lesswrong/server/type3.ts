import { postGetPageUrl } from "@/lib/collections/posts/helpers";
import { DatabaseServerSetting } from "./databaseSettings";
import { Globals } from "@/lib/vulcan-lib";
import { Posts } from "@/lib/collections/posts";
import { captureEvent } from "@/lib/analyticsEvents";

/* Currently unused
const type3ClientIdSetting = new DatabaseServerSetting<string | null>('type3.clientId', null)
const type3WebhookSecretSetting = new DatabaseServerSetting<string | null>('type3.webhookSecret', null)
*/
const type3ApiTokenSetting = new DatabaseServerSetting<string | null>("type3.apiToken", null);
const type3SourceUrlSetting = new DatabaseServerSetting<string>("type3.sourceUrl", "");

const type3ApiRequest = async (
  endpoint: string,
  method: "POST" | "DELETE",
  body: Json,
) => {
  const token = type3ApiTokenSetting.get();
  if (!token) {
    // eslint-disable-next-line no-console
    console.warn("No type3 API token - skipping API request");
    return;
  }
  const result = await fetch("https://api.type3.audio/" + endpoint, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (result.status !== 200) {
    const message = await result.text();
    throw new Error(`Type3 error: ${message}`);
  }
}

const postWithAudioProjection = {_id: 1, slug: 1} as const;

type PostWithAudio = Pick<DbPost, keyof typeof postWithAudioProjection>;

const getPostUrl = (post: PostWithAudio) =>
  type3SourceUrlSetting.get() + postGetPageUrl(post);

export const regenerateType3Audio = async (post: PostWithAudio) => {
  const body = {
    source_url: getPostUrl(post),
    priority: "immediate",
  };
  await type3ApiRequest("narration/regenerate", "POST", body);
  captureEvent("regenerateType3Audio", {postId: post._id, ...body});
}

const regenerateType3AudioForPostId = async (postId: string) => {
  const post = await Posts.findOne({_id: postId});
  if (!post) {
    throw new Error("Post not found");
  }
  await regenerateType3Audio(post);
}

export const deleteType3Audio = async (post: PostWithAudio) => {
  const body = {
    source_url: getPostUrl(post),
  };
  await type3ApiRequest("narration/delete-by-url", "DELETE", body);
  captureEvent("deleteType3Audio", {postId: post._id, ...body});
}

const deleteType3AudioForPostId = async (postId: string) => {
  const post = await Posts.findOne({_id: postId});
  if (!post) {
    throw new Error("Post not found");
  }
  await deleteType3Audio(post);
}

export const regenerateAllType3AudioForUser = async (userId: string) => {
  const posts: PostWithAudio[] = await Posts.find({
    userId,
  }, {
    projection: postWithAudioProjection,
  }).fetch();

  for (const post of posts) {
    await regenerateType3Audio(post);
  }
}

Globals.regenerateType3AudioForPostId = regenerateType3AudioForPostId;
Globals.deleteType3AudioForPostId = deleteType3AudioForPostId;
Globals.regenerateAllType3AudioForUser = regenerateAllType3AudioForUser;
