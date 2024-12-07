"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { Device } from 'mediasoup-client';
import { Producer } from 'mediasoup-client/lib/Producer';
import socketClient from 'socket.io-client';
import { ClientStatus, TransportResponse, ProduceResponse, ConsumeResponse } from '../types/mediasoup';

export const useMediasoup = () => {
  const deviceRef = useRef<Device | null>(null);
  const producerRef = useRef<Producer | null>(null);
  const [status, setStatus] = useState<ClientStatus>({
    connection: '',
    publication: '',
    subscription: ''
  });
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    // 监听连接状态变化
    switch (status.connection) {
      case 'Disconnected':
        // 可以在这里处理自动重连逻辑
        console.log("Disconnected");
        break;
      case 'Connected':
        // 可以在这里初始化一些设备
        console.log("Connected");
        break;
      // ...
    }
  }, [status.connection]);

  const connect = useCallback(async () => {
    setStatus(prev => ({ ...prev, connection: 'Connecting...' }));

    const socket = socketClient(`http://localhost:8000`, {
      transports: ['websocket'],
    });

    socket.on('connect', async () => {
      setStatus(prev => ({ ...prev, connection: 'Connected' }));
      const data = await new Promise((resolve, reject) => {
        socket.emit('getRouterRtpCapabilities', {}, (err: any, response: any) => {
          if (!err) {
            resolve(response);
          } else {
            reject(err);
          }
        });
      });
      await loadDevice(data, socket);
    });

    socket.on('disconnect', () => {
      setStatus(prev => ({ ...prev, connection: 'Disconnected' }));
    });

    socket.on('connect_error', (error) => {
      console.error('could not connect to (%s)', error.message);
      setStatus(prev => ({ ...prev, connection: 'Connection failed' }));
    });

    socketRef.current = socket;
  }, []);

  const sendRequest = useCallback((type: string, data: any = {}) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) {
        reject(new Error('Socket not connected'));
        return;
      }
      socketRef.current.emit(type, data, (err: any, response: any) => {
        if (!err) {
          resolve(response);
        } else {
          reject(err);
        }
      });
    });
  }, []);

  const loadDevice = async (routerRtpCapabilities: any, socket: any) => {
    try {
      const device = new Device();
      await device.load({ routerRtpCapabilities });
      deviceRef.current = device;
    } catch (error: any) {
      if (error.name === 'UnsupportedError') {
        console.error('browser not supported');
      }
    }
  };

  const publish = useCallback(async () => {
    const device = deviceRef.current;
    if (!device) return;

    try {
      const data: TransportResponse = await sendRequest('createProducerTransport', {
        forceTcp: false,
        rtpCapabilities: device.rtpCapabilities,
      }) as TransportResponse;

      if (data.error) {
        console.error(data.error);
        return;
      }

      const transport = device.createSendTransport(data);

      transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        sendRequest('connectProducerTransport', { dtlsParameters })
          .then(callback)
          .catch(errback);
      });

      transport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
        try {
          const { id } = await sendRequest('produce', {
            transportId: transport.id,
            kind,
            rtpParameters,
          }) as ProduceResponse;
          callback({ id });
        } catch (err) {
        }
      });

      const stream = await getUserMedia(device);
      if (!stream) return;

      const track = stream.getVideoTracks()[0];
      const params: any = { track };
      const producer = await transport.produce(params);
      producerRef.current = producer;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setStatus(prev => ({
        ...prev,
        ['publication']: 'published'
      }));

    } catch (err) {
      setStatus(prev => ({
        ...prev,
        ['publication']: 'failed'
      }));
    }
  }, []);

  const subscribe = useCallback(async () => {
    const device = deviceRef.current;
    if (!device) return;

    try {
      const data = await sendRequest('createConsumerTransport', {
        forceTcp: false,
      }) as TransportResponse;

      if (data.error) {
        console.error(data.error);
        return;
      }

      const transport = device.createRecvTransport(data);

      transport.on('connect', ({ dtlsParameters }, callback, errback) => {
        sendRequest('connectConsumerTransport', {
          transportId: transport.id,
          dtlsParameters
        })
          .then(callback)
          .catch(errback);
      });

      const { rtpCapabilities } = device;
      const consumeData = await sendRequest('consume', { rtpCapabilities }) as ConsumeResponse;
      const {
        producerId,
        id,
        kind,
        rtpParameters,
      } = consumeData;

      const consumer = await transport.consume({
        id,
        producerId,
        kind,
        rtpParameters,
      });

      const stream = new MediaStream();
      stream.addTrack(consumer.track);

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }

      await sendRequest('resume');
      setStatus(prev => ({ ...prev, subscription: 'subscribed' }));

    } catch (err) {
      setStatus(prev => ({ ...prev, subscription: 'failed' }));
    }
  }, []);

  return {
    status,
    connect,
    publish,
    subscribe,
    localVideoRef,
    remoteVideoRef
  };
};

async function getUserMedia(device: Device) {
  if (!device.canProduce('video')) {
    console.error('cannot produce video');
    return;
  }

  try {
    return await navigator.mediaDevices.getUserMedia({ video: true });
  } catch (err) {
    console.error('getUserMedia() failed:', err);
    throw err;
  }
}
