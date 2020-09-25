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

import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Alert } from '@material-ui/lab';
import { useApi, configApiRef } from '@backstage/core';
import { Config as BackstageConfig } from '@backstage/config';
import {
  Currency,
  defaultCurrencies,
  Maybe,
  Product,
  Icon,
  Metric,
} from '../types';

export const NULL_METRIC = 'dailyCost';
export const NULL_METRIC_NAME = 'Daily Cost';

/*
 * Config schema 2020-09-21
 *
 * costInsights:
 *   engineerCost: 200000
 *   products:
 *     productA:
 *       name: Product A
 *       icon: SomeIcon
 *     productB:
 *       name: Product B
 *       icon: SomeOtherIcon
 *   metrics:
 *     metricA:
 *       name: Metric A
 *     metricB:
 *       name: Metric B
 */

export type ConfigContextProps = {
  metrics: Metric[];
  products: Product[];
  icons: Icon[];
  engineerCost: number;
  currencies: Currency[];
};

export const ConfigContext = createContext<ConfigContextProps | undefined>(
  undefined,
);

const defaultState: ConfigContextProps = {
  metrics: [{ kind: null, name: NULL_METRIC_NAME }],
  products: [],
  icons: [],
  engineerCost: 0,
  currencies: defaultCurrencies,
};

export const ConfigProvider = ({ children }: { children: ReactNode }) => {
  const c: BackstageConfig = useApi(configApiRef);
  const [config, setConfig] = useState(defaultState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Maybe<Error>>(null);

  useEffect(() => {
    function getProducts(): Product[] {
      const products = c.getConfig('costInsights.products');
      return products.keys().map(key => ({
        kind: key,
        name: products.getString(`${key}.name`),
        aggregation: [0, 0],
      }));
    }

    function getMetrics(): Metric[] {
      const metrics = c.getOptionalConfig('costInsights.metrics');
      if (metrics) {
        return metrics.keys().map(key => ({
          kind: key === NULL_METRIC ? null : key,
          name: metrics.getString(`${key}.name`),
        }));
      }

      return [];
    }

    async function getIcons(): Promise<Icon[]> {
      const products = c.getConfig('costInsights.products');
      const keys = products.keys();
      const icons: Icon[] = [];

      for (const key of keys) {
        const name = products.getString(`${key}.icon`);
        const icon = name.replace(/Icon$/, '');

        try {
          const component = await import(`@material-ui/icons/${icon}`);

          if (!component.default) {
            throw Error(`Could not find @material-ui/icons/${icon}`);
          }

          icons.push({
            kind: key,
            component: React.createElement(component.default),
          });
        } catch (e) {
          setError(e);
        }
      }

      return icons;
    }

    function getEngineerCost(): number {
      return c.getNumber('costInsights.engineerCost');
    }

    async function getConfig() {
      const products = getProducts();
      const metrics = getMetrics();
      const engineerCost = getEngineerCost();
      const icons = await getIcons();

      if (metrics.find((m: Metric) => m.kind === null)) {
        setConfig(prevState => ({
          ...prevState,
          metrics,
          products,
          engineerCost,
          icons,
        }));
      } else {
        setConfig(prevState => ({
          ...prevState,
          metrics: [...prevState.metrics, ...metrics],
          products,
          engineerCost,
          icons,
        }));
      }
      setLoading(false);
    }

    getConfig();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return <Alert severity="error">{error.message}</Alert>;
  }

  if (loading) {
    return null;
  }

  return (
    <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
  );
};

export function useConfig(): ConfigContextProps {
  const config = useContext(ConfigContext);

  if (!config) {
    assertNever();
  }

  return config;
}

function assertNever(): never {
  throw new Error('Cannot use useConfig outside of ConfigProvider');
}
