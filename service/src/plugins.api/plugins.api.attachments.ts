import { Attachment } from '../entities/observations/entities.observations'

// Define the outcomes from the attachment
export type AttachmentHookOutcome = | { outcome: 'pass' } | { outcome: 'reject', reason: string } | { outcome: 'error', error: Error }

// Defining the signature for future hooks
export type AttachmentHook = (attachment: Attachment, stagedFilePath: string) => Promise<AttachmentHookOutcome>
export type AttachmentPipelineResult = AttachmentHookOutcome & { hookName?: string }

// Defining the interface
export interface AttachmentProcessingPluginHooks {
    attachmentHooks: AttachmentHook[]
}
export async function runPipeline(hooks: AttachmentHook[], attachment: Attachment, stagedFilePath: string): Promise<AttachmentPipelineResult> {
    for (const hook of hooks) {
        
        try {
            const outcome = await hook(attachment, stagedFilePath)

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