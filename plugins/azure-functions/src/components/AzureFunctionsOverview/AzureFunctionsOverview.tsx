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

import React from 'react';
import {
  Box,
  Card,
  Link,
  LinearProgress
} from '@material-ui/core';
import { Entity } from '@backstage/catalog-model';
import { useFunctions } from '../../hooks/useFunctions';
import { FunctionsData } from '../../api/types';
import {
  AZURE_FUNCTIONS_ANNOTATION,
  useServiceEntityAnnotations,
} from '../../hooks/useServiceEntityAnnotations';
import { MissingAnnotationEmptyState, Table, TableColumn } from '@backstage/core-components';
import FlashOnIcon from '@material-ui/icons/FlashOn'
import ErrorBoundary from '../ErrorBoundary';
import { useEntity } from '@backstage/plugin-catalog-react';

type States = 'Waiting' | 'Running' | 'Paused' | 'Failed';

const State = ({ value }: { value: States }) => {
  const colorMap = {
    Waiting: '#dcbc21',
    Running: 'green',
    Paused: 'black',
    Failed: 'red',
  };
  return (
    <Box display="flex" alignItems="center">
      <span
        style={{
          display: 'block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: colorMap[value],
          marginRight: '5px',
        }}
      />
      {value}
    </Box>
  );
};



type FunctionTableProps = {
  data: FunctionsData[];
  loading: boolean;
};

const DEFAULT_COLUMNS: TableColumn<FunctionsData>[] = [
  {
    title: 'name',
    highlight: true,
    render: (func: FunctionsData) => {
      return (<Link href={func.href} target="_blank">{func.functionName}</Link>)
    },
  },
  {
    title: 'location',
    render: (func: FunctionsData) => func.location ?? 'unknown',
  },
  {
    title: 'status',
    render: (func: FunctionsData) => <State value={func.state as States} />,
  },
  {
    title: 'last modified',
    render: (func: FunctionsData) => new Date(func.lastModifiedDate).toUTCString(),
  },
  {
    title: 'logs',
    align: 'right',
    render: (func: FunctionsData) => {
      return (<Link href={func.logstreamHref} target="_blank">View Logs</Link>)
    },
  },
];

const OverviewComponent = ({ data, loading }: FunctionTableProps) => {
  const columns: TableColumn<FunctionsData>[] = [...DEFAULT_COLUMNS];
  const tableStyle = {
    minWidth: '0',
    width: '100%',
  };

  return (
    <Card style={tableStyle}>
      <Table
        title={
          <Box display="flex" alignItems="center">
            <FlashOnIcon style={{ fontSize: 30 }} />
            <Box mr={1} />
            Azure Functions
          </Box>
        }
        options={{ paging: true, search: false, pageSize: 10 }}
        data={data}
        emptyContent={
          <LinearProgress />
        }
        isLoading={loading}
        columns={columns}
      />
    </Card>
  );
};

export const isAzureFunctionsAvailable = (entity: Entity) =>
  entity?.metadata.annotations?.[AZURE_FUNCTIONS_ANNOTATION];

const AzureFunctionsOverview = ({ entity }: { entity: Entity }) => {
  const { functionsName } = useServiceEntityAnnotations(entity);

  const [functionsData] = useFunctions({
    functionsName
  });

  return (
    <><OverviewComponent data={functionsData.data ?? []} loading={functionsData.loading} /></>
  );
};

export const AzureFunctionsOverviewWidget = () => {
  const { entity } = useEntity();

  if (!isAzureFunctionsAvailable(entity)) {
    return (<MissingAnnotationEmptyState annotation={AZURE_FUNCTIONS_ANNOTATION} />);
  }

  return (
    <ErrorBoundary>
      <AzureFunctionsOverview entity={entity} />
    </ErrorBoundary>
  )
};
