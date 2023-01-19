/*
 * Copyright 2022 The Backstage Authors
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

import React, { Fragment } from 'react';
import useAsync, { AsyncState } from 'react-use/lib/useAsync';

import { List, ListProps } from '@material-ui/core';

import {
  EmptyState,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import { AnalyticsContext, useApi } from '@backstage/core-plugin-api';
import { SearchQuery, SearchResultSet } from '@backstage/plugin-search-common';

import { searchApiRef } from '../../api';
import { useSearch } from '../../context';
import { useSearchResultListItemExtensionRenderer } from '../../extension';

/**
 * Props for {@link SearchResultContext}
 * @public
 */
export type SearchResultContextProps = {
  /**
   * A child function that receives an asynchronous result set and returns a react element.
   */
  children: (state: AsyncState<SearchResultSet>) => JSX.Element | null;
};

/**
 * Provides context-based results to a child function.
 * @param props - see {@link SearchResultContextProps}.
 * @example
 * ```
 * <SearchResultContext>
 *   {({ loading, error, value }) => (
 *     <List>
 *       {value?.map(({ document }) => (
 *         <DefaultSearchResultListItem
 *           key={document.location}
 *           result={document}
 *         />
 *       ))}
 *     </List>
 *   )}
 * </SearchResultContext>
 * ```
 * @public
 */
export const SearchResultContext = (props: SearchResultContextProps) => {
  const { children } = props;
  const context = useSearch();
  const state = context.result;
  return children(state);
};

/**
 * Props for {@link SearchResultApi}
 * @public
 */
export type SearchResultApiProps = SearchResultContextProps & {
  query: Partial<SearchQuery>;
};

/**
 * Request results through the search api and provide them to a child function.
 * @param props - see {@link SearchResultApiProps}.
 * @example
 * ```
 * <SearchResultApi>
 *   {({ loading, error, value }) => (
 *     <List>
 *       {value?.map(({ document }) => (
 *         <DefaultSearchResultListItem
 *           key={document.location}
 *           result={document}
 *         />
 *       ))}
 *     </List>
 *   )}
 * </SearchResultApi>
 * ```
 * @public
 */
export const SearchResultApi = (props: SearchResultApiProps) => {
  const { query, children } = props;
  const searchApi = useApi(searchApiRef);

  const state = useAsync(() => {
    const { term = '', types = [], filters = {}, ...rest } = query;
    return searchApi.query({ ...rest, term, types, filters });
  }, [query]);

  return children(state);
};

/**
 * Props for {@link SearchResultState}
 * @public
 */
export type SearchResultStateProps = SearchResultContextProps &
  Partial<SearchResultApiProps>;

/**
 * Call a child render function passing a search state as an argument.
 * @remarks By default, results are taken from context, but when a "query" prop is set, results are requested from the search api.
 * @param props - see {@link SearchResultStateProps}.
 * @example
 * Consuming results from context:
 * ```
 * <SearchResultState>
 *   {({ loading, error, value }) => (
 *     <List>
 *       {value?.map(({ document }) => (
 *         <DefaultSearchResultListItem
 *           key={document.location}
 *           result={document}
 *         />
 *       ))}
 *     </List>
 *   )}
 * </SearchResultState>
 * ```
 * @example
 * Requesting results using the search api:
 * ```
 * <SearchResultState query={{ term: 'documentation' }}>
 *   {({ loading, error, value }) => (
 *     <List>
 *       {value?.map(({ document }) => (
 *         <DefaultSearchResultListItem
 *           key={document.location}
 *           result={document}
 *         />
 *       ))}
 *     </List>
 *   )}
 * </SearchResultState>
 * ```
 * @public
 */
export const SearchResultState = (props: SearchResultStateProps) => {
  const { query, children } = props;

  return query ? (
    <SearchResultApi query={query}>{children}</SearchResultApi>
  ) : (
    <SearchResultContext>{children}</SearchResultContext>
  );
};

/**
 * Props for {@link SearchResult}
 * @public
 */
export type SearchResultProps = ListProps &
  Pick<SearchResultStateProps, 'query'> & {
    noResultsComponent?: JSX.Element;
  } & (
    | { children: (resultSet: SearchResultSet) => JSX.Element }
    | { children?: null | JSX.Element | JSX.Element[] }
  );

/**
 * Renders results from a parent search context or api.
 * @remarks default components for loading, error and empty variants are returned.
 * @param props - see {@link SearchResultProps}.
 * @public
 */
export const SearchResultComponent = (props: SearchResultProps) => {
  const {
    query,
    children,
    noResultsComponent = (
      <EmptyState missing="data" title="Sorry, no results were found" />
    ),
    ...rest
  } = props;

  const renderResultItem = useSearchResultListItemExtensionRenderer(children);

  return (
    <SearchResultState query={query}>
      {({ loading, error, value }) => {
        if (loading) {
          return <Progress />;
        }

        if (error) {
          return (
            <ResponseErrorPanel
              title="Error encountered while fetching search results"
              error={error}
            />
          );
        }

        if (!value?.results.length) {
          return noResultsComponent;
        }

        if (typeof children === 'function') {
          return children(value);
        }

        return (
          <List {...rest}>
            {value.results.map((result, index) => (
              <Fragment key={index}>{renderResultItem(result)}</Fragment>
            ))}
          </List>
        );
      }}
    </SearchResultState>
  );
};

/**
 * A component returning the search result from a parent search context or api.
 * @param props - see {@link SearchResultProps}.
 * @public
 */
export const SearchResult = (props: SearchResultProps) => (
  <AnalyticsContext
    attributes={{
      pluginId: 'search',
      extension: 'SearchResult',
    }}
  >
    <SearchResultComponent {...props} />
  </AnalyticsContext>
);
