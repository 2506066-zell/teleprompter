# Tracking Systems

## Voice Tracking
Voice is the primary adaptive signal.

Pipeline:
Microphone → VAD → Speech Recognition → Transcript → Fuzzy Match → Progress.

### Rules
- Explicit permission
- Detect browser support
- Silence means HOLD
- Repeated words should not cause random progress jumps
- Low confidence should keep current position
- Advanced speech APIs are optional enhancements, not a hard dependency

## Face Tracking
Face is secondary context.

Possible states:
- ACTIVE: face present + voice active
- THINKING: face present + voice inactive
- AWAY: face absent beyond grace period

### Rules
- Smooth signals over time
- Grace period for missing face
- Never pause from a single frame loss
- Lazy-load CV dependencies only after user enables camera tracking
- No raw video persistence

## Provider abstraction
Tracking implementation should be provider-agnostic enough to integrate MediaPipe or another browser-compatible solution later without rewriting the teleprompter core.
