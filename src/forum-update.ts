import fs from 'fs';
import { decode } from 'html-entities';
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
  forumDomain: string;
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
const VBULLETIN_VERSION = '3.8.11';
const FORUM_POSTS: ForumPost[] = [
  // {
  //   //TEST thread: https://g80.bimmerpost.com/forums/showthread.php?t=2233316
  //   postId: '32677698',
  //   forumDomain: 'g80.bimmerpost.com',
  //   contentPath: 'BMW-G80/RECENT.html',
  //   //forceUpdate: true,
  // },
  // {
  //   //TEST thread: https://g80.bimmerpost.com/forums/showthread.php?t=2233316
  //   postId: '32677697',
  //   forumDomain: 'g80.bimmerpost.com',
  //   contentPath: 'BMW-G80/NEW.html',
  //   reply: true,
  //   //forceUpdate: true,
  // },
  {
    postId: '32308235',
    forumDomain: 'g45.bimmerpost.com',
    contentPath: 'BMW/NEW.html',
    reply: true,
  },
  {
    postId: '32308237',
    forumDomain: 'g45.bimmerpost.com',
    contentPath: 'BMW/ALL.html',
  },
  {
    postId: '32306435',
    forumDomain: 'g45.bimmerpost.com',
    contentPath: 'BMW-G05/NEW.html',
    reply: true,
  },
  {
    postId: '32306436',
    forumDomain: 'g45.bimmerpost.com',
    contentPath: 'BMW-G05/RECENT.html',
  },
  {
    postId: '32306413',
    forumDomain: 'g45.bimmerpost.com',
    contentPath: 'BMW-G07/NEW.html',
    reply: true,
  },
  {
    postId: '32306416',
    forumDomain: 'g45.bimmerpost.com',
    contentPath: 'BMW-G07/RECENT.html',
  },
  {
    postId: '32307083',
    forumDomain: 'g45.bimmerpost.com',
    contentPath: 'BMW-G20/NEW.html',
    reply: true,
  },
  {
    postId: '32307084',
    forumDomain: 'g45.bimmerpost.com',
    contentPath: 'BMW-G20/RECENT.html',
  },
  {
    postId: '32306388',
    forumDomain: 'g45.bimmerpost.com',
    contentPath: 'BMW-G26/NEW.html',
    reply: true,
  },
  {
    postId: '32306389',
    forumDomain: 'g45.bimmerpost.com',
    contentPath: 'BMW-G26/RECENT.html',
  },
  {
    postId: '32307803',
    forumDomain: 'g45.bimmerpost.com',
    contentPath: 'BMW-G42/NEW.html',
    reply: true,
  },
  {
    postId: '32307804',
    forumDomain: 'g45.bimmerpost.com',
    contentPath: 'BMW-G42/RECENT.html',
  },
  {
    postId: '32306476',
    forumDomain: 'g45.bimmerpost.com',
    contentPath: 'BMW-G45/NEW.html',
    reply: true,
  },
  {
    postId: '32306477',
    forumDomain: 'g45.bimmerpost.com',
    contentPath: 'BMW-G45/RECENT.html',
  },
  {
    postId: '32306452',
    forumDomain: 'g45.bimmerpost.com',
    contentPath: 'BMW-G60/NEW.html',
    reply: true,
  },
  {
    postId: '32306455',
    forumDomain: 'g45.bimmerpost.com',
    contentPath: 'BMW-G60/RECENT.html',
  },
  {
    postId: '32307091',
    forumDomain: 'g45.bimmerpost.com',
    contentPath: 'BMW-G70/NEW.html',
    reply: true,
  },
  {
    postId: '32307092',
    forumDomain: 'g45.bimmerpost.com',
    contentPath: 'BMW-G70/RECENT.html',
  },
  {
    postId: '32307780',
    forumDomain: 'g45.bimmerpost.com',
    contentPath: 'BMW-G80/NEW.html',
    reply: true,
  },
  {
    postId: '32307783',
    forumDomain: 'g45.bimmerpost.com',
    contentPath: 'BMW-G80/RECENT.html',
  },
  {
    postId: '32307797',
    forumDomain: 'g45.bimmerpost.com',
    contentPath: 'BMW-G87/NEW.html',
    reply: true,
  },
  {
    postId: '32307799',
    forumDomain: 'g45.bimmerpost.com',
    contentPath: 'BMW-G87/RECENT.html',
  },
  {
    postId: '32307775',
    forumDomain: 'g45.bimmerpost.com',
    contentPath: 'BMW-G90/NEW.html',
    reply: true,
  },
  {
    postId: '32307778',
    forumDomain: 'g45.bimmerpost.com',
    contentPath: 'BMW-G90/RECENT.html',
  },
  {
    postId: '32306961',
    forumDomain: 'g45.bimmerpost.com',
    contentPath: 'BMW-U11/NEW.html',
    reply: true,
  },
  {
    postId: '32306962',
    forumDomain: 'g45.bimmerpost.com',
    contentPath: 'BMW-U11/RECENT.html',
  },
  {
    postId: '32284224',
    forumDomain: 'g45.bimmerpost.com',
    contentPath: 'BMW-I20/NEW.html',
    reply: true,
  },
  {
    postId: '32284226',
    forumDomain: 'g45.bimmerpost.com',
    contentPath: 'BMW-I20/RECENT.html',
  },
  {
    postId: '32284235',
    forumDomain: 'g45.bimmerpost.com',
    contentPath: 'BMW-I20/2026.html',
  },
  {
    postId: '32284236',
    forumDomain: 'g45.bimmerpost.com',
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

export const encodeContentForVbulletin = (s: string, charset: string) => {
  switch (charset) {
    // effectively converting to Windows-1252, because vBulletin.
    case 'iso-8859-1':
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

    case 'utf-8':
    case 'default':
      const encoded = encodeURIComponent(s);
      return encoded.replace(/%20/g, '+');
  }
};

function getVbulletinCookies() {
  const bbpassword = process.env.BBPASSWORD;
  const bbuserid = process.env.BBUSERID;

  if (!bbuserid || !bbpassword) {
    return undefined;
  }
  return `bbuserid=${bbuserid}; bbpassword=${bbpassword}`;
}

async function updatePostVbulletin({
  content,
  post,
}: {
  content: string;
  post: ForumPost;
}) {
  const showUrl = `https://${post.forumDomain}/forums/showpost.php?p=${post.postId}`;
  const editUrl = `https://${post.forumDomain}/forums/editpost.php?do=editpost&p=${post.postId}`;
  const updateUrl = `https://${post.forumDomain}/forums/editpost.php?do=updatepost&p=${post.postId}`;

  const authCookie = getVbulletinCookies();
  if (!authCookie) {
    log.info(
      `No credentials, skipping update of post ${post.postId} on ${post.forumDomain}`,
    );
    return false;
  }

  const editPageRes = await fetch(editUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      Cookie: authCookie,
      Referer: showUrl,
    },
  });
  if (!editPageRes.ok) {
    throw new Error(
      `Failed to load edit page for post ${post.postId} on ${post.forumDomain}: ${editPageRes.status} ${editPageRes.statusText}`,
    );
  }

  let pageCharset = '';
  const charsetMatch = /charset=([^;\s]+)/.exec(
    editPageRes.headers.get('Content-Type') ?? '',
  );
  if (charsetMatch) {
    pageCharset = charsetMatch[1].toLowerCase();
  }

  let editPageText = '';
  switch (pageCharset) {
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
      `Failed to read CSRF token from page var for ${post.postId} on ${post.forumDomain}`,
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

  const encodedContent = encodeContentForVbulletin(content, pageCharset);

  const postBody = `reason=&title=&message=${encodedContent}&wysiwyg=0&iconid=0&s=&securitytoken=${csrfToken}&do=updatepost&p=${post.postId}&sbutton=Save+Changes&parseurl=1&emailupdate=1`;

  const updatePageRes = await fetch(updateUrl, {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: authCookie,
      Referer: editUrl,
    },
    body: postBody,
  });
  if (!updatePageRes.ok) {
    throw new Error(
      `Failed to post to ${post.postId} on ${post.forumDomain}: ${editPageRes.status} ${editPageRes.statusText}`,
    );
  }
  return true;
}

async function replyToThreadVbulletin({
  content,
  post,
}: {
  content: string;
  post: ForumPost;
}) {
  const showUrl = `https://${post.forumDomain}/forums/showpost.php?p=${post.postId}`;
  const startReplyUrl = `https://${post.forumDomain}/forums/newreply.php?do=newreply&p=${post.postId}&noquote=1`;

  const authCookie = getVbulletinCookies();
  if (!authCookie) {
    log.info(
      `No credentials, skipping reply to post ${post.postId} on ${post.forumDomain}`,
    );
    return false;
  }

  const startReplyRes = await fetch(startReplyUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      Cookie: authCookie,
      Referer: showUrl,
    },
  });
  if (!startReplyRes.ok) {
    throw new Error(
      `Failed to load new reply for post ${post.postId} on ${post.forumDomain}: ${startReplyRes.status} ${startReplyRes.statusText}`,
    );
  }
  const newReplyPageText = await startReplyRes.text();

  let pageCharset = '';
  const charsetMatch = /charset=([^;\s]+)/.exec(
    startReplyRes.headers.get('Content-Type') ?? '',
  );
  if (charsetMatch) {
    pageCharset = charsetMatch[1].toLowerCase();
  }

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
      `Failed to read CSRF token from page var for ${post.postId} on ${post.forumDomain}`,
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

  const encodedContent = encodeContentForVbulletin(content, pageCharset);

  const postBody = `title=&message=${encodedContent}&wysiwyg=0&iconid=0&s=&securitytoken=${csrfToken}&do=postreply&t=${threadId}&p=${post.postId}&loggedinuser=${process.env.BBUSERID}&multiquoteempty=&sbutton=Submit+Reply&parseurl=1&emailupdate=1&rating=0`;

  const postReplyPageRes = await fetch(postReplyUrl, {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: authCookie,
      Referer: startReplyUrl,
    },
    body: postBody,
  });

  if (!(postReplyPageRes.ok || postReplyPageRes.status === 302)) {
    throw new Error(
      `Failed to reply to thread ${threadId} on ${post.forumDomain}: ${postReplyPageRes.status} ${postReplyPageRes.statusText}`,
    );
  }
  return true;
}

function getBimmerpostUrl(domain: string, path: string) {
  let forumPath = 'forums';

  switch (domain) {
    case 'g80.bimmerpost.com':
      forumPath = 'beta';
      break;
  }

  return `https://${domain}/${forumPath}/${path}`;
}

let bimmerpostAuthCookie: string | undefined = undefined;
async function getBimmerpostAuthCookie(domain: string) {
  const username = process.env.FORUM_USERNAME;
  const password = process.env.FORUM_PASSWORD;

  if (!username || !password) {
    return undefined;
  }

  if (bimmerpostAuthCookie) {
    return bimmerpostAuthCookie;
  }

  const loginUrl = getBimmerpostUrl(domain, 'login.php');
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
  const loginPostResText = await loginPageRes.text();
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

export async function updatePostBimmerpost({
  content,
  post,
}: {
  content: string;
  post: ForumPost;
}) {
  const authCookie = await getBimmerpostAuthCookie(post.forumDomain);
  if (!authCookie) {
    log.info(
      `No credentials, skipping update of post ${post.postId} on ${post.forumDomain}`,
    );
    return false;
  }

  const showUrl = getBimmerpostUrl(
    post.forumDomain,
    `showthread.php?p=${post.postId}`,
  );
  const postUrl = getBimmerpostUrl(post.forumDomain, 'threadpost.php');

  const showPageRes = await fetch(showUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      Cookie: authCookie,
    },
  });
  if (!showPageRes.ok) {
    throw new Error(
      `Failed to load edit page for post ${post.postId} on ${post.forumDomain}: ${showPageRes.status} ${showPageRes.statusText}`,
    );
  }

  const showPageText = await showPageRes.text();
  const csrfTokenMatch = /<meta\sname="csrf-token"\scontent="([^"]+)">/.exec(
    showPageText,
  );
  if (!csrfTokenMatch) {
    throw new Error(
      `Failed to read CSRF token from page meta tag for post ${post.postId} on ${post.forumDomain}`,
    );
  }
  const csrfToken = csrfTokenMatch[1];

  const existingPostMatch = new RegExp(
    `div\\s+class="post_content"[^>]+postid="${post.postId}"[^>]+>(.+?)<\\/div>`,
    'gms',
  ).exec(showPageText);
  if (existingPostMatch) {
    const existingPostText = existingPostMatch[1];
    const existingPostFilePath = getOutputPath(
      post.contentPath.replace('.html', '.prior.html'),
    );
    await fs.promises.writeFile(
      existingPostFilePath,
      `<p>${existingPostText}</p>`,
    );
  }

  const encodedContent = generateJSON(content, TIP_TAP_EXTENSIONS);

  const postBody = new FormData();
  postBody.append('do', 'editapost');
  postBody.append('tid', null);
  postBody.append('postid', post.postId);
  postBody.append('thetitle', '');
  postBody.append('message_json', JSON.stringify(encodedContent));
  postBody.append('type', 0);

  const updatePageRes = await fetch(postUrl, {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      'X-CSRF-Token': csrfToken,
      Cookie: authCookie,
      Referer: showUrl,
    },
    body: postBody,
  });
  if (!updatePageRes.ok) {
    throw new Error(
      `Failed to post to ${post.postId} on ${post.forumDomain}: ${showPageRes.status} ${showPageRes.statusText}`,
    );
  }
  const updatePageResText = await updatePageRes.text();
  try {
    const postJson = JSON.parse(updatePageResText) as BimmerpostResponse;
    if (postJson.appData && postJson.appData[0]?.success === 0) {
      throw new Error(
        `Failed to post to ${post.postId} on ${post.forumDomain}: ${postJson.appData[0].message}`,
      );
    }
    return true;
  } catch (error) {
    throw new Error(
      `Failed to post to ${post.postId} on ${post.forumDomain}: ${(error as Error).message}\n\n${updatePageResText}`,
    );
  }
}

export async function replyToThreadBimmerpost({
  content,
  post,
}: {
  content: string;
  post: ForumPost;
}) {
  const authCookie = await getBimmerpostAuthCookie(post.forumDomain);
  if (!authCookie) {
    log.info(
      `No credentials, skipping reply to post ${post.postId} on ${post.forumDomain}`,
    );
    return false;
  }

  const showUrl = getBimmerpostUrl(
    post.forumDomain,
    `showthread.php?p=${post.postId}`,
  );
  const postUrl = getBimmerpostUrl(post.forumDomain, 'threadpost.php');

  const showPageRes = await fetch(showUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      Cookie: authCookie,
    },
  });
  if (!showPageRes.ok) {
    throw new Error(
      `Failed to load edit page for post ${post.postId} on ${post.forumDomain}: ${showPageRes.status} ${showPageRes.statusText}`,
    );
  }

  const showPageText = await showPageRes.text();
  const csrfTokenMatch = /<meta\sname="csrf-token"\scontent="([^"]+)">/.exec(
    showPageText,
  );
  if (!csrfTokenMatch) {
    throw new Error(
      `Failed to read CSRF token from page meta tag for ${post.postId} on ${post.forumDomain}`,
    );
  }
  const csrfToken = csrfTokenMatch[1];

  const threadMatch =
    /<div\sclass="new_reply_editor"\stype="newreply"\sthreadid="([^"]+)"/.exec(
      showPageText,
    );
  if (!threadMatch) {
    throw new Error(
      `Failed to read thread ID for ${post.postId} on ${post.forumDomain}`,
    );
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

  const pageReplyRes = await fetch(postUrl, {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      'X-CSRF-Token': csrfToken,
      Cookie: authCookie,
      Referer: showUrl,
    },
    body: postBody,
  });

  if (!(pageReplyRes.ok || pageReplyRes.status === 302)) {
    throw new Error(
      `Failed to reply to thread ${threadId} on ${post.forumDomain}: ${pageReplyRes.status} ${pageReplyRes.statusText}`,
    );
  }
  const pageReplyResText = await pageReplyRes.text();
  try {
    const postJson = JSON.parse(pageReplyResText) as BimmerpostResponse;
    if (postJson.appData && postJson.appData[0]?.success === 0) {
      throw new Error(
        `Failed to reply to ${post.postId} on ${post.forumDomain}: ${postJson.appData[0].message}`,
      );
    }
    return true;
  } catch (error) {
    throw new Error(
      `Failed to reply to ${post.postId} on ${post.forumDomain}: ${(error as Error).message}\n\n${pageReplyResText}`,
    );
  }
}

export async function updateForumPosts(dataStore: TsbDataStore) {
  let updateCount = 0;
  let retries = 4;
  let lastPostTs = 0;

  for (const post of FORUM_POSTS) {
    const contentFilePath = getOutputPath(post.contentPath);
    const contentFileType = post.contentPath.split('.')[1];

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
            if (timeSincePost < 21000) {
              //forum restricts 1 post per 20 seconds.
              await new Promise((res) =>
                global.setTimeout(res, 21000 - timeSincePost),
              );
            }

            updated =
              contentFileType === 'html'
                ? await replyToThreadBimmerpost({
                    content,
                    post,
                  })
                : await replyToThreadVbulletin({
                    content,
                    post,
                  });
            lastPostTs = new Date().getTime();
          } else {
            updated =
              contentFileType === 'html'
                ? await updatePostBimmerpost({
                    content,
                    post,
                  })
                : await updatePostVbulletin({
                    content,
                    post,
                  });
          }
          if (updated) {
            log.info(
              `${post.reply ? 'Replied to' : 'Updated'} forum post ${post.postId} on ${post.forumDomain} with ${post.contentPath}`,
            );
            updateCount++;
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
