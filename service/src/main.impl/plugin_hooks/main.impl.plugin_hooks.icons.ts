import { PluginResourceUrl } from '../../entities/entities.global'
import { StaticIconRepository, StaticIconStub } from '../../entities/icons/entities.icons'
import { IconPluginHooks, PluginStaticIcon } from '../../plugins.api/plugins.api.icons'


export async function loadIconsHooks(moduleName: string, hooks: Partial<IconPluginHooks>, repo: StaticIconRepository): Promise<void> {
  const iconProvider = hooks.icons
  if (!iconProvider) {
    return
  }
  const pluginIcons: PluginStaticIcon[] = await iconProvider.loadPluginStaticIcons()
  await Promise.all(pluginIcons.map(pluginIcon => {
    const sourceUrl = new PluginResourceUrl(moduleName, pluginIcon.pluginRelativePath)
    const iconInfo: StaticIconStub = {
      sourceUrl,
      imageType: pluginIcon.imageType,
      mediaType: pluginIcon.mediaType,
      sizePixels: pluginIcon.sizePixels,
      sizeBytes: pluginIcon.sizeBytes,
      contentHash: pluginIcon.contentHash,
      contentTimestamp: pluginIcon.contentTimestamp,
      tags: pluginIcon.tags,
      fileName: pluginIcon.fileName,
      title: pluginIcon.title,
      summary: pluginIcon.summary,
    }
    return repo.findOrImportBySourceUrl(iconInfo)
  }))
}