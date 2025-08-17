import fs from 'fs';
import path from 'path';
import log from './log.js';
import type { TsbDataStore } from './database.js';
import * as crypto from 'crypto';

interface ForumPost {
  postId: string;
  forumDomain: string;
  contentPath: string;
}
const FORUM_POSTS: ForumPost[] = [
  //   {
  //     postId: '32284231',
  //     forumDomain: 'bmwi.bimmerpost.com',
  //     contentPath: 'BMW-IX/2025.txt',
  //   },
  {
    postId: '32284233',
    forumDomain: 'bmwi.bimmerpost.com',
    contentPath: 'BMW-IX/2026.txt',
  },
];

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
  for (const post of FORUM_POSTS) {
    const contentFilePath = path.join(outputPath, post.contentPath);

    //TEST CODE FOR GHA ENV
    if (!fs.existsSync(contentFilePath) && post.postId === '32284233') {
      fs.writeFileSync(contentFilePath, '[B]2026[/B]');
    }

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
      const csrfTokenMatch = /var\sSECURITYTOKEN\s=\s"([^"]+)";/.exec(
        editPageText,
      );
      if (!csrfTokenMatch) {
        throw new Error(
          `Failed to read CSRF token for ${post.postId} on ${post.forumDomain}`,
        );
      }
      const csrfToken = csrfTokenMatch[1];
      const postContent = `reason=&title=&message=${encodeURIComponent(content)}&wysiwyg=0&iconid=0&s=&securitytoken=${csrfToken}&do=updatepost&p=${post.postId}&sbutton=Save+Changes&parseurl=1&emailupdate=1`;

      const updatePageRes = await fetch(updateUrl, {
        method: 'POST',
        headers: {
          'User-Agent': 'itsanalogue-bmw-tsb-updates',
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: `bbuserid=${bbuserid}; bbpassword=${bbpassword}`,
          Referer: editUrl,
        },
        body: postContent,
      });
      if (!updatePageRes.ok) {
        throw new Error(
          `Failed to post to ${post.postId} on ${post.forumDomain}: ${editPageRes.status} ${editPageRes.statusText}`,
        );
      }

      updateCount++;
      // eslint-disable-next-line require-atomic-updates
      dataStore.forumPostHashes[post.contentPath] = contentHash;
      log.info(
        `Updated forum post ${post.postId} on ${post.forumDomain} with ${post.contentPath}`,
      );
    }
  }
  return updateCount;
}
