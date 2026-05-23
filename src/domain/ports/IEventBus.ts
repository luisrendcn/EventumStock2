import { DomainEvent } from '@domain/events/DomainEvent';
import { IDomainEventObserver } from '@domain/ports/IDomainEventObserver';

export interface IEventBus {
  subscribe<TEvent extends DomainEvent>(
    eventName: string,
    observer: IDomainEventObserver<TEvent>,
  ): void;

  publish<TEvent extends DomainEvent>(event: TEvent): Promise<void>;
}
