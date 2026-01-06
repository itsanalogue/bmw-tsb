import fs from 'fs';
import { decode } from 'html-entities';
import log from './log.js';
import { saveDatabase, type TsbDataStore } from './database.js';
import * as crypto from 'crypto';
import { getOutputPath } from './output.js';

export const FORUM_POST_MAX_LENGTH = 100000; //buffer for actual limit of 105000

interface ForumPost {
  postId: string;
  forumDomain: string;
  contentPath: string;
  reply?: boolean;
}
const VBULLETIN_VERSION = '3.8.11';
const FORUM_POSTS: ForumPost[] = [
  {
    postId: '32308235',
    forumDomain: 'g80.bimmerpost.com',
    contentPath: 'BMW/NEW.txt',
    reply: true,
  },
  {
    postId: '32308237',
    forumDomain: 'g80.bimmerpost.com',
    contentPath: 'BMW/ALL.txt',
  },
  {
    postId: '32306435',
    forumDomain: 'g05.bimmerpost.com',
    contentPath: 'BMW-G05/NEW.txt',
    reply: true,
  },
  {
    postId: '32306436',
    forumDomain: 'g05.bimmerpost.com',
    contentPath: 'BMW-G05/RECENT.txt',
  },
  {
    postId: '32306413',
    forumDomain: 'g07.bimmerpost.com',
    contentPath: 'BMW-G07/NEW.txt',
    reply: true,
  },
  {
    postId: '32306416',
    forumDomain: 'g07.bimmerpost.com',
    contentPath: 'BMW-G07/RECENT.txt',
  },
  {
    postId: '32307084',
    forumDomain: 'g20.bimmerpost.com',
    contentPath: 'BMW-G20/RECENT.txt',
  },
  {
    postId: '32306389',
    forumDomain: 'bmwi.bimmerpost.com',
    contentPath: 'BMW-G26/RECENT.txt',
  },
  {
    postId: '32307804',
    forumDomain: 'g87.bimmerpost.com',
    contentPath: 'BMW-G42/RECENT.txt',
  },
  {
    postId: '32306477',
    forumDomain: 'g45.bimmerpost.com',
    contentPath: 'BMW-G45/RECENT.txt',
  },
  {
    postId: '32306452',
    forumDomain: 'g60.bimmerpost.com',
    contentPath: 'BMW-G60/NEW.txt',
    reply: true,
  },
  {
    postId: '32306455',
    forumDomain: 'g60.bimmerpost.com',
    contentPath: 'BMW-G60/RECENT.txt',
  },
  {
    postId: '32307092',
    forumDomain: 'www.7post.com',
    contentPath: 'BMW-G70/RECENT.txt',
  },
  {
    postId: '32307780',
    forumDomain: 'g80.bimmerpost.com',
    contentPath: 'BMW-G80/NEW.txt',
    reply: true,
  },
  {
    postId: '32307783',
    forumDomain: 'g80.bimmerpost.com',
    contentPath: 'BMW-G80/RECENT.txt',
  },
  {
    postId: '32307797',
    forumDomain: 'g87.bimmerpost.com',
    contentPath: 'BMW-G87/NEW.txt',
    reply: true,
  },
  {
    postId: '32307799',
    forumDomain: 'g87.bimmerpost.com',
    contentPath: 'BMW-G87/RECENT.txt',
  },
  {
    postId: '32307775',
    forumDomain: 'g90.bimmerpost.com',
    contentPath: 'BMW-G90/NEW.txt',
    reply: true,
  },
  {
    postId: '32307778',
    forumDomain: 'g90.bimmerpost.com',
    contentPath: 'BMW-G90/RECENT.txt',
  },
  {
    postId: '32306961',
    forumDomain: 'u11.bimmerpost.com',
    contentPath: 'BMW-U11/NEW.txt',
    reply: true,
  },
  {
    postId: '32306962',
    forumDomain: 'u11.bimmerpost.com',
    contentPath: 'BMW-U11/RECENT.txt',
  },
  {
    postId: '32284224',
    forumDomain: 'bmwi.bimmerpost.com',
    contentPath: 'BMW-I20/NEW.txt',
    reply: true,
  },
  {
    postId: '32284226',
    forumDomain: 'bmwi.bimmerpost.com',
    contentPath: 'BMW-I20/RECENT.txt',
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

// effectively converting to Windows-1252
export const encodeContentForVbulletin = (s: string) => {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s.charAt(i);
    const code = s.charCodeAt(i);

    if (code >= 0xa0 && code <= 0xff) {
      out += `%${code.toString(16).toUpperCase()}`;
      continue;
    }

    switch (code) {
      case 0x20ac:
        out += '%80';
        break;
      case 0x201a:
        out += '%82';
        break;
      case 0x192:
        out += '%83';
        break;
      case 0x201e:
        out += '%84';
        break;
      case 0x2026:
        out += '%85';
        break;
      case 0x2020:
        out += '%86';
        break;
      case 0x2021:
        out += '%87';
        break;
      case 0x2c6:
        out += '%88';
        break;
      case 0x2030:
        out += '%89';
        break;
      case 0x160:
        out += '%8A';
        break;
      case 0x2039:
        out += '%8B';
        break;
      case 0x152:
        out += '%8C';
        break;
      case 0x17d:
        out += '%8E';
        break;
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
      case 0x2dc:
        out += '%98';
        break;
      case 0x2122:
        out += '%99';
        break;
      case 0x161:
        out += '%9A';
        break;
      case 0x203a:
        out += '%9B';
        break;
      case 0x153:
        out += '%9C';
        break;
      case 0x17e:
        out += '%9E';
        break;
      case 0x178:
        out += '%9F';
        break;
      case 0x28:
      case 0x29:
        out += `%${code.toString(16)}`;
        break;
      case 0x0a:
        out += '%0D';
        out += encodeURIComponent(ch);
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

  let responseCharset = '';
  const charsetMatch = /charset=([^;\s]+)/.exec(
    editPageRes.headers.get('Content-Type') ?? '',
  );
  if (charsetMatch) {
    responseCharset = charsetMatch[1].toLowerCase();
  }

  let editPageText = '';
  switch (responseCharset) {
    case 'iso-8859-1':
      //vBulletin is incorrectly presenting Windows-1252 as ISO-8859-1
      //AND TextDecoder incorrectly decodes Windows-1252 as ISO-8859-1
      //Decode as Windows-1252 and set stream:true to avoid the TextDecoder bug.
      //https://github.com/nodejs/node/issues/56542
      const textDecoder = new TextDecoder('windows-1252');
      const textBuffer = await editPageRes.arrayBuffer();
      editPageText = textDecoder.decode(textBuffer, { stream: true });
      break;
    case 'utf-8':
    default:
      editPageText = await editPageRes.text();
      break;
  }

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

  const existingPostMatch =
    /<textarea name="message" id="vB_Editor_001_textarea".+>([^<]+)<\/textarea>/.exec(
      editPageText,
    );
  if (existingPostMatch) {
    const existingPostText = existingPostMatch[1];
    const existingPostFilePath = getOutputPath(
      post.contentPath.replace('.txt', '.prior.txt'),
    );
    await fs.promises.writeFile(existingPostFilePath, decode(existingPostText));
  }

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

async function replyToThread({
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
  const startReplyUrl = `https://${post.forumDomain}/forums/newreply.php?do=newreply&p=${post.postId}&noquote=1`;

  const startReplyRes = await fetch(startReplyUrl, {
    headers: {
      'User-Agent': 'itsanalogue-bmw-tsb-updates',
      Cookie: `bbuserid=${bbuserid}; bbpassword=${bbpassword}`,
      Referer: showUrl,
    },
  });
  if (!startReplyRes.ok) {
    throw new Error(
      `Failed to load new reply for post ${post.postId} on ${post.forumDomain}: ${startReplyRes.status} ${startReplyRes.statusText}`,
    );
  }
  const newReplyPageText = await startReplyRes.text();

  const vbVersion = /vBulletin ([\d\.]+)/.exec(newReplyPageText);
  if (!vbVersion || vbVersion[1] !== VBULLETIN_VERSION) {
    throw new Error(
      `Unexpected vBulletin version (${vbVersion?.[1]}).  Will not attempt forum reply.`,
    );
  }

  const csrfTokenMatch = /var\sSECURITYTOKEN\s=\s"([^"]+)";/.exec(
    newReplyPageText,
  );
  if (!csrfTokenMatch) {
    throw new Error(
      `Failed to read CSRF token for ${post.postId} on ${post.forumDomain}`,
    );
  }
  const csrfToken = csrfTokenMatch[1];

  const threadMatch = /name="t"\svalue="([^"]+)"/.exec(newReplyPageText);
  if (!threadMatch) {
    throw new Error(
      `Failed to read thread ID for ${post.postId} on ${post.forumDomain}`,
    );
  }
  const threadId = threadMatch[1];
  const postReplyUrl = `https://${post.forumDomain}/forums/newreply.php?do=postreply&t=${threadId}`;

  const encodedContent = encodeContentForVbulletin(content);
  const encodedTitle = encodeContentForVbulletin(
    `New ${new Date().toISOString().split('T')[0]}`,
  );

  const postBody = `title=${encodedTitle}&message=${encodedContent}&wysiwyg=0&iconid=0&s=&securitytoken=${csrfToken}&do=postreply&t=${threadId}&p=${post.postId}&loggedinuser=${bbuserid}&multiquoteempty=&sbutton=Submit+Reply&parseurl=1&emailupdate=1&rating=0`;

  const postReplyPageRes = await fetch(postReplyUrl, {
    method: 'POST',
    headers: {
      'User-Agent': 'itsanalogue-bmw-tsb-updates',
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: `bbuserid=${bbuserid}; bbpassword=${bbpassword}`,
      Referer: startReplyUrl,
    },
    body: postBody,
  });

  if (!(postReplyPageRes.ok || postReplyPageRes.status === 302)) {
    throw new Error(
      `Failed to reply to thread ${threadId} on ${post.forumDomain}: ${startReplyRes.status} ${startReplyRes.statusText}`,
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
      if (existingHash && existingHash === contentHash) {
        continue;
      }

      while (retries > 0) {
        try {
          if (post.reply) {
            const timeSincePost = new Date().getTime() - lastPostTs;
            if (timeSincePost < 21000) {
              //forum restricts 1 post per 20 seconds.
              await new Promise((res) =>
                global.setTimeout(res, 21000 - timeSincePost),
              );
            }

            await replyToThread({ bbpassword, bbuserid, content, post });
            lastPostTs = new Date().getTime();
            log.info(
              `Replied to forum post ${post.postId} on ${post.forumDomain} with ${post.contentPath}`,
            );
          } else {
            await updatePost({ bbpassword, bbuserid, content, post });
            log.info(
              `Updated forum post ${post.postId} on ${post.forumDomain} with ${post.contentPath}`,
            );
          }
          updateCount++;
          // eslint-disable-next-line require-atomic-updates
          dataStore.forumPostHashes[post.contentPath] = contentHash;
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
