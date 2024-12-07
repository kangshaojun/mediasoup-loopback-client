import {
  DtlsParameters,
  IceCandidate,
  IceParameters
} from 'mediasoup-client/lib/types';

export interface ClientStatus {
  connection: string;
  publication: string;
  subscription: string;
}

export interface TransportResponse {
  error?: any;
  id: string;
  iceParameters: IceParameters;
  iceCandidates: IceCandidate[];
  dtlsParameters: DtlsParameters;
}

export interface ProduceResponse {
  error?: any;
  id: string;
}

export interface ConsumeResponse {
  error?: any;
  producerId: string;
  id: string;
  kind: 'audio' | 'video';
  rtpParameters: any;
  type: string;
  producerPaused: boolean;
}
