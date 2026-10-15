// Imports
import { AttachmentProcessingPluginHooks } from "../../plugins.api/plugins.api.attachments";
import { AddPluginAttachmentHooks } from "../main.impl.plugins";

// Collects a single plugin's contributed attachment-processing hooks (if any) and hands them off to be stored in the shared in-memory hook registry.
export async function loadAttachmentHooks(moduleName: string, hooks: Partial<AttachmentProcessingPluginHooks>, collectHooks: AddPluginAttachmentHooks): Promise<void> {
    // Array of hooks & guard
    const attachmentHooks = hooks.attachmentHooks
    if (!attachmentHooks){
        return
    }

    // Call collect hooks
    collectHooks(moduleName, attachmentHooks)
}
