import { useEffect, useState } from 'react';
import { eventBus, type MfeEventPayload } from '@/events/EventBus';

export function useEventBus() {
  const [event, setEvent] = useState<MfeEventPayload | null>(null);

  useEffect(() => {
    const subscription = eventBus.observe$().subscribe((evt) => {
      setEvent(evt);
    });

    return () => subscription.unsubscribe();
  }, []);

  const publish = (payload: MfeEventPayload) => {
    eventBus.publish(payload);
  };

  return { event, publish };
}
