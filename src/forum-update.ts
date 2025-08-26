import fs from 'fs';
import path from 'path';
import log from './log.js';
import { saveDatabase, type TsbDataStore } from './database.js';
import * as crypto from 'crypto';

interface ForumPost {
  postId: string;
  forumDomain: string;
  contentPath: string;
}
const VBULLETIN_VERSION = '3.8.11';
const FORUM_POSTS: ForumPost[] = [
  {
    postId: '32306436',
    forumDomain: 'g05.bimmerpost.com',
    contentPath: 'BMW-G05/RECENT.txt',
  },
  {
    postId: '32306416',
    forumDomain: 'g07.bimmerpost.com',
    contentPath: 'BMW-G07/RECENT.txt',
  },
  {
    postId: '32306389',
    forumDomain: 'bmwi.bimmerpost.com',
    contentPath: 'BMW-G26/RECENT.txt',
  },
  {
    postId: '32306477',
    forumDomain: 'g45.bimmerpost.com',
    contentPath: 'BMW-G45/RECENT.txt',
  },
  {
    postId: '32306455',
    forumDomain: 'g60.bimmerpost.com',
    contentPath: 'BMW-G60/RECENT.txt',
  },
  {
    postId: '32284226',
    forumDomain: 'bmwi.bimmerpost.com',
    contentPath: 'BMW-I20/RECENT.txt',
  },
  {
    postId: '32284227',
    forumDomain: 'bmwi.bimmerpost.com',
    contentPath: 'BMW-I20/2022.txt',
  },
  {
    postId: '32284230',
    forumDomain: 'bmwi.bimmerpost.com',
    contentPath: 'BMW-I20/2023.txt',
  },
  {
    postId: '32284231',
    forumDomain: 'bmwi.bimmerpost.com',
    contentPath: 'BMW-I20/2024.txt',
  },
  {
    postId: '32284233',
    forumDomain: 'bmwi.bimmerpost.com',
    contentPath: 'BMW-I20/2025.txt',
  },
  {
    postId: '32284235',
    forumDomain: 'bmwi.bimmerpost.com',
    contentPath: 'BMW-I20/2026.txt',
  },
  {
    postId: '32284236',
    forumDomain: 'bmwi.bimmerpost.com',
    contentPath: 'BMW-I20/2027.txt',
  },
];

export const encodeContentForVbulletin = (s: string) => {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s.charAt(i);
    const code = s.charCodeAt(i);
    switch (code) {
      case 0x2018:
        out += '%91';
        break;
      case 0x2019:
        out += '%92';
        break;
      case 0x201c:
        out += '%93';
        break;
      case 0x201d:
        out += '%94';
        break;
      case 0x2022:
        out += '%95';
        break;
      case 0x2013:
        out += '%96';
        break;
      case 0x2014:
        out += '%97';
        break;
      case 0x2122:
        out += '%99';
        break;
      case 0x28:
      case 0x29:
        out += `%${code.toString(16)}`;
        break;
      case 0x0a:
        out += '%0D';
        out += encodeURIComponent(ch);
        break;
      case 0xba:
        out += '%BA';
        break;
      case 0xdc:
        out += '%DC';
        break;
      default:
        out += encodeURIComponent(ch);
        break;
    }
  }
  return out.replace(/%20/g, '+');
};

async function updatePost({
  bbuserid,
  bbpassword,
  content,
  post,
}: {
  bbuserid: string;
  bbpassword: string;
  content: string;
  post: ForumPost;
}) {
  const showUrl = `https://${post.forumDomain}/forums/showpost.php?p=${post.postId}`;
  const editUrl = `https://${post.forumDomain}/forums/editpost.php?do=editpost&p=${post.postId}`;
  const updateUrl = `https://${post.forumDomain}/forums/editpost.php?do=updatepost&p=${post.postId}`;

  const editPageRes = await fetch(editUrl, {
    headers: {
      'User-Agent': 'itsanalogue-bmw-tsb-updates',
      Cookie: `bbuserid=${bbuserid}; bbpassword=${bbpassword}`,
      Referer: showUrl,
    },
  });
  if (!editPageRes.ok) {
    throw new Error(
      `Failed to load edit page for post ${post.postId} on ${post.forumDomain}: ${editPageRes.status} ${editPageRes.statusText}`,
    );
  }
  const editPageText = await editPageRes.text();

  const vbVersion = /vBulletin ([\d\.]+)/.exec(editPageText);
  if (!vbVersion || vbVersion[1] !== VBULLETIN_VERSION) {
    throw new Error(
      `Unexpected vBulletin version (${vbVersion?.[1]}).  Will not attempt forum updates.`,
    );
  }

  const csrfTokenMatch = /var\sSECURITYTOKEN\s=\s"([^"]+)";/.exec(editPageText);
  if (!csrfTokenMatch) {
    throw new Error(
      `Failed to read CSRF token for ${post.postId} on ${post.forumDomain}`,
    );
  }
  const csrfToken = csrfTokenMatch[1];

  const encodedContent = encodeContentForVbulletin(content);

  const postBody = `reason=&title=&message=${encodedContent}&wysiwyg=0&iconid=0&s=&securitytoken=${csrfToken}&do=updatepost&p=${post.postId}&sbutton=Save+Changes&parseurl=1&emailupdate=1`;

  const updatePageRes = await fetch(updateUrl, {
    method: 'POST',
    headers: {
      'User-Agent': 'itsanalogue-bmw-tsb-updates',
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: `bbuserid=${bbuserid}; bbpassword=${bbpassword}`,
      Referer: editUrl,
    },
    body: postBody,
  });
  if (!updatePageRes.ok) {
    throw new Error(
      `Failed to post to ${post.postId} on ${post.forumDomain}: ${editPageRes.status} ${editPageRes.statusText}`,
    );
  }
}

export async function updateForumPosts(dataStore: TsbDataStore) {
  const bbpassword = process.env.BBPASSWORD;
  const bbuserid = process.env.BBUSERID;

  if (!bbuserid || !bbpassword) {
    log.info('Forum credentials are not configured.  Skipping updates.');
    return 0;
  }
  const outputPath = path.resolve(
    decodeURI(new URL(`../out/`, import.meta.url).pathname),
  );
  let updateCount = 0;
  let retries = 3;

  for (const post of FORUM_POSTS) {
    const contentFilePath = path.join(outputPath, post.contentPath);

    if (fs.existsSync(contentFilePath)) {
      const content = fs.readFileSync(contentFilePath, 'utf-8');
      const contentHash = crypto
        .createHash('sha1')
        .update(content)
        .digest('hex');

      const existingHash = dataStore.forumPostHashes[post.contentPath];
      if (existingHash && existingHash === contentHash) {
        continue;
      }

      while (retries > 0) {
        try {
          await updatePost({ bbpassword, bbuserid, content, post });
          updateCount++;
          // eslint-disable-next-line require-atomic-updates
          dataStore.forumPostHashes[post.contentPath] = contentHash;
          log.info(
            `Updated forum post ${post.postId} on ${post.forumDomain} with ${post.contentPath}`,
          );
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
          if (canRetry && retries-- > 0) {
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
          throw error;
        }
      }
    }
  }
  return updateCount;
}
