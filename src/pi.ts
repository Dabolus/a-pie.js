import fetch from 'node-fetch';

export interface PiConfig {
  apiUrl?: string;
}

export class Pi {
  public apiUrl: string;

  constructor({ apiUrl = 'https://api.pi.delivery/v1/pi' }: PiConfig = {}) {
    this.apiUrl = apiUrl;
  }

  public async get(start: number = 0, numberOfDigits: number = 100): Promise<string> {
    const response = await fetch(`${this.apiUrl}?start=${start}&numberOfDigits=${numberOfDigits}`);
    const { content } = await response.json();
    return content;
  }
}
