import { DomainEvent } from '@domain/events/DomainEvent';

export interface IDomainEventObserver<TEvent extends DomainEvent = DomainEvent> {
  handle(event: TEvent): Promise<void>;
}
