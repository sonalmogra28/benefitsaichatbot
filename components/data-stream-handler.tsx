'use client';

import { useEffect, useRef } from 'react';
import { artifactDefinitions } from './artifact';
import { initialArtifactData, useArtifact } from '@/hooks/use-artifact';
import { useDataStream } from './data-stream-provider';

export function DataStreamHandler() {
  const { dataStream } = useDataStream();

  const { artifact, setArtifact, setMetadata } = useArtifact();
  const lastProcessedIndex = useRef(-1);

  useEffect(() => {
    if (!dataStream?.length) return;

    const newDeltas = dataStream.slice(lastProcessedIndex.current + 1);
    lastProcessedIndex.current = dataStream.length - 1;

    newDeltas.forEach((delta) => {
      const artifactDefinition = artifactDefinitions.find(
        (artifactDefinition) => artifactDefinition.kind === artifact.kind,
      );

      if (artifactDefinition?.onStreamPart) {
        artifactDefinition.onStreamPart({
          streamPart: delta,
          setArtifact,
          setMetadata,
        });
      }

      setArtifact((draftArtifact) => {
        if (!draftArtifact) {
          return { ...initialArtifactData, status: 'streaming' } as any;
        }

        const deltaType = (delta as any).type;
        switch (deltaType) {
          case 'data-id':
            return {
              ...draftArtifact,
              documentId: (delta as any).data,
              status: 'streaming',
            } as any;

          case 'data-title':
            return {
              ...draftArtifact,
              title: (delta as any).data,
              status: 'streaming',
            } as any;

          case 'data-kind':
            return {
              ...draftArtifact,
              kind: (delta as any).data,
              status: 'streaming',
            } as any;

          case 'data-clear':
            return {
              ...draftArtifact,
              content: '',
              status: 'streaming',
            } as any;

          case 'data-finish':
            return {
              ...draftArtifact,
              status: 'idle',
            } as any;

          default:
            return draftArtifact;
        }
      });
    });
  }, [dataStream, setArtifact, setMetadata, artifact]);

  return null;
}
