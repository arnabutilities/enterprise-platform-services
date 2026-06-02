export interface MfeEventPayload {
  type: string;
  payload: Record<string, any>;
  timestamp: number;
  source: string;
}

type EventHandler = (event: MfeEventPayload) => void;

export class EventBus {
  private listeners = new Set<EventHandler>();

  public observe$() {
    return {
      subscribe: (handler: EventHandler) => {
        this.listeners.add(handler);

        return {
          unsubscribe: () => {
            this.listeners.delete(handler);
          },
        };
      },
    };
  }

  public publish(event: MfeEventPayload): void {
    this.listeners.forEach((handler) => handler(event));
  }

  public publishTyped<T extends MfeEventPayload>(event: T): void {
    this.publish(event);
  }
}

export const eventBus = new EventBus();
