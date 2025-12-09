import { ImmersionShort } from '../entities/immersion-short';

/**
 * Interface for the service that interacts with the external YouTube Data API.
 * This belongs in Domain because it defines *what* we need from the outside world.
 */
export interface VideoHarvestingService {
    /**
     * Searches YouTube for specific categories and maps them to our Entity.
     */
    harvestByCategory(category: string): Promise<ImmersionShort[]>;
}