import type { GatewayDispatchEvents, GatewayDispatchPayload, GatewayHeartbeat, GatewayIdentify, GatewayIdentifyData, GatewayReceivePayload, GatewaySendPayload } from 'discord-api-types/v10'
import { homepage, version } from '../package.json'

const USER_AGENT = `Discord-Gateway/${version} (+${homepage})`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DispatchListener<T extends `${GatewayDispatchEvents}`> = (event: Extract<GatewayDispatchPayload, { t: T }>) => any

export function createClient(gatewayUrl: string, identity: GatewayIdentifyData): Client {
  return new Client(gatewayUrl, identity)
}

export class Client {
  static create = createClient
  #listeners = new Map<`${GatewayDispatchEvents}` | 'ALL', DispatchListener<`${GatewayDispatchEvents}`>[]>()
  #interval!: number
  #timeout!: number
  socket: WebSocket
  #s: number | null = null
  #zombied = false
  #url: string
  #resume_url!: string
  closed = false
  constructor(gatewayUrl: string, identity: GatewayIdentifyData) {
    this.#url = gatewayUrl
    /** @todo(Chooks22) add different encoding support */
    this.socket = new WebSocket(`${gatewayUrl}?v=10&encoding=json`)

    this.socket.addEventListener('message', (e: MessageEvent<string>) => {
      const data = JSON.parse(e.data) as GatewayReceivePayload

      switch (data.op) {
        // Dispatch
        case 0: {
          this.#s = data.s
          const listeners = this.#listeners.get(data.t)
          const listeners_all = this.#listeners.get('ALL')

          if (listeners !== undefined) {
            listeners.forEach(cb => cb(data))
          }

          if (listeners_all !== undefined) {
            listeners_all.forEach(cb => cb(data))
          }

          if (data.t === 'READY') {
            this.#resume_url = data.d.resume_gateway_url
          }

          break
        }
        // Hello
        case 10: {
          const interval = data.d.heartbeat_interval
          const heartbeat = () => this.#heartbeat()

          this.#timeout = setTimeout(() => {
            heartbeat()
            this.#interval = setInterval(heartbeat, interval)
          }, interval * Math.random())

          this.#send<GatewayIdentify>({
            op: 2,
            d: {
              ...identity,
              properties: {
                os: identity.properties.os,
                browser: `${identity.properties.browser} ${USER_AGENT}`.trim(),
                device: `${identity.properties.device} ${USER_AGENT}`.trim(),
              },
            },
          })

          break
        }
        // Heartbeat Ack
        case 11: {
          this.#zombied = false
          break
        }
        // Heartbeat
        case 1: {
          this.#zombied = false
          this.#heartbeat()
          break
        }
      }
    })
  }
  #send<T extends GatewaySendPayload>(data: T): void {
    const payload = JSON.stringify(data)
    this.socket.send(payload)
  }
  #heartbeat() {
    if (this.#zombied) {
      /** @todo(Chooks22) handle zombied connections */
      this.#resume()
      return
    }

    this.#zombied = true
    this.#send<GatewayHeartbeat>({ op: 1, d: this.#s })
  }
  /**
   * @todo(Chooks22) implement resume
   * @see {@link https://discord.com/developers/docs/topics/gateway#resuming}
   */
  #resume() {
    throw new Error('Resume not implemented.')
  }
  addEventListener<T extends `${GatewayDispatchEvents}`>(event: T | 'ALL', callback: DispatchListener<T>): this {
    const listeners = this.#listeners.get(event)

    if (listeners !== undefined) {
      listeners.push(callback as never)
    } else {
      this.#listeners.set(event, [callback as never])
    }

    return this
  }
  removeEventListener<T extends `${GatewayDispatchEvents}`>(event: T | 'ALL', callback: DispatchListener<T>): this {
    const listeners = this.#listeners.get(event)

    if (listeners !== undefined) {
      if (listeners.length === 1 && listeners[0] === callback as never) {
        this.#listeners.delete(event)
      } else {
        for (let i = listeners.length; i--;) {
          if (listeners[i] === callback as never) {
            listeners.splice(i, 1)
            break
          }
        }
      }
    }

    return this
  }
  close(code = 1000): void {
    this.closed = true
    clearTimeout(this.#timeout)
    clearInterval(this.#interval)
    this.socket.close(code)
  }
}
