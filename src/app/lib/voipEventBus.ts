// Global event bus for VoIP call events
type VoipEventType = 'outgoing_call_initiated' | 'outgoing_call_updated' | 'outgoing_call_ended' | 'incoming_call_received' | 'incoming_call_cleared';

interface OutgoingCallEvent {
    callId: string;
    to: string;
    status: 'Initiating' | 'Ringing' | 'Connected' | 'Ended';
    startTime: string;
}

class VoipEventBus {
    private listeners: Map<VoipEventType, Set<(data: any) => void>> = new Map();

    on(event: VoipEventType, callback: (data: any) => void) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    off(event: VoipEventType, callback: (data: any) => void) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.delete(callback);
        }
    }

    emit(event: VoipEventType, data: any) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback(data));
        }
    }
}

export const voipEventBus = new VoipEventBus();
export type { OutgoingCallEvent, VoipEventType };
