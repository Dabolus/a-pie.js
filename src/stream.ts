import { Pi } from './pi.js';

export interface PiStreamConfig {
  pi?: Pi;
  streamEventName?: string;
  streamBufferSize?: number;
  streamChunkSize?: number;
  delay?: number;
  start?: number;
}

export class PiStream {
  private static readonly DEFAULT_PI_STREAM_EVENT_NAME = 'pi.digit';
  private static readonly DEFAULT_STREAM_BUFFER_SIZE = 2;
  private static readonly DEFAULT_STREAM_CHUNK_SIZE = 314;
  private static readonly DEFAULT_DELAY = 1000;
  private static readonly DEFAULT_START = 0;

  private readonly _pi: Pi;
  private readonly _streamEventName: string;
  private readonly _streamBufferSize: number;
  private readonly _streamChunkSize: number;
  private readonly _streamBuffer: any[];
  private readonly _bufferWait: number;
  private _position: number;
  private _delay: number;
  private _start: number;
  private _streaming: boolean = false;
  private _bufferTimeout: any;
  private _sendTimeout: any;

  constructor({
    pi = new Pi(),
    streamEventName = `${PiStream.DEFAULT_PI_STREAM_EVENT_NAME}-${Math.floor((Math.random() * 100000) + 1)}`,
    streamBufferSize = PiStream.DEFAULT_STREAM_BUFFER_SIZE,
    streamChunkSize = PiStream.DEFAULT_STREAM_CHUNK_SIZE,
    delay = PiStream.DEFAULT_DELAY,
    start = PiStream.DEFAULT_START,
  }: PiStreamConfig = {}) {
    this._pi = pi;
    this._streamEventName = streamEventName;
    this._streamBufferSize = streamBufferSize;
    this._streamChunkSize = streamChunkSize;
    this._delay = delay;
    this._start = start;
    this._position = this._start;
    this._streamBuffer = new Array(this._streamBufferSize);
    this._streaming = false;
    this._position = 0;
    this._bufferWait = this._delay;
  }

  public stop() {
    this._streaming = false;
    clearTimeout(this._sendTimeout);
    clearTimeout(this._bufferTimeout);
  }

  public async start() {
    if (this._streaming) {
      return;
    }
    this._streaming = true;
    let collected = 0;
    await Promise.all(Array(this._streamBufferSize).fill(0).map(async (_, i) => {
      await this._fetch(i, this._start + this._streamChunkSize * i, this._streamChunkSize);
      collected++;
      if (collected === this._streamBufferSize) {
        this._sendBuffer(0, this._start);
      }
    }));
  }

  public async seek(n: number) {
    this.stop();
    this._start = n;
  }

  public listen(listener: any) {}

  public delay(delay: number) {
    this._delay = delay;
  }

  private async _sendBuffer(bufferPosition: number, start: number) {
    const buffer = this._streamBuffer[bufferPosition];
    if (buffer.start !== start) {
      this._bufferTimeout = setTimeout(
        () => this._sendBuffer(bufferPosition, start),
        this._bufferWait,
      );
      return;
    }
    await this._send(buffer.start, buffer.digits);
    const oldBufferPos = bufferPosition;
    await this._fetch(
      oldBufferPos,
      buffer.start + this._streamChunkSize * this._streamBufferSize,
      this._streamChunkSize,
    );
    const newBufferPos = (bufferPosition + 1) % this._streamBufferSize;
    this._sendBuffer(newBufferPos, buffer.start + this._streamChunkSize);
  }

  private _send(start: number, digits: number[]) {
    return new Promise((resolve) => {
      let i = 0;
      const send = () => {
        if (i > digits.length) {
          resolve();
          return;
        }
        if (isNaN(digits[i])) {
          i++;
          send();
          return;
        }
        this._fire(start + i, digits[i]);
        i++;
        this._sendTimeout = setTimeout(i < digits.length ? send : resolve, this._delay);
      };
      send();
    });
  }

  private _fire(position: number, digit: number) {
    this._position = position;
    const e = new CustomEvent(this._streamEventName, { detail: { position, digit }});
    window.dispatchEvent(e);
  }

  private async _fetch(i: number, start: number, chunkSize: number) {
    if (this._streamBuffer[i] && this._streamBuffer[i].start === start) {
      return i;
    }
    const digits = await this._pi.get(start, chunkSize);
    this._streamBuffer[i] = { start, digits };
    return i;
  }
}
