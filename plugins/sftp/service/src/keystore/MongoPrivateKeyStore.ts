import { PrivateKeyStore } from './PrivateKeyStore';
import { SFTPPluginConfig } from '../configuration/SFTPPluginConfig';
import { PluginStateRepository } from '@ngageoint/mage.service/lib/plugins.api';

export class MongoPrivateKeyStore implements PrivateKeyStore {

    constructor(private stateRepository: PluginStateRepository<SFTPPluginConfig>){
    }

    async hasPrivateKey(): Promise<boolean> {
        const config = await this.stateRepository.get()
        return !!config?.privateKey
    }

    async getPrivateKey(): Promise<string | undefined> {
        const config = await this.stateRepository.get()
        return config?.privateKey
    }

    async savePrivateKey(key: string): Promise<void> {
        await this.stateRepository.patch({ privateKey: key })
    }

    async removePrivateKey(): Promise<void> {
        await this.stateRepository.patch({ privateKey: undefined })
    }

}