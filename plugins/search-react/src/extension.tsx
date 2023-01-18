/*
 * Copyright 2023 The Backstage Authors
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
  createElement,
  isValidElement,
  ReactNode,
  useCallback,
} from 'react';

import {
  getComponentData,
  useElementFilter,
  createReactExtension,
} from '@backstage/core-plugin-api';
import { IndexableDocument, Result } from '@backstage/plugin-search-common';

import { DefaultResultListItem } from './components';

const SEARCH_RESULT_LIST_ITEM_EXTENSION =
  'search.results.list.items.extensions.v1';

/**
 * @public
 * Props for extension options component.
 */
type SearchResultListItemExtensionOptionsComponentProps<
  P extends {} = {},
  D extends IndexableDocument = IndexableDocument,
> = P & {
  rank?: Result<D>['rank'];
  highlight?: Result<D>['highlight'];
  result: Result<D>['document'];
};

/**
 * @public
 * Make default extension options component props optional and add button properties.
 */
export type SearchResultListItemExtensionProps<
  P extends SearchResultListItemExtensionOptionsComponentProps,
> = Omit<P, keyof SearchResultListItemExtensionOptionsComponentProps> &
  Partial<SearchResultListItemExtensionOptionsComponentProps> &
  JSX.IntrinsicElements['div'];

type SearchResultListItemExtensionOptions<
  T extends SearchResultListItemExtensionOptionsComponentProps = SearchResultListItemExtensionOptionsComponentProps,
> = {
  /**
   * The extension name.
   */
  name: string;
  /**
   * The extension component.
   */
  component: (props: T) => JSX.Element | null;
  /**
   * When an extension defines a predicate, it returns true if the result should be rendered by that extension.
   * Defaults to "() => true", which means it renders all sorts of results.
   */
  predicate?: (result: Result<IndexableDocument>) => boolean;
};

/**
 * @public
 * Creates a search result item extension.
 * @param options - The extension options, see {@link SearchResultListItemExtensionOptions} for more details.
 */
export const createSearchResultListItemExtension = <
  P extends SearchResultListItemExtensionOptionsComponentProps,
>(
  options: SearchResultListItemExtensionOptions<P>,
) => {
  const { name, component, predicate = () => true } = options;

  return createReactExtension({
    name,
    component: {
      sync: (_: SearchResultListItemExtensionProps<P>) => null,
    },
    data: {
      [SEARCH_RESULT_LIST_ITEM_EXTENSION]: {
        component,
        predicate,
      },
    },
  });
};

/**
 * @public
 * Returns the first extension element found for a given result, and null otherwise.
 * @param elements - All extension elements.
 * @param result - The search result.
 */
export const findSearchResultListItemExtensionElement = (
  elements: ReactNode[],
  result: Result<IndexableDocument>,
) => {
  for (const element of elements) {
    if (!isValidElement(element)) continue;
    const data = getComponentData<
      Pick<SearchResultListItemExtensionOptions, 'predicate' | 'component'>
    >(element, SEARCH_RESULT_LIST_ITEM_EXTENSION);
    if (!data) continue;
    const { predicate, component } = data;
    if (!predicate?.(result)) continue;
    const { onClick, onKeyDown, ...rest } = element.props;
    return (
      <div role="button" tabIndex={0} onClick={onClick} onKeyDown={onKeyDown}>
        {createElement(component, {
          rank: result.rank,
          highlight: result.highlight,
          result: result.document,
          // Use props over the context in situations where a consumer is manually rendering the extension;
          ...rest,
        })}
      </div>
    );
  }
  return null;
};

/**
 * @public
 * Filters results extensions from children.
 */
export const useSearchResultListItemExtensionElements = (
  children: ReactNode,
) => {
  return useElementFilter(
    children,
    collection => {
      return collection
        .selectByComponentData({
          key: SEARCH_RESULT_LIST_ITEM_EXTENSION,
        })
        .getElements();
    },
    [children],
  );
};

/**
 * @public
 * Returns a function that renders a result using extensions.
 */
export const useSearchResultListItemExtensionRenderer = (
  children: ReactNode,
) => {
  const elements = useSearchResultListItemExtensionElements(children);
  return useCallback(
    (result: Result<IndexableDocument>) => {
      const element = findSearchResultListItemExtensionElement(
        elements,
        result,
      );

      return (
        element ?? (
          <DefaultResultListItem
            rank={result.rank}
            highlight={result.highlight}
            result={result.document}
          />
        )
      );
    },
    [elements],
  );
};
