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