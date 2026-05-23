import { DomainEvent } from '@domain/events/DomainEvent';
import { IDomainEventObserver } from '@domain/ports/IDomainEventObserver';
import { InMemoryEventBus } from '@infra/events/InMemoryEventBus';

class TestEvent implements DomainEvent {
  readonly eventName = 'test.event';
  readonly occurredAt = new Date();

  constructor(readonly value: string) {}
}

describe('InMemoryEventBus', () => {
  it('notifies subscribed observers for the published event name', async () => {
    const eventBus = new InMemoryEventBus();
    const observer: jest.Mocked<IDomainEventObserver<TestEvent>> = {
      handle: jest.fn().mockResolvedValue(undefined),
    };
    const ignoredObserver: jest.Mocked<IDomainEventObserver<TestEvent>> = {
      handle: jest.fn().mockResolvedValue(undefined),
    };

    eventBus.subscribe('test.event', observer);
    eventBus.subscribe('other.event', ignoredObserver);

    const event = new TestEvent('hello');
    await eventBus.publish(event);

    expect(observer.handle).toHaveBeenCalledWith(event);
    expect(ignoredObserver.handle).not.toHaveBeenCalled();
  });
});
