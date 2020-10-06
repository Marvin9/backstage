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
import {
  isDomainSecure,
  getSecureRel,
  coreHyperlinkAttr,
} from './genSecureRel';

const noopener = 'noopener';
const noreferrer = 'noreferrer';

describe('isDomainSecure', () => {
  it('should return true for backstage.io url or Link internal links like /foo', () => {
    const base = 'https://backstage.io';
    expect(isDomainSecure(base)).toBeTruthy();

    const baseWithPath = 'https://backstage.io/docs/overview/what-is-backstage';
    expect(isDomainSecure(baseWithPath)).toBeTruthy();

    const baseWithQuery =
      'https://backstage.io/docs/overview/what-is-backstage?foo=bar';
    expect(isDomainSecure(baseWithQuery)).toBeTruthy();

    expect(isDomainSecure('/')).toBeTruthy();
    expect(isDomainSecure('/foo/bar')).toBeTruthy();
  });

  it('should return false for external url', () => {
    let externalURL = 'https://back.io/';
    expect(isDomainSecure(externalURL)).toBeFalsy();

    externalURL += '?url=https://backstage.io';
    expect(isDomainSecure(externalURL)).toBeFalsy();
  });
});

describe('getSecureRel', () => {
  it('should include noopener for target=_blank', () => {
    expect(getSecureRel({ href: '', target: '_blank' })).toContain(noopener);
  });

  it('should include noreferrer for external urls', () => {
    let externalURL = 'https://back.io/';
    expect(getSecureRel({ href: externalURL })).toContain(noreferrer);

    externalURL = 'https://www.google.com/';
    expect(getSecureRel({ href: externalURL })).toContain(noreferrer);
  });

  it('should include noopener & noreferrer for exernal url with target=_blank', () => {
    const externalURL = 'https://back.io';
    const rel = getSecureRel({ href: externalURL, target: '_blank' });

    expect(rel).toContain(noopener);
    expect(rel).toContain(noreferrer);
  });
});

describe('coreHyperlinkAttr', () => {
  it('should generate valid anchor tags', () => {
    let internalURL = 'https://backstage.io/';
    expect(coreHyperlinkAttr({ href: internalURL })).toStrictEqual({
      href: internalURL,
    });

    expect(
      coreHyperlinkAttr({ href: internalURL, target: '_blank' }),
    ).toStrictEqual({
      href: internalURL,
      target: '_blank',
      rel: noopener,
    });

    internalURL = '/';
    expect(
      coreHyperlinkAttr({ href: internalURL, target: '_blank' }),
    ).toStrictEqual({
      href: internalURL,
      target: '_blank',
      rel: noopener,
    });

    const externalURL = 'https://www.google.com/';
    expect(coreHyperlinkAttr({ href: externalURL })).toStrictEqual({
      href: externalURL,
      rel: noreferrer,
    });

    expect(
      coreHyperlinkAttr({ href: externalURL, target: '_blank' }),
    ).toStrictEqual({
      href: externalURL,
      target: '_blank',
      rel: `${noreferrer} ${noopener}`,
    });
  });
});
