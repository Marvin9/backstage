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

import { Entity } from '@backstage/catalog-model';
import {
  PlaceholderProcessor,
  PlaceholderResolver,
} from './PlaceholderProcessor';
import { LocationProcessorRead } from './types';

describe('PlaceholderProcessor', () => {
  it('returns placeholder-free data unchanged', async () => {
    const input: Entity = {
      apiVersion: 'a',
      kind: 'k',
      metadata: { name: 'n' },
    };
    const processor = new PlaceholderProcessor({
      foo: async () => 'replaced',
    });
    await expect(
      processor.processEntity(
        input,
        { type: 't', target: 'l' },
        jest.fn(),
        jest.fn(),
      ),
    ).resolves.toBe(input);
  });

  it('replaces placeholders deep in the data', async () => {
    const emit = jest.fn();
    const read = jest.fn();
    const upperResolver: PlaceholderResolver = jest.fn(async ({ value }) =>
      value!.toString().toUpperCase(),
    );
    const processor = new PlaceholderProcessor({
      upper: upperResolver,
    });

    await expect(
      processor.processEntity(
        {
          apiVersion: 'a',
          kind: 'k',
          metadata: { name: 'n' },
          spec: { a: [{ b: { $upper: 'text' } }] },
        },
        { type: 'fake', target: 'http://example.com' },
        emit,
        read,
      ),
    ).resolves.toEqual({
      apiVersion: 'a',
      kind: 'k',
      metadata: { name: 'n' },
      spec: { a: [{ b: 'TEXT' }] },
    });

    expect(emit).not.toBeCalled();
    expect(read).not.toBeCalled();
    expect(upperResolver).toBeCalledWith({
      key: 'upper',
      value: 'text',
      location: { type: 'fake', target: 'http://example.com' },
      read,
    });
  });

  it('has builtin text support', async () => {
    const emit = jest.fn();
    const read: LocationProcessorRead = jest
      .fn()
      .mockImplementation(async location => ({
        type: 'data',
        location,
        data: Buffer.from('TEXT', 'utf-8'),
      }));
    const processor = PlaceholderProcessor.default();

    await expect(
      processor.processEntity(
        {
          apiVersion: 'a',
          kind: 'k',
          metadata: { name: 'n' },
          spec: { data: { $text: '../file.txt' } },
        },
        {
          type: 'github',
          target: 'https://github.com/spotify/backstage/a/b/catalog-info.yaml',
        },
        emit,
        read,
      ),
    ).resolves.toEqual({
      apiVersion: 'a',
      kind: 'k',
      metadata: { name: 'n' },
      spec: { data: 'TEXT' },
    });

    expect(emit).not.toBeCalled();
    expect(read).toBeCalledWith({
      type: 'github',
      target: 'https://github.com/spotify/backstage/a/file.txt',
    });
  });

  it('has builtin json support', async () => {
    const emit = jest.fn();
    const read: LocationProcessorRead = jest
      .fn()
      .mockImplementation(async location => ({
        type: 'data',
        location,
        data: Buffer.from(JSON.stringify({ a: ['b', 7] }), 'utf-8'),
      }));
    const processor = PlaceholderProcessor.default();

    await expect(
      processor.processEntity(
        {
          apiVersion: 'a',
          kind: 'k',
          metadata: { name: 'n' },
          spec: { data: { $data: './file.json' } },
        },
        {
          type: 'github',
          target: 'https://github.com/spotify/backstage/a/b/catalog-info.yaml',
        },
        emit,
        read,
      ),
    ).resolves.toEqual({
      apiVersion: 'a',
      kind: 'k',
      metadata: { name: 'n' },
      spec: { data: { a: ['b', 7] } },
    });

    expect(emit).not.toBeCalled();
    expect(read).toBeCalledWith({
      type: 'github',
      target: 'https://github.com/spotify/backstage/a/b/file.json',
    });
  });

  it('has builtin yaml support', async () => {
    const emit = jest.fn();
    const read: LocationProcessorRead = jest
      .fn()
      .mockImplementation(async location => ({
        type: 'data',
        location,
        data: Buffer.from('foo:\n  - bar: 7', 'utf-8'),
      }));
    const processor = PlaceholderProcessor.default();

    await expect(
      processor.processEntity(
        {
          apiVersion: 'a',
          kind: 'k',
          metadata: { name: 'n' },
          spec: { data: { $data: '../file.yaml' } },
        },
        {
          type: 'github',
          target: 'https://github.com/spotify/backstage/a/b/catalog-info.yaml',
        },
        emit,
        read,
      ),
    ).resolves.toEqual({
      apiVersion: 'a',
      kind: 'k',
      metadata: { name: 'n' },
      spec: { data: { foo: [{ bar: 7 }] } },
    });

    expect(emit).not.toBeCalled();
    expect(read).toBeCalledWith({
      type: 'github',
      target: 'https://github.com/spotify/backstage/a/file.yaml',
    });
  });
});
