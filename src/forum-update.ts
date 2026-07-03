import fs from 'fs';
import log from './log.js';
import { saveDatabase, type TsbDataStore } from './database.js';
import * as crypto from 'crypto';
import { getOutputPath } from './output.js';
import { MODEL_CODE_MAP } from './model-codes.js';
import { generateJSON } from '@tiptap/html';
import { Bold } from '@tiptap/extension-bold';
import { Document } from '@tiptap/extension-document';
import { HardBreak } from '@tiptap/extension-hard-break';
import { Italic } from '@tiptap/extension-italic';
import { Link } from '@tiptap/extension-link';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { Color, TextStyle, FontSize } from '@tiptap/extension-text-style';

const TIP_TAP_EXTENSIONS = [
  Bold,
  Color,
  Document,
  FontSize,
  HardBreak,
  Italic,
  Link,
  Paragraph,
  Text,
  TextStyle,
];

export const FORUM_POST_MAX_LENGTH = 100000; //buffer for actual limit of 105000

interface ForumPost {
  postId: string;
  postUrl: string;
  contentPath: string;
  reply?: boolean;
  forceUpdate?: boolean;
}

interface BimmerpostResponse {
  userData?: {
    userid?: number;
    username?: string;
  };
  appData?: {
    success?: number;
    message?: string;
    postid?: string;
  }[];
}

interface BimmerpostLoginResponse {
  userData?: {
    userid?: number;
  };
  appData?: {
    success?: number;
    errorMsg?: string;
  };
}

const USER_AGENT = 'itsanalogue-bmw-tsb-updates';
const FORUM_POSTS: ForumPost[] = [
  // {
  //   postId: '32677698',
  //   postUrl: 'https://g80.bimmerpost.com/beta/showthread/2233316/test-service-bulletin-updates?p=32677698',
  //   contentPath: 'BMW-G80/RECENT.html',
  //   //forceUpdate: true,
  // },
  // {
  //   postId: '32677697',
  //   postUrl: 'https://g80.bimmerpost.com/beta/showthread/2233316/test-service-bulletin-updates?p=32677697',
  //   contentPath: 'BMW-G80/NEW.html',
  //   reply: true,
  //   //forceUpdate: true,
  // },
  {
    postId: '32308235',
    postUrl:
      'https://g45.bimmerpost.com/forums/showthread/2202957/bmw-service-bulletin-lists-check-for-your-model?p=32308235',
    contentPath: 'BMW/NEW.html',
    reply: true,
  },
  {
    postId: '32308237',
    postUrl:
      'https://g45.bimmerpost.com/forums/showthread/2202957/bmw-service-bulletin-lists-check-for-your-model?p=32308237',
    contentPath: 'BMW/ALL.html',
  },
  {
    postId: '32306435',
    postUrl:
      'https://g05.bimmerpost.com/forums/showthread/2202786/bmw-x5-service-bulletin-list?p=32306435',
    contentPath: 'BMW-G05/NEW.html',
    reply: true,
  },
  {
    postId: '32306436',
    postUrl:
      'https://g05.bimmerpost.com/forums/showthread/2202786/bmw-x5-service-bulletin-list?p=32306436',
    contentPath: 'BMW-G05/RECENT.html',
  },
  {
    postId: '32306413',
    postUrl:
      'https://g45.bimmerpost.com/forums/showthread/2202784/bmw-x7-service-bulletin-list?p=32306413',
    contentPath: 'BMW-G07/NEW.html',
    reply: true,
  },
  {
    postId: '32306416',
    postUrl:
      'https://g45.bimmerpost.com/forums/showthread/2202784/bmw-x7-service-bulletin-list?p=32306416',
    contentPath: 'BMW-G07/RECENT.html',
  },
  {
    postId: '32307083',
    postUrl:
      'https://g45.bimmerpost.com/forums/showthread/2202837/bmw-g20-g22-service-bulletin-list?p=32307083',
    contentPath: 'BMW-G20/NEW.html',
    reply: true,
  },
  {
    postId: '32307084',
    postUrl:
      'https://g45.bimmerpost.com/forums/showthread/2202837/bmw-g20-g22-service-bulletin-list?p=32307084',
    contentPath: 'BMW-G20/RECENT.html',
  },
  {
    postId: '32306388',
    postUrl:
      'https://g45.bimmerpost.com/forums/showthread/2202782/bmw-i4-service-bulletin-list?p=32306388',
    contentPath: 'BMW-G26/NEW.html',
    reply: true,
  },
  {
    postId: '32306389',
    postUrl:
      'https://g45.bimmerpost.com/forums/showthread/2202782/bmw-i4-service-bulletin-list?p=32306389',
    contentPath: 'BMW-G26/RECENT.html',
  },
  {
    postId: '32307803',
    postUrl:
      'https://g45.bimmerpost.com/forums/showthread/2202927/bmw-g42-service-bulletin-list?p=32307803',
    contentPath: 'BMW-G42/NEW.html',
    reply: true,
  },
  {
    postId: '32307804',
    postUrl:
      'https://g45.bimmerpost.com/forums/showthread/2202927/bmw-g42-service-bulletin-list?p=32307804',
    contentPath: 'BMW-G42/RECENT.html',
  },
  {
    postId: '32306476',
    postUrl:
      'https://g45.bimmerpost.com/forums/showthread/2202789/bmw-x3-service-bulletin-list?p=32306476',
    contentPath: 'BMW-G45/NEW.html',
    reply: true,
  },
  {
    postId: '32306477',
    postUrl:
      'https://g45.bimmerpost.com/forums/showthread/2202789/bmw-x3-service-bulletin-list?p=32306477',
    contentPath: 'BMW-G45/RECENT.html',
  },
  {
    postId: '32306452',
    postUrl:
      'https://g45.bimmerpost.com/forums/showthread/2202787/bmw-g60-service-bulletin-list?p=32306452',
    contentPath: 'BMW-G60/NEW.html',
    reply: true,
  },
  {
    postId: '32306455',
    postUrl:
      'https://g45.bimmerpost.com/forums/showthread/2202787/bmw-g60-service-bulletin-list?p=32306455',
    contentPath: 'BMW-G60/RECENT.html',
  },
  {
    postId: '32307091',
    postUrl:
      'https://g45.bimmerpost.com/forums/showthread/2202838/bmw-g70-service-bulletin-list?p=32307091',
    contentPath: 'BMW-G70/NEW.html',
    reply: true,
  },
  {
    postId: '32307092',
    postUrl:
      'https://g45.bimmerpost.com/forums/showthread/2202838/bmw-g70-service-bulletin-list?p=32307092',
    contentPath: 'BMW-G70/RECENT.html',
  },
  {
    postId: '32307780',
    postUrl:
      'https://g45.bimmerpost.com/forums/showthread/2202838/bmw-g70-service-bulletin-list?p=32307780',
    contentPath: 'BMW-G80/NEW.html',
    reply: true,
  },
  {
    postId: '32307783',
    postUrl:
      'https://g80.bimmerpost.com/beta/showthread/2202924/bmw-m3-m4-service-bulletin-list?p=32307783',
    contentPath: 'BMW-G80/RECENT.html',
  },
  {
    postId: '32307797',
    postUrl:
      'https://g45.bimmerpost.com/forums/showthread/2202925/bmw-m2-service-bulletin-list?p=32307797',
    contentPath: 'BMW-G87/NEW.html',
    reply: true,
  },
  {
    postId: '32307799',
    postUrl:
      'https://g45.bimmerpost.com/forums/showthread/2202925/bmw-m2-service-bulletin-list?p=32307799',
    contentPath: 'BMW-G87/RECENT.html',
  },
  {
    postId: '32307775',
    postUrl:
      'https://g45.bimmerpost.com/forums/showthread/2202923/bmw-m5-service-bulletin-list?p=32307775',
    contentPath: 'BMW-G90/NEW.html',
    reply: true,
  },
  {
    postId: '32307778',
    postUrl:
      'https://g45.bimmerpost.com/forums/showthread/2202923/bmw-m5-service-bulletin-list?p=32307778',
    contentPath: 'BMW-G90/RECENT.html',
  },
  {
    postId: '32306961',
    postUrl:
      'https://u11.bimmerpost.com/forums/showthread/2202826/bmw-x1-x2-service-bulletin-list?p=32306961',
    contentPath: 'BMW-U11/NEW.html',
    reply: true,
  },
  {
    postId: '32306962',
    postUrl:
      'https://u11.bimmerpost.com/forums/showthread/2202826/bmw-x1-x2-service-bulletin-list?p=32306962',
    contentPath: 'BMW-U11/RECENT.html',
  },
  {
    postId: '32284224',
    postUrl:
      'https://g45.bimmerpost.com/forums/showthread/2200797/bmw-ix-service-bulletin-list?p=32284224',
    contentPath: 'BMW-I20/NEW.html',
    reply: true,
  },
  {
    postId: '32284226',
    postUrl:
      'https://g45.bimmerpost.com/forums/showthread/2200797/bmw-ix-service-bulletin-list?p=32284226',
    contentPath: 'BMW-I20/RECENT.html',
  },
  {
    postId: '32284235',
    postUrl:
      'https://g45.bimmerpost.com/forums/showthread/2200797/bmw-ix-service-bulletin-list?p=32284235',
    contentPath: 'BMW-I20/2026.html',
  },
  {
    postId: '32284236',
    postUrl:
      'https://g45.bimmerpost.com/forums/showthread/2200797/bmw-ix-service-bulletin-list?p=32284236',
    contentPath: 'BMW-I20/2027.html',
  },
];

export const FORUM_MODEL_GROUPS = new Map<string, string[]>([
  ['G01', ['G01', 'G02']],
  ['G05', ['G05', 'G06']],
  ['G07', ['G07']],
  ['G09', ['G09']],
  ['G14', ['G14', 'G15', 'G16', 'F91', 'F92', 'F93']],
  ['G20', ['G20', 'G21', 'G22', 'G23']],
  ['G26', ['G26']],
  ['G29', ['G29']],
  ['G42', ['G42']],
  ['G45', ['G45']],
  ['G60', ['G60', 'G61']],
  ['G70', ['G70']],
  ['G80', ['G80', 'G81', 'G82', 'G83']],
  ['G87', ['G87']],
  ['G90', ['G90', 'G99']],
  ['I20', ['I20']],
  ['U11', ['U10', 'U11']],
]);

export const isForumMatch = (
  models: { code?: string }[],
  forumCodes: Set<string>,
): boolean => {
  const matchingCodes = new Set();
  for (const code of forumCodes.values()) {
    const codeValues = FORUM_MODEL_GROUPS.get(code) ?? [];
    for (const cv of codeValues) {
      matchingCodes.add(cv);
    }
  }

  return models.some((m) => m.code && matchingCodes.has(m.code));
};

export const getModelNamesForForum = (forumCode: string) => {
  const modelNames = new Set<string>();
  const allCodes = FORUM_MODEL_GROUPS.get(forumCode) ?? [];
  for (const code of allCodes) {
    const modelDef = MODEL_CODE_MAP.get(code);
    if (modelDef) {
      for (const model of modelDef.models.keys()) {
        modelNames.add(model);
      }
    }
  }
  return [...modelNames].sort();
};

let bimmerpostAuthCookie: string | undefined = undefined;
async function getBimmerpostAuthCookie() {
  const username = process.env.FORUM_USERNAME;
  const password = process.env.FORUM_PASSWORD;

  if (!username || !password) {
    return undefined;
  }

  if (bimmerpostAuthCookie) {
    return bimmerpostAuthCookie;
  }

  const loginUrl = 'https://g45.bimmerpost.com/forums/login.php';
  let anonCsrfCookie: string | undefined = undefined;

  const loginPageRes = await fetch(loginUrl, {
    headers: {
      'User-Agent': USER_AGENT,
    },
  });

  const loginCookies = loginPageRes.headers.getSetCookie();
  for (const cookie of loginCookies) {
    if (cookie.startsWith('csrf=')) {
      anonCsrfCookie = cookie.split(';')[0];
    }
  }
  if (!anonCsrfCookie) {
    throw new Error(`Failed to read pre-auth CSRF cookie for login.`);
  }

  const loginPageText = await loginPageRes.text();
  const csrfTokenMatch = /<meta\sname="csrf-token"\scontent="([^"]+)">/.exec(
    loginPageText,
  );
  if (!csrfTokenMatch) {
    throw new Error(`Failed to read CSRF token from login page.`);
  }
  const csrfToken = csrfTokenMatch[1];

  const loginPostRes = await fetch(`${loginUrl}?api=1&web=1`, {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      'X-CSRF-Token': csrfToken,
      'Content-Type': 'application/json',
      Cookie: anonCsrfCookie,
      Referer: loginUrl,
    },
    body: JSON.stringify({
      do: 'login',
      username,
      password,
      remember_me: 0,
    }),
  });
  if (!loginPostRes.ok) {
    throw new Error(`Failed to login. ${loginPageRes.statusText}`);
  }
  const loginPostResText = await loginPostRes.text();
  try {
    const loginPostJson = JSON.parse(
      loginPostResText,
    ) as BimmerpostLoginResponse;
    if (
      loginPostJson.appData?.success === 0 ||
      loginPostJson.userData?.userid === 0
    ) {
      throw new Error(
        `Unexpected response from bimmerpost login: ${loginPostJson.appData?.errorMsg}`,
      );
    }
  } catch (error) {
    throw new Error(
      `Failed bimmerpost login: ${(error as Error).message}\n\n${loginPostResText}`,
    );
  }

  let authCookie = '';
  const setCookies = loginPostRes.headers.getSetCookie();
  for (const cookie of setCookies) {
    if (cookie.startsWith('csrf=')) {
      authCookie = cookie.split(';')[0];
    }
  }
  if (!authCookie) {
    throw new Error(`Failed to read authenticated CSRF cookie for login.`);
  }

  if (!bimmerpostAuthCookie) {
    bimmerpostAuthCookie = authCookie;
  }
  return bimmerpostAuthCookie;
}

function getPostUrl(pageUrl: string) {
  const urlParts = pageUrl.split('/').slice(0, 4);
  return `${urlParts.join('/')}/threadpost.php`;
}

export async function updatePostBimmerpost({
  content,
  post,
}: {
  content: string;
  post: ForumPost;
}) {
  const authCookie = await getBimmerpostAuthCookie();
  if (!authCookie) {
    log.info(`No credentials, skipping update of post ${post.postUrl}`);
    return false;
  }

  const showPageRes = await fetch(post.postUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      Cookie: authCookie,
    },
  });
  if (!showPageRes.ok) {
    throw new Error(
      `Failed to load edit page for post at ${post.postUrl}: ${showPageRes.status} ${showPageRes.statusText}`,
    );
  }

  if (showPageRes.url !== post.postUrl) {
    log.warn(`Redirected from ${post.postUrl} to ${showPageRes.url}`);
  }

  const showPageText = await showPageRes.text();
  const csrfTokenMatch = /<meta\sname="csrf-token"\scontent="([^"]+)">/.exec(
    showPageText,
  );
  if (!csrfTokenMatch) {
    throw new Error(
      `Failed to read CSRF token from page meta tag for post at ${post.postUrl}`,
    );
  }
  const csrfToken = csrfTokenMatch[1];

  const existingPostMatch = new RegExp(
    `<section[^>]*class="[^"]*postbit__content[^"]*"[^>]*data-postid="${post.postId}"[^>]*>([\\s\\S]*?)<\\/section>`,
    'gms',
  ).exec(showPageText);
  if (existingPostMatch) {
    const existingPostText = existingPostMatch[1];
    const existingPostFilePath = getOutputPath(
      post.contentPath.replace('.html', '.prior.html'),
    );
    await fs.promises.writeFile(
      existingPostFilePath,
      `<p>${existingPostText.trim()}</p>`,
    );
  } else {
    log.warn(`Unable to load prior content for post at ${post.postUrl}`);
    const existingPageFilePath = getOutputPath(
      post.contentPath.replace('.html', '.page.html'),
    );
    await fs.promises.writeFile(existingPageFilePath, `<p>${showPageText}</p>`);
  }

  const encodedContent = generateJSON(content, TIP_TAP_EXTENSIONS);

  const postBody = new FormData();
  postBody.append('do', 'editapost');
  postBody.append('tid', null);
  postBody.append('postid', post.postId);
  postBody.append('thetitle', '');
  postBody.append('message_json', JSON.stringify(encodedContent));
  postBody.append('type', 0);

  const postUrl = getPostUrl(showPageRes.url);

  const updatePageRes = await fetch(postUrl, {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      'X-CSRF-Token': csrfToken,
      Cookie: authCookie,
      Referer: showPageRes.url,
    },
    body: postBody,
  });
  if (!updatePageRes.ok) {
    throw new Error(
      `Failed to post to ${post.postId} at ${postUrl} : ${showPageRes.status} ${showPageRes.statusText}`,
    );
  }
  const updatePageResText = await updatePageRes.text();
  if (updatePageResText.length > 0) {
    try {
      const postJson = JSON.parse(updatePageResText) as BimmerpostResponse;
      if (postJson.appData && postJson.appData[0]?.success === 0) {
        throw new Error(
          `Failed to post to ${post.postId} at ${postUrl}: ${postJson.appData[0].message}`,
        );
      }
      return true;
    } catch (error) {
      throw new Error(
        `Failed to post to ${post.postId} at ${postUrl}: ${(error as Error).message}\n\n${updatePageResText}`,
      );
    }
  } else {
    return true;
  }
}

export async function replyToThreadBimmerpost({
  content,
  post,
}: {
  content: string;
  post: ForumPost;
}) {
  const authCookie = await getBimmerpostAuthCookie();
  if (!authCookie) {
    log.info(`No credentials, skipping reply to post ${post.postUrl}`);
    return false;
  }

  const showPageRes = await fetch(post.postUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      Cookie: authCookie,
    },
  });
  if (!showPageRes.ok) {
    throw new Error(
      `Failed to load page for post at ${post.postUrl}: ${showPageRes.status} ${showPageRes.statusText}`,
    );
  }

  if (showPageRes.url !== post.postUrl) {
    log.warn(`Redirected from ${post.postUrl} to ${showPageRes.url}`);
  }

  const showPageText = await showPageRes.text();
  const csrfTokenMatch = /<meta\sname="csrf-token"\scontent="([^"]+)">/.exec(
    showPageText,
  );
  if (!csrfTokenMatch) {
    throw new Error(
      `Failed to read CSRF token from page meta tag at ${post.postUrl}`,
    );
  }
  const csrfToken = csrfTokenMatch[1];

  const threadMatch =
    /<div\sclass="new_reply_editor"\stype="newreply"\sthreadid="([^"]+)"/.exec(
      showPageText,
    );
  if (!threadMatch) {
    throw new Error(`Failed to read thread ID for ${post.postUrl}`);
  }
  const threadId = threadMatch[1];

  const encodedContent = generateJSON(content, TIP_TAP_EXTENSIONS);

  const postBody = new FormData();
  postBody.append('do', 'newthreadpost');
  postBody.append('tid', threadId);
  postBody.append('postid', null);
  postBody.append('thetitle', '');
  postBody.append('message_json', JSON.stringify(encodedContent));
  postBody.append('type', 0);

  const postUrl = getPostUrl(showPageRes.url);

  const pageReplyRes = await fetch(postUrl, {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      'X-CSRF-Token': csrfToken,
      Cookie: authCookie,
      Referer: showPageRes.url,
    },
    body: postBody,
  });

  if (!(pageReplyRes.ok || pageReplyRes.status === 302)) {
    throw new Error(
      `Failed to reply to thread ${threadId} at ${postUrl}: ${pageReplyRes.status} ${pageReplyRes.statusText}`,
    );
  }
  const pageReplyResText = await pageReplyRes.text();
  try {
    const postJson = JSON.parse(pageReplyResText) as BimmerpostResponse;
    if (postJson.appData && postJson.appData[0]?.success === 0) {
      throw new Error(
        `Failed to reply to thread ${threadId} at ${postUrl}: ${postJson.appData[0].message}`,
      );
    }
    return true;
  } catch (error) {
    throw new Error(
      `Failed to reply to thread ${threadId} at ${postUrl}: ${(error as Error).message}\n\n${pageReplyResText}`,
    );
  }
}

export async function updateForumPosts(dataStore: TsbDataStore) {
  let updateCount = 0;
  let retries = 4;
  let lastPostTs = 0;

  for (const post of FORUM_POSTS) {
    const contentFilePath = getOutputPath(post.contentPath);

    if (fs.existsSync(contentFilePath)) {
      const content = fs.readFileSync(contentFilePath, 'utf-8');
      const contentHash = crypto
        .createHash('sha1')
        .update(content)
        .digest('hex');

      const existingHash = dataStore.forumPostHashes[post.contentPath];
      if (existingHash && existingHash === contentHash && !post.forceUpdate) {
        continue;
      }

      while (retries > 0) {
        try {
          let updated = false;
          if (post.reply) {
            const timeSincePost = new Date().getTime() - lastPostTs;
            if (timeSincePost < 21000 && !process.env.UPDATE_HASHES) {
              //forum restricts 1 post per 20 seconds.
              await new Promise((res) =>
                global.setTimeout(res, 21000 - timeSincePost),
              );
            }

            updated = await replyToThreadBimmerpost({
              content,
              post,
            });
            lastPostTs = new Date().getTime();
          } else {
            updated = await updatePostBimmerpost({
              content,
              post,
            });
          }
          if (updated) {
            log.info(
              `${post.reply ? 'Replied to' : 'Updated'} forum post ${post.postUrl} with ${post.contentPath}`,
            );
            updateCount++;
            // eslint-disable-next-line require-atomic-updates
            dataStore.forumPostHashes[post.contentPath] = contentHash;
          } else if (process.env.UPDATE_HASHES) {
            log.info(
              `Updated hash for ${post.reply ? 'reply to' : 'update of'} forum post ${post.postUrl} with ${post.contentPath}`,
            );
            // eslint-disable-next-line require-atomic-updates
            dataStore.forumPostHashes[post.contentPath] = contentHash;
          }
          break;
        } catch (error) {
          let canRetry = false;
          const errorWithCause = error as Error & {
            cause?: { message: string; code?: string };
          };
          switch (errorWithCause.cause?.code) {
            case 'UND_ERR_CLOSED':
            case 'UND_ERR_CONNECT_TIMEOUT':
            case 'UND_ERR_SOCKET':
              canRetry = true;
              break;
          }
          if (canRetry && --retries > 0) {
            log.error(
              `Retrying failed forum post update (${retries} retries remain)`,
              errorWithCause.cause ?? error,
            );
            //delay 15s on retries
            await new Promise((res) => global.setTimeout(res, 15000));
            continue;
          }

          if (updateCount > 0) {
            //Save the database if we made any successful posts before throwing
            await saveDatabase(dataStore);
          }
          throw errorWithCause.cause ?? error;
        }
      }
    }
  }
  return updateCount;
}
