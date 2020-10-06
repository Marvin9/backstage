/*
 * Copyright 2020 Spotify AB
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Credits: https://github.com/elastic/eui/blob/master/src/services/security/get_secure_rel_for_target.ts
// Generate rel tag based on href & target

const currentDomain = window.location.host;
const isCurrentDomain = new RegExp(
  // to match domain or client side routing links used in <Link href="/"
  `((https?:\/\/${currentDomain})(\/?.+)?)|(\/.*)`,
  'g',
);

// In order for the domain to be secure the regex
// has to match _and_ the lengths of the match must
// be _exact_ since URL's can have other URL's as
// path or query params!
export const isDomainSecure = (url: string = '') => {
  const matches = url.match(isCurrentDomain);
  if (!matches) {
    return false;
  }
  const [match] = matches;

  return url.indexOf(match) === 0;
};

type anchorTypes = {
  href?: string;
  target?: '_blank' | '_self' | '_parent' | '_top' | string;
};

export const getSecureRel = ({ href, target = '' }: anchorTypes) => {
  const isInternalHref = !!href && isDomainSecure(href);
  const relParts = [];

  if (!isInternalHref) {
    relParts.push('noreferrer');
  }

  if (target.includes('_blank')) {
    relParts.push('noopener');
  }

  return relParts.join(' ');
};

interface coreHyperlinkTypes extends anchorTypes {
  href: string;
  rel?: string;
}

/**
 * use this function in Link or a tag,
 * given href & target it will generate appropriate rel tag,
 * Usage: <Link {...coreHyperlinkAttr({ href: '' })}>
 */
export const coreHyperlinkAttr = ({
  href,
  target,
}: coreHyperlinkTypes): coreHyperlinkTypes => {
  const secureRel = getSecureRel({ href, target });

  const attrs: coreHyperlinkTypes = { href };

  if (!!target) {
    attrs.target = target;
  }

  if (!!secureRel) {
    attrs.rel = secureRel;
  }

  return attrs;
};
