export type AttachmentHookOutcome = | { outcome: 'pass' } | { outcome: 'reject', reason: string } | { outcome: 'error', error: Error }

// clamav scanning beyond observation attachments
export interface ScannableContent {
  name?: string
}

export type AttachmentHook = (content: ScannableContent, stagedFilePath: string) => Promise<AttachmentHookOutcome>

export type AttachmentPipelineResult = AttachmentHookOutcome & { hookName?: string }

export interface AttachmentProcessingPluginHooks {
    attachmentHooks: AttachmentHook[]
}

let registeredHooks: AttachmentHook[] = []

// Set once at boot, after plugin loading finalizes the real hooks list, so
// callers outside the boot closure (e.g. api/user.js) can run the pipeline
// against whatever hooks are registered, without needing to know about any
// specific plugin like clamav by name. runPipeline() already no-ops to
// 'pass' on an empty array, so callers don't need to branch on this being
// empty - just call it.
export function setAttachmentHooks(hooks: AttachmentHook[]): void {
  registeredHooks = hooks
}

export function getAttachmentHooks(): AttachmentHook[] {
  return registeredHooks
}

export async function runPipeline(hooks: AttachmentHook[], content: ScannableContent, stagedFilePath: string): Promise<AttachmentPipelineResult> {
    for (const hook of hooks) {
        
        try {
            const outcome = await hook(content, stagedFilePath)

            // Check if outcome is problematic
            if (outcome.outcome === 'reject' || outcome.outcome === 'error') {
                
                // Match the spread pattern
                return { ...outcome, hookName: hook.name }
            }
        } catch (err) {
            return {outcome: 'error', error: err instanceof Error ? err : new Error(String(err)), hookName: hook.name}
        }
    }
    return {outcome: 'pass'}
}