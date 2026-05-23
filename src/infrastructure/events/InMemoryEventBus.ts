import { DomainEvent } from '@domain/events/DomainEvent';
import { IDomainEventObserver } from '@domain/ports/IDomainEventObserver';
import { IEventBus } from '@domain/ports/IEventBus';

export class InMemoryEventBus implements IEventBus {
  private readonly observers = new Map<string, IDomainEventObserver[]>();

  subscribe<TEvent extends DomainEvent>(
    eventName: string,
    observer: IDomainEventObserver<TEvent>,
  ): void {
    const currentObservers = this.observers.get(eventName) ?? [];
    currentObservers.push(observer as IDomainEventObserver);
    this.observers.set(eventName, currentObservers);
  }

  async publish<TEvent extends DomainEvent>(event: TEvent): Promise<void> {
    const observers = this.observers.get(event.eventName) ?? [];

    for (const observer of observers) {
      await observer.handle(event);
    }
  }
}
