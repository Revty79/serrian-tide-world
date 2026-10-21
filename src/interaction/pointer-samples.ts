/** Existing planar input policy, reusable by physical view adapters. Include the
 * dispatched event too: duplicate coordinates carry zero distance in the provider. */
export function pointerSamples(event:PointerEvent):readonly PointerEvent[]{return[...(event.getCoalescedEvents?.()??[]),event];}
